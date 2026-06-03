import React from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Text, Card, Button } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Svg, { Circle } from "react-native-svg";
import { CurrencyHelper, DateHelper } from "../../../helpers";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "../../../theme";
import { givingSectionHeading } from "../givingTypography";

interface GivingStats {
  ytd: number;
  lastGift: number;
  totalGifts: number;
  lastGiftDate: Date | null;
}

interface GivingOverviewProps {
  givingStats: GivingStats;
  givingImpact: {
    score: number;
    tier: string;
    message: string;
  };
  givingImpactByFund?: {
    key: string;
    name: string;
    score: number;
    tier: string;
    message: string;
  }[];
  onDonatePress: () => void;
  onHistoryPress: () => void;
}

export const GivingOverview: React.FC<GivingOverviewProps> = ({ givingStats, givingImpact, givingImpactByFund = [], onDonatePress, onHistoryPress }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const donutSize = 88;
  const donutStroke = 8;
  const donutRadius = (donutSize - donutStroke) / 2;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const useSvgDonut = Platform.OS !== "android";
  const tierColorMap: Record<string, string> = {
    Bronze: "#C08A5A",
    Silver: "#C0C6D4",
    Gold: "#F3C64E",
    Platinum: "#69D2E7"
  };
  const chartItems = givingImpactByFund.length
    ? givingImpactByFund
    : [
      { key: "tithe", name: t("donations.tithe", "Tithe"), score: givingImpact?.score || 0, tier: givingImpact?.tier || "Bronze", message: givingImpact?.message || "" },
      { key: "seed", name: t("donations.seed", "Seed"), score: givingImpact?.score || 0, tier: givingImpact?.tier || "Bronze", message: givingImpact?.message || "" },
      { key: "offering", name: t("donations.offering", "Offering"), score: givingImpact?.score || 0, tier: givingImpact?.tier || "Bronze", message: givingImpact?.message || "" }
    ];

  return (
    <>
      {/* Hero Stats Card */}
      <Card style={[styles.heroCard, { shadowColor: colors.primary }]}>
        <View style={styles.heroGradient}>
          <View style={styles.heroContent}>
            <View style={styles.donutRow}>
              {chartItems.slice(0, 3).map((item) => {
                const normalizedImpactScore = Math.max(0, Math.min(100, item.score || 0));
                const impactOffset = donutCircumference * (1 - normalizedImpactScore / 100);
                const impactColor = tierColorMap[item.tier || ""] || "#C0C6D4";

                return (
                  <View key={item.key} style={styles.donutBlock}>
                    <Text style={[styles.donutName, { color: colors.white }]}>{item.name}</Text>
                    <View style={styles.donutWrap}>
                      {useSvgDonut ? (
                        <Svg width={donutSize} height={donutSize}>
                          <Circle
                            cx={donutSize / 2}
                            cy={donutSize / 2}
                            r={donutRadius}
                            stroke="rgba(255,255,255,0.22)"
                            strokeWidth={donutStroke}
                            fill="none"
                          />
                          <Circle
                            cx={donutSize / 2}
                            cy={donutSize / 2}
                            r={donutRadius}
                            stroke={impactColor}
                            strokeWidth={donutStroke}
                            strokeLinecap="round"
                            fill="none"
                            rotation={-90}
                            originX={donutSize / 2}
                            originY={donutSize / 2}
                            strokeDasharray={[donutCircumference, donutCircumference]}
                            strokeDashoffset={impactOffset}
                          />
                        </Svg>
                      ) : (
                        <View style={[styles.donutFallbackOuter, { borderColor: impactColor }]} />
                      )}
                      <View style={styles.donutCenter}>
                        <Text style={[styles.donutScore, { color: colors.white }]}>{normalizedImpactScore}%</Text>
                        <Text style={[styles.donutLabel, { color: "rgba(255,255,255,0.72)" }]}>Rating</Text>
                      </View>
                    </View>
                    <View style={styles.impactMeta}>
                      <View style={styles.tierChip}>
                        <Text style={[styles.tierChipText, { color: colors.white }]}>{item.tier || "Bronze"}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.impactDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryLeftCol}>
                <Text variant="titleMedium" style={[givingSectionHeading, { color: "rgba(255,255,255,0.9)" }]}>
                  {t("donations.totalThisYear")}
                </Text>
              </View>
              <View style={styles.summaryRightCol}>
                <Text variant="titleLarge" style={[styles.summaryAmountText, { color: colors.white }]}>
                  {CurrencyHelper.formatCurrency(givingStats.ytd)}
                </Text>
                <Text variant="bodyMedium" style={[styles.heroSubtitle, { color: colors.white }]}>
                  {givingStats.totalGifts} {t("donations.gifts")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Card>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={[styles.sectionTitle, givingSectionHeading]}>
            {t("donations.recentActivity")}
          </Text>
          <Button mode="text" onPress={onHistoryPress} labelStyle={{ color: colors.white }}>
            {t("common.viewAll")}
          </Button>
        </View>

        <Card style={[styles.activityCard, { shadowColor: colors.shadowBlack }]}>
          <Card.Content style={styles.activityContent}>
            <View style={styles.activityIcon}>
              <MaterialIcons name="volunteer-activism" size={24} color={colors.white} />
            </View>
            <View style={styles.activityDetails}>
              <Text variant="titleMedium" style={[styles.activityTitle, givingSectionHeading]}>
                {t("donations.lastGift")}
              </Text>
              <Text variant="bodyMedium" style={[styles.activityAmount, { color: colors.white }]}>
                {CurrencyHelper.formatCurrency(givingStats.lastGift)}
              </Text>
              <Text variant="bodySmall" style={styles.activityDate}>
                {givingStats.lastGiftDate ? DateHelper.prettyDate(givingStats.lastGiftDate) : t("donations.noRecentGift")}
              </Text>
            </View>
            <TouchableOpacity style={styles.repeatButton} onPress={onDonatePress}>
              <Text variant="labelMedium" style={[styles.repeatButtonText, { color: colors.white }]}>
                {t("donations.repeat")}
              </Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>
      </View>

      {/* CTA Section */}
      <Card style={[styles.ctaCard, { shadowColor: colors.shadowBlack }]}>
        <Card.Content style={styles.ctaContent}>
          <Text variant="titleMedium" style={[styles.ctaTitle, givingSectionHeading]}>
            {t("donations.makeDifferenceToday")}
          </Text>
          <Text variant="bodyMedium" style={styles.ctaSubtitle}>
            {t("donations.generosityHelps")}
          </Text>
          <Button mode="contained" onPress={onDonatePress} style={styles.ctaButton} labelStyle={styles.ctaButtonText} buttonColor="#FFFFFF" textColor="#1A1A1A">
            {t("donations.giveNow")}
          </Button>
        </Card.Content>
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3
  },
  heroGradient: {
    padding: 24,
    minHeight: 180,
    backgroundColor: "#1A1A1A"
  },
  heroContent: {
    alignItems: "stretch",
    justifyContent: "center",
    flex: 1
  },
  heroTitle: {
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center"
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 8
  },
  summaryLeftCol: { justifyContent: "center" },
  summaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginLeft: 6,
    marginRight: 12
  },
  summaryRightCol: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center"
  },
  summaryAmountText: { fontWeight: "800" },
  donutRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  donutBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  donutName: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center"
  },
  donutWrap: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  donutFallbackOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 8,
    borderColor: "#C0C6D4",
    alignItems: "center",
    justifyContent: "center"
  },
  donutCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center"
  },
  donutScore: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800"
  },
  donutLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "600"
  },
  impactMeta: {
    alignItems: "center",
    maxWidth: 100
  },
  tierChip: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8
  },
  tierChipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700"
  },
  impactMessage: {
    lineHeight: 18,
    textAlign: "center"
  },
  impactDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 14
  },
  heroSubtitle: {
    opacity: 0.9,
    textAlign: "right"
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  sectionTitle: { color: "#FFFFFF" },
  activityCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1A1A1A",
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3
  },
  activityContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  activityDetails: { flex: 1 },
  activityTitle: {
    color: "#FFFFFF",
    marginBottom: 2
  },
  activityAmount: {
    fontWeight: "700",
    marginBottom: 2
  },
  activityDate: { color: "rgba(255,255,255,0.64)" },
  repeatButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  repeatButtonText: { fontWeight: "600" },
  ctaCard: {
    borderRadius: 18,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  ctaContent: {
    alignItems: "center",
    padding: 24
  },
  ctaIcon: { marginBottom: 16 },
  ctaTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8
  },
  ctaSubtitle: {
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 16
  },
  ctaButton: {
    width: "100%",
    borderRadius: 999,
    paddingVertical: 10,
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10
  },
  ctaButtonText: {
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 20
  }
});
