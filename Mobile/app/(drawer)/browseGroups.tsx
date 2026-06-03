import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, TextInput, TouchableOpacity, View, type TextStyle, type ViewStyle } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Text } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { givingBody, givingCaption, givingSectionHeading } from "../../src/components/donations/givingTypography";
import { ApiHelper, membershipPersonSavePayload, postMembershipJson } from "../../src/helpers";
import { loadLinkedPerson } from "../../src/helpers/loadLinkedPerson";
import { useChurchStore } from "../../src/stores/useChurchStore";
import { queryClient } from "../../src/helpers/QueryClient";
import type { PersonInterface } from "../../src/helpers/Interfaces";
import { useCurrentUserChurch, useUser } from "../../src/stores/useUserStore";
import { useThemeColors } from "@/theme";
import { useScreenHeader } from "@/hooks/useNavigationHeader";

/** Match `groupJoin` country sheet / list row typography. */
const joinBody: TextStyle = { ...givingBody, fontSize: 16, lineHeight: 22, color: "#FFFFFF" };
const joinCaption: TextStyle = { ...givingCaption, fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.72)" };
const joinSectionHeading: TextStyle = { ...givingSectionHeading, fontSize: 18, lineHeight: 26, color: "#FFFFFF" };

/** `connectTop`: row sits under the cell search field — no top rounding (search row has top radius). */
function groupRowShellStyle(index: number, total: number, connectTop?: boolean): ViewStyle {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const topRounded = isFirst && !connectTop;
  return {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#1A1A1A",
    borderColor: "rgba(255,255,255,0.08)",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: topRounded ? 1 : 0,
    borderBottomWidth: isLast ? 1 : StyleSheet.hairlineWidth,
    borderTopLeftRadius: topRounded ? 16 : 0,
    borderTopRightRadius: topRounded ? 16 : 0,
    borderBottomLeftRadius: isLast ? 16 : 0,
    borderBottomRightRadius: isLast ? 16 : 0
  };
}

/** Groups from Admin — this screen lists cell groups, with a safe fallback for standard-tag churches. */
interface Group {
  id: string;
  name: string;
  city?: string;
  categoryName?: string;
  labelArray?: string[];
  tags?: string;
  cellAddress?: string;
  leaderPhone?: string;
}

/** Strict cell-group marker detection from existing metadata. */
const isExplicitCellGroup = (group: Group) => {
  const category = (group.categoryName || "").toLowerCase();
  const tags = (group.tags || "").toLowerCase();
  const labels = (group.labelArray || []).map(label => label.toLowerCase());
  return (
    category.includes("cell") ||
    tags.includes("cell") ||
    labels.some(label => label.includes("cell")) ||
    !!group.cellAddress
  );
};

/** Fallback tag used by Admin for default groups. */
const isStandardTaggedGroup = (group: Group) => {
  const tags = (group.tags || "").toLowerCase();
  return tags.includes("standard");
};

const norm = (s?: string) => (s || "").trim().toLowerCase();

/** Prefer the row with city filled in when merging likely duplicate Admin rows. */
const pickRicherGroup = (a: Group, b: Group): Group => {
  const aCity = !!(a.city && a.city.trim());
  const bCity = !!(b.city && b.city.trim());
  if (aCity && !bCity) return a;
  if (bCity && !aCity) return b;
  return (a.id || "").localeCompare(b.id || "", undefined, { sensitivity: "base" }) <= 0 ? a : b;
};

/** Same name/category but both cities set and differ → treat as separate groups (e.g. two cells in different cities). */
const citiesCompatible = (a: Group, b: Group): boolean => {
  const ac = norm(a.city);
  const bc = norm(b.city);
  if (!ac || !bc) return true;
  return ac === bc;
};

/** Merge rows that share name+category when one is missing city or cities match (duplicate/partial Admin data). */
function mergeCluster(cluster: Group[]): Group[] {
  if (cluster.length <= 1) return cluster;
  const remaining = [...cluster];
  const result: Group[] = [];
  while (remaining.length) {
    let base = remaining.shift()!;
    let mergedMore = true;
    while (mergedMore) {
      mergedMore = false;
      for (let i = 0; i < remaining.length; ) {
        if (citiesCompatible(base, remaining[i])) {
          base = pickRicherGroup(base, remaining[i]!);
          remaining.splice(i, 1);
          mergedMore = true;
        } else {
          i++;
        }
      }
    }
    result.push(base);
  }
  return result;
}

function dedupeGroups(groups: Group[]): Group[] {
  const byId = new Map<string, Group>();
  for (const g of groups) {
    const id = String(g.id ?? "").trim();
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, g);
  }
  const clusters = new Map<string, Group[]>();
  for (const g of byId.values()) {
    const key = `${norm(g.name)}||${norm(g.categoryName)}`;
    const list = clusters.get(key) || [];
    list.push(g);
    clusters.set(key, list);
  }
  const out: Group[] = [];
  for (const cluster of clusters.values()) {
    out.push(...mergeCluster(cluster));
  }
  return out;
}

function interestBlob(group: Group): string {
  return [group.categoryName, group.tags, ...(group.labelArray || []), group.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Map Join Group “Who?” chip to a non-cell row from the same `/groups` list (Admin). */
function groupMatchesInterestChip(group: Group, chip: string): boolean {
  if (isExplicitCellGroup(group)) return false;
  const t = chip.trim().toLowerCase();
  if (!t || t === "cell groups") return false;
  const blob = interestBlob(group);
  if (t === "young adults") {
    return (
      blob.includes("young adult") ||
      /\byoung\s+adults?\b/.test(blob) ||
      (blob.includes("young") && blob.includes("adult"))
    );
  }
  if (t === "women") return /\bwomen\b|\bwomen's\b|\bwomens\b/.test(blob);
  if (t === "men") return /\bmen\b|\bmen's\b|\bmens\b/.test(blob);
  if (t === "youth") return /\byouth\b/.test(blob);
  if (t === "family") return /\bfamily\b/.test(blob);
  if (t === "prayer") return /\bprayer\b/.test(blob);
  return false;
}

function resolveInterestGroupId(groups: Group[], interestChip: string | undefined, cellGroupId: string): string | null {
  const chip = (interestChip || "").trim();
  if (!chip || chip.toLowerCase() === "cell groups") return null;
  const list = dedupeGroups(Array.isArray(groups) ? groups : []).filter(
    g => g.id !== cellGroupId && groupMatchesInterestChip(g, chip)
  );
  if (list.length === 0) return null;
  list.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
  return list[0]!.id;
}

type ListEntry =
  | { type: "cellSearch"; key: string; hasEmptyBelow: boolean }
  | { type: "cellEmpty"; key: string }
  | {
      type: "groupRow";
      key: string;
      group: Group;
      indexInSection: number;
      sectionLength: number;
      connectTop: boolean;
    };

function matchesCellSearch(group: Group, queryLower: string): boolean {
  if (!queryLower) return true;
  const blob = [group.name, group.city, group.categoryName, group.tags, ...(group.labelArray || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return blob.includes(queryLower);
}

function buildListEntries(allCells: Group[], filteredCells: Group[], searchQueryTrimmed: string): ListEntry[] {
  const entries: ListEntry[] = [];
  if (allCells.length > 0) {
    const hasEmptyBelow = filteredCells.length === 0 && searchQueryTrimmed.length > 0;
    entries.push({ type: "cellSearch", key: "cell-search", hasEmptyBelow });
    if (hasEmptyBelow) {
      entries.push({ type: "cellEmpty", key: "cell-empty" });
    } else {
      filteredCells.forEach((g, i) =>
        entries.push({
          type: "groupRow",
          key: `cell-${g.id}`,
          group: g,
          indexInSection: i,
          sectionLength: filteredCells.length,
          connectTop: true
        })
      );
    }
  }
  return entries;
}

const BrowseGroupsScreen = () => {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  /** Match drawer stack pages (My Groups, Donation, Join Group): black in dark mode, theme background in light. */
  const screenBackground = tc.isDark ? tc.black : tc.background;
  const [cellSearchQuery, setCellSearchQuery] = useState("");
  /** Same radio affordance as Fund picker (`EnhancedDonationForm` fund modal). */
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [nextBusy, setNextBusy] = useState(false);
  const user = useUser();
  const currentUserChurch = useCurrentUserChurch();
  const router = useRouter();
  const rawInterest = useLocalSearchParams<{ interestCategory?: string | string[] }>().interestCategory;
  const interestCategory = (Array.isArray(rawInterest) ? rawInterest[0] : rawInterest)?.trim() || "";

  const {
    data: groups = [],
    isLoading,
    isError
  } = useQuery<Group[]>({
    queryKey: ["browseGroupsList", "MembershipApi"],
    queryFn: async () => {
      const combined: Group[] = [];
      try {
        const all = await ApiHelper.get("/groups", "MembershipApi");
        if (Array.isArray(all)) combined.push(...all);
      } catch {
        /* continue with membership groups */
      }
      try {
        const mine = await ApiHelper.get("/groups/my", "MembershipApi");
        if (Array.isArray(mine)) combined.push(...mine);
      } catch {
        /* best effort */
      }
      return combined;
    },
    enabled: !!(currentUserChurch?.jwt || user?.jwt),
    placeholderData: []
  });

  useScreenHeader({
    title: "Cell Groups",
    placeholder: "Cell Groups",
    headerLeft: () => null
  });

  const listEntries = useMemo(() => {
    const list = Array.isArray(groups) ? groups : [];
    const deduped = dedupeGroups(list);
    const sorted = [...deduped].sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
    const explicitCells = sorted.filter(isExplicitCellGroup);
    // Fallback: if no explicit "cell" markers exist, still surface standard-tag groups.
    const cells = explicitCells.length > 0 ? explicitCells : sorted.filter(isStandardTaggedGroup);
    const q = cellSearchQuery.trim().toLowerCase();
    const filteredCells = cells.filter(g => matchesCellSearch(g, q));
    return buildListEntries(cells, filteredCells, cellSearchQuery.trim());
  }, [groups, cellSearchQuery]);

  const handleBack = useCallback(() => {
    router.replace("/(drawer)/groupJoin");
  }, [router]);

  const handleNext = useCallback(async () => {
    if (!selectedGroupId || nextBusy) return;
    const churchId = currentUserChurch?.church?.id;
    const person = currentUserChurch?.person;
    if (!churchId || !person?.id) {
      Alert.alert("Sign in required", "Please sign in to continue.");
      return;
    }
    setNextBusy(true);
    try {
      const freshPerson = await loadLinkedPerson(churchId, person);
      const personId = freshPerson.id || person.id;
      queryClient.setQueryData([`/people/${personId}`, "MembershipApi"], freshPerson);

      const ci = freshPerson.contactInfo || {};
      const a1 = ci.address1?.trim();
      const c = ci.city?.trim();
      const co = ci.country?.trim();
      if (!a1 || !c || !co) {
        Alert.alert(
          "Address needed",
          "Your address is incomplete. Use Back to return to Join Group and enter Address 1, City, and Country."
        );
        return;
      }

      const payload = membershipPersonSavePayload(freshPerson, {
        address1: a1,
        address2: ci.address2?.trim() || undefined,
        city: c,
        country: co
      });
      await postMembershipJson("/people", [payload], "MembershipApi");
      queryClient.invalidateQueries({ queryKey: [`/people/${personId}`, "MembershipApi"] });

      const interestGroupId = resolveInterestGroupId(groups, interestCategory, selectedGroupId);
      const joinGroupIds = [selectedGroupId, ...(interestGroupId ? [interestGroupId] : [])];
      await postMembershipJson("/groups/join", { groupIds: joinGroupIds }, "MembershipApi");
      await queryClient.invalidateQueries({ queryKey: ["/groups/my", "MembershipApi"] });
      await queryClient.invalidateQueries({ queryKey: ["browseGroupsList", "MembershipApi"] });

      const churchStore = useChurchStore.getState();
      await churchStore.refreshMembershipGroups();
      if (churchStore.currentUserChurch) {
        await churchStore.setCurrentUserChurch({
          ...churchStore.currentUserChurch,
          person: freshPerson
        });
      }

      router.push({
        pathname: "/(drawer)/(tabs)/groupLeaderContact",
        params: {
          groupId: selectedGroupId,
          ...(interestCategory ? { interestCategory } : {}),
          ...(interestGroupId ? { interestGroupId } : {})
        }
      });
    } catch (e) {
      console.warn("Load profile or save address before leader contact failed:", e);
      const message = e instanceof Error ? e.message : "We could not load your profile or save your address. Check your connection and try again.";
      Alert.alert("Could not continue", message);
    } finally {
      setNextBusy(false);
    }
  }, [currentUserChurch?.church?.id, currentUserChurch?.person, groups, interestCategory, nextBusy, router, selectedGroupId]);

  /** City only on rows (no category subtitle). */
  const subtitleFor = useCallback((item: Group) => {
    return item.city?.trim() || "";
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ListEntry }) => {
      if (item.type === "cellSearch") {
        return (
          <View
            style={[
              styles.cellSearchOuter,
              item.hasEmptyBelow ? styles.cellSearchOuterConnectEmpty : styles.cellSearchOuterConnectRows
            ]}>
            <View style={styles.cellSearchInner}>
              <MaterialIcons name="search" size={20} color="rgba(255,255,255,0.45)" />
              <TextInput
                value={cellSearchQuery}
                onChangeText={setCellSearchQuery}
                placeholder="Search cell groups"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={[styles.cellSearchInput, joinBody]}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>
          </View>
        );
      }
      if (item.type === "cellEmpty") {
        return (
          <View style={styles.cellEmptyBox}>
            <Text style={[joinCaption, styles.cellEmptyText]}>No cell groups match your search.</Text>
          </View>
        );
      }
      const { group, indexInSection, sectionLength, connectTop } = item;
      const sub = subtitleFor(group);
      const selected = selectedGroupId === group.id;
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
          onPress={() => setSelectedGroupId(group.id)}
          style={groupRowShellStyle(indexInSection, sectionLength, connectTop)}>
          <MaterialIcons name="groups" size={22} color="rgba(255,255,255,0.45)" />
          <View style={styles.groupRowTextCol}>
            <Text style={[styles.groupRowTitle, joinBody]} numberOfLines={2}>
              {group.name}
            </Text>
            {!!sub && (
              <Text style={[styles.groupRowSubtitle, joinCaption]} numberOfLines={2}>
                {sub}
              </Text>
            )}
          </View>
          <View style={[styles.groupRowRadio, selected && styles.groupRowRadioSelected]}>
            {selected ? <View style={styles.groupRowRadioDot} /> : null}
          </View>
        </TouchableOpacity>
      );
    },
    [cellSearchQuery, selectedGroupId, subtitleFor]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: screenBackground }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const listPaddingBottom = 32 + 58 + Math.max(insets.bottom, 12);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: screenBackground }]} edges={["bottom"]}>
      <View style={styles.pageWrap}>
        <FlatList<ListEntry>
          style={styles.listFlex}
          data={listEntries}
          keyExtractor={item => item.key}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.listContent, { paddingBottom: listPaddingBottom }]}
          ListHeaderComponent={
            isError ? (
              <View style={styles.headerBlock}>
                <Text style={[styles.errorBanner, { color: tc.error }]}>Could not load groups. Try again later.</Text>
              </View>
            ) : null
          }
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.sectionCard}>
              <Text style={[joinSectionHeading, styles.emptyTitle]}>No cell groups available</Text>
              <Text style={[joinCaption, styles.emptyBody]}>
                There are no cell groups in Admin for you to see here yet, or nothing has been published. Check with your church office if something is missing.
              </Text>
            </View>
          }
        />

        <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.backButton}
            onPress={() => void handleBack()}
            accessibilityRole="button"
            accessibilityLabel="Back to Groups">
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.nextButton, (!selectedGroupId || nextBusy) && styles.nextButtonDisabled]}
            onPress={() => void handleNext()}
            disabled={!selectedGroupId || nextBusy}>
            {nextBusy ? <ActivityIndicator color="#111111" /> : <Text style={styles.nextButtonText}>Next</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pageWrap: { flex: 1 },
  listFlex: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", padding: 24 },
  headerBlock: { marginBottom: 12 },
  /** Empty / error cards — same panel as group list rows. */
  sectionCard: {
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 16,
    marginBottom: 12
  },
  errorBanner: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12
  },
  /** Join Group `countryModalSearchRow` look, inside the cell sheet top. */
  cellSearchOuter: {
    backgroundColor: "#1A1A1A",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 0
  },
  /** Search with group rows below — bottom hairline only. */
  cellSearchOuterConnectRows: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)"
  },
  /** Search with empty state below — no bottom border (empty box provides closure). */
  cellSearchOuterConnectEmpty: {},
  cellSearchInner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12
  },
  cellSearchInput: {
    flex: 1,
    color: "#FFFFFF",
    paddingVertical: 10,
    marginLeft: 8
  },
  cellEmptyBox: {
    backgroundColor: "#1A1A1A",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 0
  },
  cellEmptyText: {
    color: "rgba(255,255,255,0.72)",
    textAlign: "center"
  },
  groupRowTextCol: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
    minWidth: 0
  },
  groupRowTitle: {
    fontWeight: "600"
  },
  groupRowSubtitle: {
    color: "rgba(255,255,255,0.65)",
    marginTop: 4
  },
  /** Matches `EnhancedDonationForm` `fundOptionRadio` / `fundOptionRadioDot`. */
  groupRowRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center"
  },
  groupRowRadioSelected: { borderColor: "#FFFFFF" },
  groupRowRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF"
  },
  emptyTitle: { marginBottom: 10 },
  emptyBody: { color: "rgba(255,255,255,0.72)" },
  /** Same layout as `groupJoin` bottomActions (left pill + Next). */
  bottomActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 16
  },
  backButton: {
    width: 100,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12
  },
  backButtonText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700"
  },
  nextButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#F3F6FD",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    minHeight: 48
  },
  nextButtonDisabled: {
    opacity: 0.45
  },
  nextButtonText: {
    color: "#111111",
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700"
  }
});

export default BrowseGroupsScreen;
