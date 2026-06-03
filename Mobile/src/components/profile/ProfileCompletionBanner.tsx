import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { isProfileIncomplete } from "@/helpers/profileCompletion";
import { useChurchStore } from "@/stores/useChurchStore";
import { useCurrentUserChurch } from "@/stores/useUserStore";

/** Home dashboard callout when the member has not completed profile onboarding (no group joined). */
export function ProfileCompletionBanner() {
  const { t } = useTranslation();
  const currentUserChurch = useCurrentUserChurch();
  const refreshMembershipGroups = useChurchStore((state) => state.refreshMembershipGroups);

  useFocusEffect(
    useCallback(() => {
      void refreshMembershipGroups();
    }, [refreshMembershipGroups])
  );

  if (!isProfileIncomplete(currentUserChurch)) return null;

  return (
    <Pressable
      onPress={() => router.push("/(drawer)/profileEdit")}
      style={({ pressed }) => [styles.wrap, pressed && styles.wrapPressed]}
      accessibilityRole="button"
      accessibilityHint={t("profileEdit.completeProfile")}>
      <Text style={styles.title}>{t("profileEdit.newMemberBannerTitle")}</Text>
      <View style={styles.row}>
        <Text style={styles.subtitle}>{t("profileEdit.newMemberBannerMessage")}</Text>
        <MaterialIcons name="chevron-right" size={22} color="rgba(96, 165, 250, 0.85)" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(96, 165, 250, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.35)"
  },
  wrapPressed: {
    backgroundColor: "rgba(96, 165, 250, 0.18)"
  },
  title: {
    color: "#EFF6FF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  subtitle: {
    flex: 1,
    color: "rgba(239, 246, 255, 0.88)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600"
  }
});
