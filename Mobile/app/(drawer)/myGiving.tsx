import React, { useRef, type ComponentProps } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Linking } from "react-native";
import { Text } from "react-native-paper";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/theme";
import { givingSectionHeading } from "@/components/donations/givingTypography";

type HubRow = {
  key: string;
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  href: string;
};

export default function MyGivingScreen() {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const timelineScrollRef = useRef<ScrollView>(null);
  const now = new Date();
  const monthsToShow = 26; // previous 24 months + current + next
  const monthTimeline = Array.from({ length: monthsToShow }, (_, idx) => {
    const monthOffset = -(monthsToShow - 2) + idx; // ... -24, ..., -1, 0, +1
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const isIncomplete = d.getFullYear() > now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() >= now.getMonth());
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      isCurrent: d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(),
      isIncomplete,
      year: d.getFullYear(),
      month: d.getMonth() + 1
    };
  });

  const rows: HubRow[] = [
    {
      key: "history",
      title: t("donations.history"),
      subtitle: t("donations.myGivingHistorySubtitle"),
      icon: "history",
      href: "/(drawer)/givingHistory"
    }
  ];
  const manageRow: HubRow = {
    key: "manage",
    title: t("donations.managePaymentMethods", "Manage Payment Methods"),
    subtitle: t("donations.managePaymentMethodsSubtitle", "Manage your saved payment methods"),
    icon: "credit-card",
    href: "/(drawer)/addPaymentMethod"
  };
  const overviewRow: HubRow = {
    key: "overview",
    title: t("donations.yourGivingImpact", "Your Giving Impact"),
    subtitle: t("donations.myGivingOverviewSubtitle", "View your giving impact and ratings"),
    icon: "donut-large",
    href: "/(drawer)/givingOverview"
  };
  const emailSupport = () => {
    Linking.openURL("mailto:support@churchapps.org?subject=Giving%20Support");
  };
  const openSupportInfo = () => {
    Linking.openURL("https://churchapps.org/");
  };

  return (
    <View style={styles.container}>
      {rows.map(row => (
        (
          <View key={row.key} style={[styles.card, styles.historyCard, { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#1A1A1A" }]}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(row.href)}>
              <View style={styles.cardTopRow}>
                <View style={[styles.iconWrap, styles.historyIconWrap]}>
                  <MaterialIcons name={row.icon} size={48} color={tc.white} />
                </View>
                <View style={styles.textCol}>
                  <Text variant="titleMedium" style={[styles.title, givingSectionHeading, { color: tc.white }]}>
                    {t("donations.givingHistory", "Giving History")}
                  </Text>
                  <Text variant="bodySmall" style={[styles.subtitle, { color: "rgba(255,255,255,0.65)" }]}>
                    {t("donations.givingHistorySubtitle", "View your history of tithes and offerings")}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={28} color="rgba(255,255,255,0.45)" />
              </View>
            </TouchableOpacity>
            <View style={styles.timelineWrap}>
              <ScrollView
                ref={timelineScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timelineScrollContent}
                onContentSizeChange={() => timelineScrollRef.current?.scrollToEnd({ animated: false })}>
                <View style={styles.timelineTrackRow}>
                  {monthTimeline.map((month, idx) => (
                    <React.Fragment key={month.key}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() =>
                          router.push({
                            pathname: "/(drawer)/givingHistory",
                            params: { year: String(month.year), month: String(month.month) }
                          })
                        }
                        style={styles.timelineItem}>
                        <View
                          style={[
                            styles.timelineDot,
                            month.isIncomplete ? styles.timelineDotCurrent : null,
                            { borderColor: "rgba(255,255,255,0.72)" }
                          ]}
                        />
                        <Text style={[styles.subtitle, styles.timelineLabel, { color: month.isCurrent ? tc.white : "rgba(255,255,255,0.78)" }]}>{month.label}</Text>
                        {month.isCurrent ? <View style={[styles.currentMonthBar, { backgroundColor: tc.primary }]} /> : null}
                      </TouchableOpacity>
                      {idx < monthTimeline.length - 1 ? (
                        <View style={styles.timelineConnector}>
                          {Array.from({ length: 6 }).map((_, dotIdx) => (
                            <View key={`${month.key}-dot-${dotIdx}`} style={styles.timelineConnectorDot} />
                          ))}
                        </View>
                      ) : null}
                    </React.Fragment>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={styles.historyHintRow}>
              <MaterialIcons name="info-outline" size={16} color="rgba(255,255,255,0.62)" />
              <Text variant="bodySmall" style={[styles.subtitle, styles.historyHintText]}>
                {t("donations.historyCardHint", "Tap icons to view details or plan your next gifts")}
              </Text>
            </View>
          </View>
        )
      ))}
      <View style={styles.sectionHeaderWrap}>
        <Text variant="titleMedium" style={[givingSectionHeading, { color: tc.white }]}>
          {t("donations.myGiving", "My Giving")}
        </Text>
      </View>
      <View style={[styles.card, styles.combinedCard, { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#1A1A1A" }]}>
        <TouchableOpacity activeOpacity={0.85} style={styles.combinedCardRow} onPress={() => router.push(overviewRow.href)}>
          <View style={styles.cardTopRow}>
            <View style={[styles.iconWrap, styles.historyIconWrap, styles.combinedIconWrap]}>
              <MaterialIcons name={overviewRow.icon} size={42} color={tc.white} />
            </View>
            <View style={styles.textCol}>
              <Text variant="titleMedium" style={[styles.title, givingSectionHeading, { color: tc.white }]}>
                {overviewRow.title}
              </Text>
              <Text variant="bodySmall" style={[styles.subtitle, { color: "rgba(255,255,255,0.65)" }]}>
                {overviewRow.subtitle}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color="rgba(255,255,255,0.45)" />
          </View>
        </TouchableOpacity>
        <View style={styles.combinedDivider} />
        <TouchableOpacity activeOpacity={0.85} style={styles.combinedCardRow} onPress={() => router.push(manageRow.href)}>
          <View style={styles.cardTopRow}>
            <View style={[styles.iconWrap, styles.historyIconWrap, styles.combinedIconWrap]}>
              <MaterialIcons name={manageRow.icon} size={42} color={tc.white} />
            </View>
            <View style={styles.textCol}>
              <Text variant="titleMedium" style={[styles.title, givingSectionHeading, { color: tc.white }]}>
                {manageRow.title}
              </Text>
              <Text variant="bodySmall" style={[styles.subtitle, { color: "rgba(255,255,255,0.65)" }]}>
                {manageRow.subtitle}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color="rgba(255,255,255,0.45)" />
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.sectionHeaderWrap}>
        <Text variant="titleMedium" style={[givingSectionHeading, { color: tc.white }]}>
          {t("common.help", "Help")}
        </Text>
      </View>
      <View style={[styles.card, styles.combinedCard, { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#1A1A1A" }]}>
        <TouchableOpacity activeOpacity={0.85} style={styles.combinedCardRow} onPress={emailSupport}>
          <View style={styles.cardTopRow}>
            <View style={[styles.iconWrap, styles.historyIconWrap, styles.combinedIconWrap]}>
              <MaterialIcons name="email" size={42} color={tc.white} />
            </View>
            <View style={styles.textCol}>
              <Text variant="titleMedium" style={[styles.title, givingSectionHeading, { color: tc.white }]}>
                {t("donations.emailGivingSupport", "Email Giving Support")}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color="rgba(255,255,255,0.45)" />
          </View>
        </TouchableOpacity>
        <View style={styles.combinedDivider} />
        <TouchableOpacity activeOpacity={0.85} style={styles.combinedCardRow} onPress={openSupportInfo}>
          <View style={styles.cardTopRow}>
            <View style={[styles.iconWrap, styles.historyIconWrap, styles.combinedIconWrap]}>
              <MaterialIcons name="info-outline" size={42} color={tc.white} />
            </View>
            <View style={styles.textCol}>
              <Text variant="titleMedium" style={[styles.title, givingSectionHeading, { color: tc.white }]}>
                {t("donations.supportInfo", "Support Info")}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color="rgba(255,255,255,0.45)" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12
  },
  historyCard: {
    paddingTop: 14,
    paddingBottom: 14
  },
  combinedCard: {
    paddingVertical: 0,
    paddingHorizontal: 0
  },
  combinedCardRow: {
    paddingVertical: 16,
    paddingHorizontal: 14
  },
  combinedDivider: {
    height: 1,
    marginHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.1)"
  },
  sectionHeaderWrap: {
    marginTop: 8,
    marginBottom: 8
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14
  },
  historyIconWrap: {
    backgroundColor: "transparent",
    borderRadius: 0
  },
  combinedIconWrap: {
    width: 50,
    height: 50
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { marginBottom: 4 },
  subtitle: { lineHeight: 18 },
  timelineWrap: {
    marginTop: 14,
    paddingHorizontal: 2
  },
  timelineScrollContent: {
    position: "relative",
    alignItems: "flex-start",
    paddingRight: 8
  },
  timelineTrackRow: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  timelineItem: {
    alignItems: "center",
    width: 46
  },
  timelineConnector: {
    marginTop: 11,
    width: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  timelineConnectorDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.62)"
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: "#1A1A1A"
  },
  timelineDotCurrent: { borderStyle: "dashed" },
  timelineLabel: { marginTop: 6 },
  currentMonthBar: {
    marginTop: 4,
    width: 18,
    height: 3,
    borderRadius: 2
  },
  historyHintRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  historyHintText: {
    color: "rgba(255,255,255,0.62)",
    fontWeight: "500",
    flex: 1
  }
});
