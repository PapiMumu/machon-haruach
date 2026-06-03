import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Text } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { givingBody, givingCaption, givingSectionHeading } from "../../../src/components/donations/givingTypography";
import { ApiHelper } from "../../../src/helpers";
import { useUser, useCurrentUserChurch } from "../../../src/stores/useUserStore";
import { useThemeColors } from "@/theme";
import type { TextStyle } from "react-native";

const joinBody: TextStyle = { ...givingBody, fontSize: 16, lineHeight: 22, color: "#FFFFFF" };
const joinCaption: TextStyle = { ...givingCaption, fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.72)" };
const joinSectionHeading: TextStyle = { ...givingSectionHeading, fontSize: 18, lineHeight: 26, color: "#FFFFFF" };

/** Match `(tabs)/_layout` tab bar height so scroll content clears the bar. */
function tabBarBottomInset(insetsBottom: number): number {
  const bottomPad = Math.max(insetsBottom, Platform.OS === "ios" ? 10 : 8);
  return 58 + bottomPad;
}

interface GroupDetail {
  id: string;
  name?: string;
  leaderName?: string;
  leaderPhone?: string;
  meetingTime?: string;
  meetingLocation?: string;
}

function pickParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function LeaderGroupCard(props: {
  sectionLabel: string;
  group: GroupDetail;
  bodyHint: string;
  whatsappAboutLabel: string;
}) {
  const { sectionLabel, group, bodyHint, whatsappAboutLabel } = props;
  const phoneDigits = useMemo(() => (group.leaderPhone || "").replace(/[^\d+]/g, ""), [group.leaderPhone]);
  const whatsappDigits = useMemo(() => (group.leaderPhone || "").replace(/\D/g, ""), [group.leaderPhone]);

  const callLeader = useCallback(() => {
    if (!phoneDigits) return;
    void Linking.openURL(`tel:${phoneDigits}`);
  }, [phoneDigits]);

  const openLeaderWhatsApp = useCallback(() => {
    if (!whatsappDigits) return;
    const label = whatsappAboutLabel.trim() || group.name?.trim() || "this group";
    const text = encodeURIComponent(`Hi, I'm reaching out about ${label}.`);
    void Linking.openURL(`https://wa.me/${whatsappDigits}?text=${text}`);
  }, [group.name, whatsappAboutLabel, whatsappDigits]);

  return (
    <View style={styles.sectionCard}>
      <Text style={[joinCaption, styles.label]}>{sectionLabel}</Text>
      <Text style={[joinSectionHeading, styles.groupName]}>{group.name || "—"}</Text>
      <Text style={[joinCaption, styles.memberHint]}>{bodyHint}</Text>

      <View style={styles.insetDivider} />

      <Text style={[joinCaption, styles.label]}>Leader</Text>
      {!!group.leaderName?.trim() ? (
        <Text style={[joinBody, styles.leaderName]}>{group.leaderName.trim()}</Text>
      ) : !!group.leaderPhone?.trim() ? (
        <Text style={[joinCaption, styles.leaderHint]}>Contact the group leader using Call or WhatsApp below.</Text>
      ) : (
        <Text style={[joinCaption, styles.muted, styles.leaderHint]}>
          No leader name or phone is on file yet. Ask your church office if you need help reaching this group.
        </Text>
      )}

      {!!group.leaderPhone?.trim() ? (
        <>
          <Text style={[joinCaption, styles.contactNumber]}>{group.leaderPhone.trim()}</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.callButton}
              onPress={callLeader}
              accessibilityRole="button"
              accessibilityLabel={`Call leader at ${group.leaderPhone.trim()}`}
            >
              <MaterialIcons name="phone" size={18} color="#1A1A1A" />
              <Text style={styles.callText}>Call</Text>
            </TouchableOpacity>

            {!!whatsappDigits && (
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.whatsappButton}
                onPress={openLeaderWhatsApp}
                accessibilityRole="button"
                accessibilityLabel={`WhatsApp the leader at ${group.leaderPhone.trim()}`}
              >
                <Image source={require("../../../assets/images/whatsapp.png")} style={styles.whatsappIcon} resizeMode="contain" />
                <Text style={styles.whatsappText}>WhatsApp</Text>
                <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.55)" />
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : !!group.leaderName?.trim() ? (
        <Text style={[joinCaption, styles.muted, styles.phoneGap]}>
          A phone number isn’t on file for this leader. Ask your church office if you need to connect.
        </Text>
      ) : null}

      {!!(group.meetingTime || group.meetingLocation) && (
        <View style={styles.metaBlock}>
          {!!group.meetingTime?.trim() && (
            <Text style={[joinCaption, styles.metaLine]}>
              <Text style={styles.metaBold}>When: </Text>
              {group.meetingTime.trim()}
            </Text>
          )}
          {!!group.meetingLocation?.trim() && (
            <Text style={[joinCaption, styles.metaLine]}>
              <Text style={styles.metaBold}>Where: </Text>
              {group.meetingLocation.trim()}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function GroupLeaderContactScreen() {
  const tc = useThemeColors();
  const screenBackground = tc.isDark ? tc.black : tc.background;
  const insets = useSafeAreaInsets();
  const scrollBottomPad = 16 + tabBarBottomInset(insets.bottom);
  const navigation = useNavigation();
  const user = useUser();
  const currentUserChurch = useCurrentUserChurch();
  const p = useLocalSearchParams<{
    groupId?: string | string[];
    interestGroupId?: string | string[];
    interestCategory?: string | string[];
  }>();
  const groupId = pickParam(p.groupId);
  const interestGroupIdRaw = pickParam(p.interestGroupId);
  const interestCategory = (pickParam(p.interestCategory) || "").trim();
  const interestGroupId =
    interestGroupIdRaw && groupId && interestGroupIdRaw !== groupId ? interestGroupIdRaw : undefined;

  const {
    data: group,
    isLoading,
    isError
  } = useQuery({
    queryKey: [`/groups/${groupId}`, "MembershipApi"],
    queryFn: async () => (await ApiHelper.get(`/groups/${groupId}`, "MembershipApi")) as GroupDetail,
    enabled: !!groupId && !!user?.jwt && !!currentUserChurch?.jwt
  });

  const {
    data: interestGroup,
    isLoading: interestLoading,
    isError: interestError
  } = useQuery({
    queryKey: [`/groups/${interestGroupId}`, "MembershipApi", "interest"],
    queryFn: async () => (await ApiHelper.get(`/groups/${interestGroupId}`, "MembershipApi")) as GroupDetail,
    enabled: !!interestGroupId && !!user?.jwt && !!currentUserChurch?.jwt
  });

  /** Drawer hosts the visible header; tab screens have `headerShown: false`. */
  useFocusEffect(
    useCallback(() => {
      const drawerNav = navigation.getParent()?.getParent?.() as { setOptions?: (o: { title?: string }) => void } | undefined;
      const title = group?.name || "Leader contact";
      drawerNav?.setOptions?.({ title });
      return () => {
        drawerNav?.setOptions?.({ title: "" });
      };
    }, [navigation, group?.name])
  );

  const isUserInThisCellGroup = useMemo(
    () => !!groupId && !!currentUserChurch?.groups?.some(g => g.id === groupId),
    [currentUserChurch?.groups, groupId]
  );

  if (!groupId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: screenBackground }]} edges={["bottom"]}>
        <View style={styles.centered}>
          <Text style={[joinCaption, styles.muted]}>No group selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: screenBackground }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: screenBackground }]} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPad }]}
        keyboardShouldPersistTaps="handled"
      >
        {isError || !group ? (
          <View style={styles.sectionCard}>
            <Text style={[joinCaption, styles.muted]}>Could not load this group. Go back and try again.</Text>
          </View>
        ) : (
          <>
            <LeaderGroupCard
              sectionLabel="Cell group"
              group={group}
              bodyHint={
                isUserInThisCellGroup
                  ? "You're on record with this cell group in B1."
                  : "Details for the group you selected from the list."
              }
              whatsappAboutLabel={group.name?.trim() || "this cell group"}
            />

            {interestGroupId ? (
              interestLoading && !interestGroup ? (
                <View style={[styles.sectionCard, styles.interestLoading]}>
                  <ActivityIndicator size="small" color={tc.primary} />
                  <Text style={[joinCaption, styles.muted, styles.interestLoadingText]}>
                    Loading {interestCategory || "your group"}…
                  </Text>
                </View>
              ) : interestError || !interestGroup ? (
                <View style={styles.sectionCard}>
                  <Text style={[joinCaption, styles.muted]}>
                    Could not load the leader for {interestCategory || "that group type"}. Your cell group details above
                    are still available.
                  </Text>
                </View>
              ) : (
                <LeaderGroupCard
                  sectionLabel={interestCategory || "Your group"}
                  group={interestGroup}
                  bodyHint="This is the leader for the group type you chose on Join Group."
                  whatsappAboutLabel={interestGroup.name?.trim() || interestCategory || "this group"}
                />
              )
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", padding: 24 },
  sectionCard: {
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 16,
    marginBottom: 12
  },
  interestLoading: { flexDirection: "row", alignItems: "center", gap: 12 },
  interestLoadingText: { flex: 1, marginBottom: 0 },
  insetDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginTop: 16,
    marginBottom: 4,
    marginHorizontal: -16
  },
  label: { marginBottom: 8, color: "rgba(255,255,255,0.72)" },
  groupName: { fontWeight: "800", marginBottom: 4 },
  memberHint: { marginTop: 4, color: "rgba(255,255,255,0.62)", lineHeight: 20 },
  phoneIcon: { marginRight: 4 },
  leaderName: { fontWeight: "600", marginBottom: 12 },
  leaderHint: { marginBottom: 12, lineHeight: 20, color: "rgba(255,255,255,0.78)" },
  contactNumber: {
    marginTop: 2,
    marginBottom: 10,
    color: "rgba(255,255,255,0.82)"
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3
  },
  callText: {
    color: "#1A1A1A",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  whatsappButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  whatsappIcon: { width: 18, height: 18 },
  whatsappText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },
  phoneGap: { marginTop: 4 },
  muted: { color: "rgba(255,255,255,0.72)" },
  metaBlock: { marginTop: 16 },
  metaLine: { color: "rgba(255,255,255,0.82)", marginBottom: 6 },
  metaBold: { fontWeight: "700", color: "#FFFFFF" }
});
