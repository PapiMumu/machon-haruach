import React, { useMemo } from "react";
import Constants from "expo-constants";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ChurchInterface, EnvironmentHelper, UserHelper } from "../../src/helpers";
import type { ApiListType } from "../../src/helpers/Interfaces";
import { ErrorHelper } from "../../src/helpers/ErrorHelper";
import { ApiHelper } from "@machonharuach/helpers";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, StatusBar } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { clearAllCachedData } from "../../src/helpers/QueryClient";
import { useUserChurches, useUserStore, useCurrentUserChurch } from "../../src/stores/useUserStore";
import { useChurchStore } from "../../src/stores/useChurchStore";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { SecureStorageHelper } from "../../src/helpers/SecureStorageHelper";
import { useHardwareBackHandler } from "../../src/hooks/useNavigation";
import { useEngagementStore } from "../../src/stores/useEngagementStore";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChurchListItem,
  SearchLoadingIndicator,
  ChurchSelectionOverlay
} from "../../src/components/churchSearch/exports";
import { useTranslation } from "react-i18next";

/** Machon HaRuach: Spirit Embassy is always the default root church for branch/campus selection. */
const DEFAULT_ROOT_CHURCH_NAME = "Spirit Embassy";
/** Membership anonymous search term to resolve Spirit Embassy when DEFAULT_CHURCH_ID is not set in the build. */
const SPIRIT_EMBASSY_MEMBERSHIP_SEARCH = "spirit embassy";

function normalizeCampusList(body: unknown): any[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray((body as { data?: unknown }).data)) {
    return (body as { data: any[] }).data;
  }
  return [];
}

/** Anonymous campus fetch (same order as Select Branch). Used to pick which duplicate-named church has Admin campuses. */
async function fetchPublicCampusesForChurchId(churchId: string): Promise<any[]> {
  const attempts: { api: ApiListType; path: string }[] = [
    { api: "MembershipApi", path: `/churches/public-campuses/${churchId}` },
    { api: "AttendanceApi", path: `/public-campuses/${churchId}` },
    { api: "AttendanceApi", path: `/attendance/public-campuses/${churchId}` }
  ];
  for (const { api, path } of attempts) {
    try {
      const raw = await ApiHelper.getAnonymous(path, api);
      const campuses = normalizeCampusList(raw);
      if (campuses.length > 0) return campuses;
    } catch {
      /* try next */
    }
  }
  return [];
}

type SpiritLookupResult = { list: any[]; resolvedChurchId: string };

const ChurchSearch = () => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const [selectingChurch, setSelectingChurch] = useState(false);
  const userChurches = useUserChurches();
  const currentUserChurch = useCurrentUserChurch();
  const selectChurch = useChurchStore(state => state.selectChurch);
  const addRecentChurch = useEngagementStore(state => state.addRecentChurch);
  const setSelectedAttendanceCampus = useEngagementStore(state => state.setSelectedAttendanceCampus);
  const user = useAuthStore(state => state.user);

  const extra = Constants.expoConfig?.extra ?? {};
  const defaultChurchId = String(extra.DEFAULT_CHURCH_ID || "").trim();
  const branchSearchQuery = encodeURIComponent(SPIRIT_EMBASSY_MEMBERSHIP_SEARCH);

  const normalize = (s: string) => (s || "").toLowerCase().trim();

  type Branch = { id?: string; name: string; address?: string };

  const needSpiritLookup = defaultChurchId === "";

  const {
    data: spiritLookup,
    isLoading: loadingChurch,
    isFetched: spiritLookupFetched
  } = useQuery({
    queryKey: [`/churches/search/?name=${branchSearchQuery}&app=B1`, "MembershipApi", "spiritEmbassyDefaultChurch", "v2"],
    queryFn: async (): Promise<SpiritLookupResult> => {
      const list = await ApiHelper.getAnonymous(`/churches/search/?name=${branchSearchQuery}&app=B1`, "MembershipApi");
      const arr = Array.isArray(list) ? list : [];
      if (arr.length === 0) return { list: arr, resolvedChurchId: "" };
      /**
       * Search often returns several churches with the same display name (different subdomains).
       * Admin Attendance campuses are keyed by one membership `churchId`. Taking only `arr[0]`
       * frequently points at an empty church while another row has all campuses.
       */
      const withIds = arr.map((c: any) => (c?.id ? String(c.id) : "")).filter(Boolean);
      const campusLists = await Promise.all(withIds.map(id => fetchPublicCampusesForChurchId(id)));
      const hitIdx = campusLists.findIndex(rows => rows.length > 0);
      if (hitIdx >= 0) return { list: arr, resolvedChurchId: withIds[hitIdx] };
      return { list: arr, resolvedChurchId: arr[0]?.id ? String(arr[0].id) : "" };
    },
    enabled: needSpiritLookup,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000
  });

  const resolvedChurchId = useMemo(() => {
    if (defaultChurchId) return defaultChurchId;
    return spiritLookup?.resolvedChurchId ?? "";
  }, [defaultChurchId, spiritLookup?.resolvedChurchId]);

  const churchToSelect: ChurchInterface | null = resolvedChurchId
    ? ({ id: resolvedChurchId, name: DEFAULT_ROOT_CHURCH_NAME } as ChurchInterface)
    : null;

  const branchesChurchId = resolvedChurchId;

  const fetchPublicCampuses = fetchPublicCampusesForChurchId;

  const loadBranchesFromMembershipSettings = async (): Promise<Branch[]> => {
    const settings = await ApiHelper.getAnonymous(`/settings/public/${branchesChurchId}`, "MembershipApi");
    const raw = settings?.branches;
    if (!raw) return [] as Branch[];
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!Array.isArray(parsed)) return [] as Branch[];
      return parsed
        .filter((b) => b && typeof b.name === "string")
        .map((b) => {
          const addressParts = [b.address, b.address1, b.address2, b.city, b.country]
            .filter((v) => typeof v === "string" && String(v).trim().length > 0)
            .map((v) => String(v).trim());
          return {
            id: b.id ? String(b.id) : undefined,
            name: String(b.name),
            address: addressParts.length > 0 ? addressParts.join(", ") : undefined
          };
        }) as Branch[];
    } catch {
      return [] as Branch[];
    }
  };

  const branchesQuery = useQuery({
    queryKey: [`/public-campuses/${branchesChurchId}`, "AttendanceApi", "branches", EnvironmentHelper.AttendanceApi],
    queryFn: async () => {
      if (!branchesChurchId) return [] as Branch[];
      try {
        const campuses = await fetchPublicCampuses(branchesChurchId);
        if (campuses.length > 0) {
          return campuses
            .filter((c: any) => c && typeof c.name === "string" && String(c.name).trim().length > 0)
            .map((c: any) => {
              const addressParts = [c.address1, c.address2, c.city, c.country]
                .filter((v: unknown) => typeof v === "string" && String(v).trim().length > 0)
                .map((v: string) => String(v).trim());
              return {
                id: c.id ? String(c.id) : undefined,
                name: String(c.name).trim(),
                address: addressParts.length > 0 ? addressParts.join(", ") : undefined
              };
            }) as Branch[];
        }
      } catch (e) {
        console.warn("[churchSearch] Attendance campuses unavailable, using membership branches setting", e);
      }
      return loadBranchesFromMembershipSettings();
    },
    enabled: branchesChurchId !== "" && (!needSpiritLookup || spiritLookupFetched),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  useEffect(() => {
    UserHelper.addOpenScreenEvent("Church Search Screen");
  }, []);

  /**
   * Drawer’s default child is `(tabs)`; `router.back()` from here often pops to Home without a
   * `currentUserChurch`, which shows empty skeletons. When the user still must pick a branch,
   * leave the flow explicitly instead of relying on stack history.
   */
  const leaveBranchPicker = useCallback(async () => {
    if (!currentUserChurch?.church) {
      await useUserStore.getState().logout();
      router.replace("/welcome");
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(drawer)/(tabs)/dashboard");
    }
  }, [currentUserChurch?.church]);

  useHardwareBackHandler(
    useCallback(() => {
      void leaveBranchPicker();
      return true;
    }, [leaveBranchPicker])
  );

  const branchSelection = async (branch: Branch) => {
    try {
      setSelectingChurch(true);
      if (churchToSelect) {
        setSelectedAttendanceCampus(branch.id || "", branch.name);

        // Check if user is already a member of this church
        const existing = userChurches.find(uc => uc.church.id === churchToSelect.id);

        // New-account bootstrap: create/link person+userChurch for selected church so member APIs work.
        if (!existing && user?.jwt && user?.id && churchToSelect.id) {
          try {
            await ApiHelper.post(
              "/users/loadOrCreate",
              {
                userId: user.id,
                userEmail: user.email,
                firstName: user.firstName,
                lastName: user.lastName
              },
              "MembershipApi"
            );

            const linkedPerson = await ApiHelper.post(
              "/people/loadOrCreate",
              {
                churchId: churchToSelect.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                userId: user.id
              },
              "MembershipApi"
            );

            if (linkedPerson?.id) {
              await ApiHelper.post(`/userchurch?userId=${user.id}`, { personId: linkedPerson.id }, "MembershipApi");
            }

            const jwt = (await SecureStorageHelper.getSecureItem("default_jwt")) || user.jwt;
            if (jwt) {
              const refreshedLogin = await ApiHelper.postAnonymous("/users/login", { jwt }, "MembershipApi");
              await useAuthStore.getState().handleLogin(refreshedLogin);
            }
          } catch (bootstrapError) {
            console.warn("[churchSearch] Failed to bootstrap selected church membership context", bootstrapError);
          }
        }

        const authState = useAuthStore.getState();
        const hydratedChurch = authState.userChurches.find(uc => uc.church.id === churchToSelect.id)?.church;
        const churchData = hydratedChurch || existing?.church || churchToSelect;

        // Add to recent churches (keeps existing behavior)
        addRecentChurch(churchData);

        // Check if we're switching to a different church
        const currentChurch = useChurchStore.getState().currentUserChurch?.church;
        const isSwitchingChurch = currentChurch?.id !== churchData.id;

        // Only clear cached data if switching to a different church
        if (isSwitchingChurch) {
          await clearAllCachedData();
        }

        // Use the store to select the church
        await selectChurch(churchData);

        UserHelper.addAnalyticsEvent("branch_selected", {
          id: Date.now(),
          branch: branch.name,
          campusId: branch.id || "",
          church: churchData.name
        });

        // Navigate to dashboard immediately for better UX
        router.replace("/(drawer)/(tabs)/dashboard");
      }

      setSelectingChurch(false);
    } catch (err: any) {
      console.error("❌ Church selection error:", err);
      ErrorHelper.logError("church-search", err);
      setSelectingChurch(false);
    }
  };

  const branches = branchesQuery.data || [];
  const displayedBranches =
    normalize(searchText).length < 1
      ? branches
      : branches.filter(
        (b) =>
          normalize(b.name).includes(normalize(searchText)) ||
            (b.address && normalize(b.address).includes(normalize(searchText)))
      );

  const showSearchNoMatch =
    branches.length > 0 && displayedBranches.length === 0 && normalize(searchText).length >= 1;

  return (
    <>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <ChurchSelectionOverlay visible={selectingChurch} />
        <View style={styles.content}>
          <Pressable onPress={() => void leaveBranchPicker()} style={styles.backRow} accessibilityRole="button" accessibilityLabel={t("common.back")}>
            <MaterialIcons name="chevron-left" size={32} color="#FFFFFF" />
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>{t("churchSearch.selectBranchTitle")}</Text>
            <Text style={styles.subtitle}>{t("churchSearch.selectBranchSubtitle")}</Text>
          </View>

          <TextInput
            mode="outlined"
            label={t("churchSearch.searchBranchLabel")}
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
            outlineStyle={styles.searchOutline}
            theme={{ colors: { primary: "#FFFFFF", onSurfaceVariant: "rgba(255,255,255,0.72)" } }}
            textColor="#FFFFFF"
          />

          {(branchesQuery.isLoading || (needSpiritLookup && loadingChurch)) && <SearchLoadingIndicator />}

          {/* Results Section */}
          <View style={styles.resultsSection}>
            {!branchesQuery.isLoading && !(needSpiritLookup && loadingChurch) && (
              <>
                <View style={styles.sectionHeader}>
                  {displayedBranches.length === 0 && (
                    <View style={styles.emptyBlock}>
                      <Text variant="bodyMedium" style={styles.emptyText}>
                        {showSearchNoMatch
                          ? t("churchSearch.branchSearchNoMatch")
                          : branchesChurchId === "" && needSpiritLookup && spiritLookupFetched
                            ? t("churchSearch.branchListNoChurchId")
                            : t("churchSearch.noBranchesInList")}
                      </Text>
                      {branchesChurchId === "" && needSpiritLookup && spiritLookupFetched ? (
                        <Text variant="bodySmall" style={styles.hintText}>
                          {t("churchSearch.branchListConfigHint")}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>

                {displayedBranches.length > 0 && (
                  <FlatList
                    data={displayedBranches}
                    renderItem={({ item }) => (
                      <ChurchListItem
                        church={{ id: item.id || item.name, name: item.name } as any}
                        onPress={() => branchSelection(item)}
                        isSelecting={selectingChurch}
                        hideLogo={true}
                        subtitle={item.address || ""}
                        minHeight={88}
                        appearance="modern"
                      />
                    )}
                    keyExtractor={(item) => item.id || item.name}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06080E"
  },
  content: { flex: 1 },
  backRow: {
    alignSelf: "flex-start",
    paddingLeft: 8,
    paddingRight: 16,
    paddingBottom: 8
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16
  },
  title: {
    color: "#FFFFFF",
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 32,
    letterSpacing: -0.6,
    lineHeight: 38,
    textAlign: "left"
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10
  },
  searchInput: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  searchOutline: {
    borderRadius: 14,
    borderColor: "rgba(255,255,255,0.24)"
  },
  resultsSection: {
    flex: 1,
    paddingHorizontal: 16
  },
  sectionHeader: { marginBottom: 16 },
  emptyBlock: {
    paddingHorizontal: 8,
    marginTop: 8
  },
  emptyText: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 8
  },
  hintText: {
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginTop: 14,
    lineHeight: 20
  },
  listContent: { paddingBottom: 32 },
  separator: { height: 12 }
});

export default ChurchSearch;
