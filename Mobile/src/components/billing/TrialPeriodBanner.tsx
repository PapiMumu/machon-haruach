import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import dayjs from "dayjs";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useUser } from "@/stores/useUserStore";
import { parseSubscriptionDate } from "@/helpers/subscriptionUi";

/** Home dashboard callout when `subscriptionStatus` is `trialing`. */
export function TrialPeriodBanner() {
  const { t } = useTranslation();
  const user = useUser();

  const body = useMemo(() => {
    if (!user) return null;
    if (String(user.subscriptionStatus || "").toLowerCase() !== "trialing") return null;

    const end = parseSubscriptionDate(user.trialEndsAt);
    const now = dayjs();
    if (end && !end.isAfter(now)) return null;

    if (!end) {
      return t("subscription.trialBannerBodyGeneric");
    }

    const daysLeft = Math.max(0, end.startOf("day").diff(now.startOf("day"), "day"));
    if (daysLeft <= 0) return t("subscription.trialBannerBodyToday");
    if (daysLeft === 1) return t("subscription.trialBannerBodyTomorrow");
    return t("subscription.trialBannerBodyWithDays", { days: daysLeft });
  }, [t, user]);

  if (!body) return null;

  return (
    <Pressable
      onPress={() => router.push("/(drawer)/membershipSubscribe")}
      style={({ pressed }) => [styles.wrap, pressed && styles.wrapPressed]}
      accessibilityRole="button"
      accessibilityHint={t("subscription.membershipCheckoutHint")}>
      <View style={styles.row}>
        <MaterialIcons name="schedule" size={22} color="#FBBF24" style={styles.icon} />
        <View style={styles.textCol}>
          <Text style={styles.title}>{t("subscription.trialBannerTitle")}</Text>
          <Text style={styles.subtitle}>{body}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color="rgba(251,191,36,0.85)" />
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
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)"
  },
  wrapPressed: {
    backgroundColor: "rgba(251, 191, 36, 0.18)"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  icon: { marginTop: 2 },
  textCol: { flex: 1 },
  title: {
    color: "#FFFBEB",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4
  },
  subtitle: {
    color: "rgba(255, 251, 235, 0.88)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600"
  }
});
