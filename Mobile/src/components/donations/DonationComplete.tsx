import { UserHelper } from "../../helpers";
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useThemeColors } from "../../theme";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";

interface Props {
  onDone: () => void;
  amount: string;
  isRecurring?: boolean;
  interval?: string;
  fundName?: string;
  /** Membership / app subscription checkout — different confirmation copy than tithe/giving. */
  variant?: "giving" | "membership";
}

export const DonationComplete = (props: Props) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const isMembership = props.variant === "membership";

  useEffect(() => {
    UserHelper.addOpenScreenEvent(isMembership ? "SubscriptionCompleteScreen" : "DonationCompleteScreen");
    setTimeout(() => {
      props.onDone();
    }, 3000);
  }, []);

  const getRecurringText = () => {
    if (!props.isRecurring) return "";
    switch (props.interval) {
      case "one_week":
        return t("donations.weekly");
      case "one_month":
        return t("donations.monthly");
      case "three_month":
        return t("donations.quarterly");
      case "one_year":
        return t("donations.annually");
      default:
        return t("donations.monthly");
    }
  };

  const title = isMembership ? t("subscription.membershipConfirmationTitle") : t("donations.donationSuccessful");
  const metaLabel = isMembership ? t("subscription.membershipConfirmationPlanLabel") : t("donations.fund");
  const metaValue = isMembership ? t("subscription.membershipRecurringHeading") : props.fundName || t("donations.tithe");
  const details = isMembership ? t("subscription.membershipConfirmationBody") : t("donations.generosityHelps");

  return (
    <View style={[styles.container, { backgroundColor: "#000000" }]}>
      <View style={styles.content}>
        <View style={[styles.successCard, { backgroundColor: "#1A1A1A", borderColor: "rgba(255,255,255,0.12)" }]}>
          <View style={[styles.iconBadge, { backgroundColor: "#E4E7ED", shadowColor: colors.shadowBlack }]}>
            <MaterialIcons name="task-alt" size={52} color="#111111" />
          </View>

          <Text variant="headlineMedium" style={[styles.successTitle, { color: "#FFFFFF" }]}>
            {title}
          </Text>
          <Text variant="titleLarge" style={[styles.successAmount, { color: "#FFFFFF" }]}>
            {props.amount} {props.isRecurring ? getRecurringText() : ""}
          </Text>

          <View style={styles.metaWrap}>
            <Text style={[styles.metaLabel, { color: "rgba(255,255,255,0.62)" }]}>{metaLabel}</Text>
            <Text style={[styles.metaValue, { color: "#FFFFFF" }]} numberOfLines={2}>
              {metaValue}
            </Text>
          </View>

          <Text variant="bodyMedium" style={[styles.successDetails, { color: "rgba(255,255,255,0.78)" }]}>
            {details}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    width: "100%"
  },
  successCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center"
  },
  iconBadge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  successTitle: {
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10
  },
  successAmount: {
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16
  },
  metaWrap: {
    width: "100%",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 4
  },
  metaValue: {
    fontSize: 15,
    fontWeight: "700"
  },
  successDetails: {
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 4
  }
});
