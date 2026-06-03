import React, { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, FlatList, Modal, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Card, Text, Button, Menu, Divider, SegmentedButtons } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ApiHelper, CurrencyHelper, DateHelper, globalStyles } from "../../helpers";
import { useCurrentUserChurch } from "../../stores/useUserStore";
import { DonationImpact, StripePaymentMethod, SubscriptionInterface } from "@/interfaces";
import DropDownPicker from "react-native-dropdown-picker";
import { DimensionHelper } from "@/helpers/DimensionHelper";
import { DonationHelper } from "@machonharuach/helpers";
import { useTranslation } from "react-i18next";
import { PrintStatementButton } from "./PrintStatementButton";
import { useThemeColors } from "../../theme";
import { givingAmountEmphasis, givingBody, givingCaption, givingListRowTitle, givingSectionHeading } from "./givingTypography";

interface DonationRecord {
  id: string;
  amount: number;
  fees: number;
  fund: string;
  date: Date;
  method: string;
  status: "completed" | "pending" | "failed";
  recurring: boolean;
  frequency?: string;
}

interface Props {
  customerId: string;
  paymentMethods: StripePaymentMethod[];
  donationImpactData: DonationImpact[];
  donationImpactLoading?: boolean;
  selectedYear?: number;
  selectedMonth?: number;
}

export function EnhancedGivingHistory({ customerId, paymentMethods, donationImpactData, donationImpactLoading = false, selectedYear, selectedMonth }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const currentUserChurch = useCurrentUserChurch();

  const intervalTypes = [
    { label: t("donations.weekly"), value: "one_week" },
    { label: t("donations.biWeekly"), value: "two_week" },
    { label: t("donations.monthly"), value: "one_month" },
    { label: t("donations.quarterly"), value: "three_month" },
    { label: t("donations.annually"), value: "one_year" }
  ];
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<DonationRecord | null>(null);
  const [selectedRecurring, setSelectedRecurring] = useState<SubscriptionInterface | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionInterface[]>([]);
  const [recurringLoading, setRecurringLoading] = useState<boolean>(false);
  const donations = donationImpactData ?? [];
  const donationsLoading = donationImpactLoading;
  const [isPaymentMethodDropDownOpen, setIsPaymentMethodDropDownOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(paymentMethods.length > 0 ? paymentMethods[0].id : null);
  const [yearOffset, setYearOffset] = useState("0");
  const [paymentMethodItems, setPaymentMethodItems] = useState<any>([]);
  const [selectedInterval, setSelectedInterval] = useState<string>("one_week");
  const [intervalOpen, setIntervalOpen] = useState(false);
  const [intervalValue, setIntervalValue] = useState<string | null>("one_week");
  const [intervalItems, setIntervalItems] = useState(
    intervalTypes.map(i => ({ label: i.label, value: i.value }))
  );
  const [loadingAction, setLoadingAction] = useState<null | "delete" | "save">(null);

  const FALLBACK_FUND_NAMES: Record<string, string> = {
    tithe: "Tithe",
    seed: "Seed",
    offering: "Offering",
    "new-locations": "New Locations",
    "local-global-missions": "Local & Global Missions",
    nextgen: "NextGen",
    "free-resources": "Free Resources"
  };

  const loadData = () => {
    if (customerId) {
      setRecurringLoading(true);
      ApiHelper.get("/customers/" + customerId + "/subscriptions", "GivingApi").then((subResult: any) => {
        const subs: SubscriptionInterface[] = [];
        const requests = subResult.data?.map((s: any) => ApiHelper.get("/subscriptionfunds?subscriptionId=" + s.id, "GivingApi").then((subFunds: any) => {
          s.funds = subFunds;
          subs.push(s);
        }));
        if (requests) {
          return Promise.all(requests).then(() => {
            setSubscriptions(subs);
          });
        }
      }).finally(() => { setRecurringLoading(false); });
    }
  };

  useEffect(loadData, []);

  useEffect(() => {
    if (paymentMethods.length > 0) {
      const items = paymentMethods.map((method: any) => ({
        label: method.name + " ****" + method.last4,
        value: method.id
      }));
      setPaymentMethodItems(items as any);

      if (!selectedMethod) {
        setSelectedMethod(paymentMethods[0].id);
      }
    }
  }, [paymentMethods]);

  useEffect(() => setIntervalValue(selectedInterval), [selectedInterval]);

  const handlePaymentMethodChange = (methodId: string) => {
    setSelectedMethod(methodId);
    const pm = paymentMethods.find(pm => pm.id === methodId);
    if (pm) {
      const updated = { ...selectedRecurring } as SubscriptionInterface;
      updated.default_payment_method = pm.type === "card" ? methodId : "";
      updated.default_source = pm.type === "bank" ? methodId : "";
      setSelectedRecurring(updated);
    }
  };

  const periods = [
    { label: t("donations.totalThisYear"), value: "ytd" },
    { label: t("donations.last30Days", "Last 30 days"), value: "30d" },
    { label: t("donations.last90Days", "Last 90 days"), value: "90d" },
    { label: t("common.viewAll"), value: "all" }
  ];

  const getPaymentTimestamp = (donation: DonationImpact) => {
    const entryTimeRaw = (donation as any)?.entryTime;
    const entryTime = entryTimeRaw ? new Date(entryTimeRaw).getTime() : 0;
    if (entryTime) return entryTime;
    return DateHelper.toDate(donation.donationDate).getTime();
  };
  const currentYear = new Date().getFullYear();
  const selectedMonthFilter = useMemo(() => {
    if (!selectedYear || !selectedMonth) return null;
    if (selectedMonth < 1 || selectedMonth > 12) return null;
    return { year: selectedYear, month: selectedMonth };
  }, [selectedYear, selectedMonth]);
  const [activeMonthFilter, setActiveMonthFilter] = useState<{ year: number; month: number } | null>(selectedMonthFilter);
  const selectedFilterYear = useMemo(() => currentYear - parseInt(yearOffset || "0", 10), [currentYear, yearOffset]);
  const selectedMonthLabel = useMemo(() => {
    if (!activeMonthFilter) return "";
    const d = new Date(activeMonthFilter.year, activeMonthFilter.month - 1, 1);
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
  }, [activeMonthFilter]);
  const selectedYearLabel = useMemo(() => String(selectedFilterYear), [selectedFilterYear]);

  useEffect(() => {
    setActiveMonthFilter(selectedMonthFilter);
  }, [selectedMonthFilter]);

  useEffect(() => {
    if (!selectedYear) return;
    const offset = currentYear - selectedYear;
    if (offset === 0 || offset === 1) setYearOffset(String(offset));
  }, [selectedYear, currentYear]);

  const donationsForSelectedYear = useMemo(
    () =>
      donations
        .filter((d) => DateHelper.toDate(d.donationDate).getFullYear() === selectedFilterYear)
        .sort((a, b) => getPaymentTimestamp(b) - getPaymentTimestamp(a)),
    [donations, selectedFilterYear]
  );

  const filteredDonations = useMemo(() => {
    if (activeMonthFilter) {
      return donationsForSelectedYear
        .filter((d) => {
          const dt = DateHelper.toDate(d.donationDate);
          return dt.getMonth() === activeMonthFilter.month - 1;
        })
        .sort((a, b) => getPaymentTimestamp(b) - getPaymentTimestamp(a));
    }

    const now = new Date();
    const rangeEnd = selectedFilterYear < now.getFullYear()
      ? new Date(selectedFilterYear, 11, 31, 23, 59, 59, 999)
      : now;
    let cutoffDate: Date | null = null;

    switch (selectedPeriod) {
      case "30d":
        cutoffDate = new Date(rangeEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        cutoffDate = new Date(rangeEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "ytd":
        cutoffDate = new Date(selectedFilterYear, 0, 1);
        break;
      default:
        return donationsForSelectedYear;
    }

    return donationsForSelectedYear.filter((d) => {
      const donationDate = DateHelper.toDate(d.donationDate);
      return cutoffDate ? donationDate >= cutoffDate && donationDate <= rangeEnd : donationDate <= rangeEnd;
    }).sort((a, b) => getPaymentTimestamp(b) - getPaymentTimestamp(a));
  }, [donationsForSelectedYear, selectedPeriod, activeMonthFilter, selectedFilterYear]);

  const givingStats = useMemo(() => {
    const total = filteredDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
    return { total };
  }, [filteredDonations]);
  const isYearEmpty = !activeMonthFilter && donationsForSelectedYear.length === 0;

  const getPeriodLabel = (value: string) => periods.find(p => p.value === value)?.label || t("donations.totalThisYear");

  const handleManageRecurring = (item: SubscriptionInterface) => {
    setSelectedRecurring(item);
    const currentPaymentMethod = item?.default_payment_method || item?.default_source || null;
    if (currentPaymentMethod) {
      const methodExists = paymentMethods.some(method => method.id === currentPaymentMethod);
      if (methodExists) setSelectedMethod(currentPaymentMethod);
      else setSelectedMethod(paymentMethods?.length > 0 ? paymentMethods[0]?.id : null);
    } else setSelectedMethod(paymentMethods?.length > 0 ? paymentMethods[0]?.id : null);

    if (item?.plan) {
      const keyName = DonationHelper.getIntervalKeyName(
        item?.plan?.interval_count || 1,
        item?.plan?.interval || "month"
      );
      const intervalExists = intervalTypes.some(interval => interval.value === keyName);

      if (intervalExists) {
        setSelectedInterval(keyName);
        setIntervalValue(keyName);
      } else {
        setSelectedInterval("one_week");
        setIntervalValue("one_week");
      }
    } else {
      setSelectedInterval("one_week");
      setIntervalValue("one_week");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return colors.success;
      case "pending": return colors.warning;
      case "failed": return colors.error;
      default: return colors.disabled;
    }
  };

  const getPaymentMethod = (sub: SubscriptionInterface) => {
    const pm = paymentMethods.find((pm: StripePaymentMethod) => pm.id === (sub.default_payment_method || sub.default_source));
    if (!pm) return <Text style={{ color: colors.error }}>{t("donations.notFound")}</Text>;
    return `${pm.name} ****${pm.last4 || ""}`;
  };

  const handleDelete = async () => {
    if (!selectedRecurring) {
      Alert.alert(t("common.error"), t("donations.failed"));
      return;
    }

    Alert.alert(
      t("common.alert"),
      t("donations.failed"),
      [
        { text: t("common.cancel"), style: "cancel" }, {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              setLoadingAction("delete");
              if (!selectedRecurring) return;
              const promises = [];
              promises.push(ApiHelper.delete("/subscriptions/" + selectedRecurring.id, "GivingApi"));
              promises.push(ApiHelper.delete("/subscriptionfunds/subscription/" + selectedRecurring.id, "GivingApi"));
              await Promise.all(promises);

              setSelectedRecurring(null);

              Alert.alert(t("donations.thankYou"), t("donations.thankYou"));
              loadData();
            } catch (error) {
              Alert.alert(t("common.error"), t("donations.failed"));
            } finally {
              setLoadingAction(null);
            }
          }
        }
      ]
    );
  };

  // Save function implementation (adapted from web version)
  const handleSave = async () => {
    if (!selectedRecurring) {
      Alert.alert(t("common.error"), t("donations.failed"));
      return;
    }

    try {
      setLoadingAction("save");
      const sub = { ...selectedRecurring } as SubscriptionInterface;
      const pmFound = paymentMethods.find((pm: StripePaymentMethod) => pm.id === selectedMethod);
      if (!pmFound) {
        const pm = paymentMethods[0];
        if (pm) {
          sub.default_payment_method = pm.type === "card" ? (pm.id || "") : "";
          sub.default_source = pm.type === "bank" ? (pm.id || "") : "";
        }
      }
      await ApiHelper.post("/subscriptions", [sub], "GivingApi");
      setSelectedRecurring(null);

      Alert.alert(t("donations.thankYou"), t("donations.thankYou"));
      loadData();
    } catch (error) {
      Alert.alert(t("common.error"), t("donations.failed"));
    } finally {
      setLoadingAction(null);
    }
  };

  const renderTransactionItem = ({ item }: { item: DonationImpact }) => (
    <TouchableOpacity
      // onPress={() => setSelectedTransaction(item)}
      style={styles.transactionItem}>
      <View style={styles.transactionDetails}>
        <Text style={[styles.transactionFund, givingListRowTitle, { color: colors.text }]}>
          {(() => {
            const rawName = (item.fund?.name || "").trim();
            const isUnknownName = !rawName || rawName.toLowerCase() === "unknown" || rawName.toLowerCase() === "unkown";
            if (!isUnknownName) return rawName;
            const fundId = (item.fund?.id || "").trim().toLowerCase();
            return FALLBACK_FUND_NAMES[fundId] || t("donations.fund");
          })()}
        </Text>
        <Text style={[styles.transactionDate, givingBody, { color: colors.disabled }]}>
          {DateHelper.prettyDate(DateHelper.toDate(item.donationDate))}
        </Text>
        <Text style={[styles.transactionMeta, givingBody, { color: colors.disabled }]}>
          {item.method}{item.methodDetails ? ` • ${item.methodDetails}` : ""}
        </Text>
      </View>

      <View style={styles.transactionAmount}>
        <Text style={[styles.amountText, givingAmountEmphasis, { color: colors.text }]}>
          {CurrencyHelper.formatCurrency(item.amount)}
        </Text>
        {/* <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} /> */}
      </View>
    </TouchableOpacity>
  );

  const renderRecurringItem = ({ item }: { item: any }) => {
    const interval = `${item.plan?.interval_count || 1} ${item.plan?.interval || "month"}${(item.plan?.interval_count || 1) > 1 ? "s" : ""}`;
    const total = (item.plan?.amount || 0) / 100;
    const startDate = DateHelper.prettyDate(new Date(item.billing_cycle_anchor * 1000));

    return (
      <Card style={[styles.card, styles.surfaceCard, { backgroundColor: "#1A1A1A", borderColor: "rgba(255,255,255,0.08)" }]}>
        <Card.Content style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: colors.iconBackground }]}>
            <MaterialIcons name="autorenew" size={24} color={colors.text} />
          </View>

          <View style={styles.detailsWrap}>
            {item.funds?.map((fund: any) => (
              <Text key={fund.id} style={styles.fundText}>
                {fund.name} — {CurrencyHelper.formatCurrency(fund.amount)}
              </Text>
            ))}
            <Text style={[styles.recurringAmount, { color: colors.text }]}>{t("donations.totalLabel")}: {CurrencyHelper.formatCurrency(total)}</Text>
            <Text style={[styles.metaText, { color: colors.disabled }]}>{t("donations.every")} {interval}</Text>
            <Text style={[styles.metaText, { color: colors.disabled }]}>{getPaymentMethod(item)}</Text>
            <Text style={[styles.recurringNext, { color: colors.disabled }]}>{startDate}</Text>
          </View>
          <Button
            mode="outlined"
            compact
            onPress={() => handleManageRecurring(item)}
            style={[styles.manageButton, { borderColor: colors.text }]}
          >
            {t("donations.manage")}
          </Button>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={yearOffset}
        onValueChange={(v) => {
          setYearOffset(v);
          setActiveMonthFilter(null);
        }}
        style={styles.yearTabs}
        theme={{
          colors: {
            secondaryContainer: colors.text,
            onSecondaryContainer: "#1A1A1A",
            outline: "rgba(255,255,255,0.35)"
          }
        }}
        buttons={[
          {
            value: "0",
            label: `${currentYear}`,
            labelStyle: {
              color: yearOffset === "0" ? "#0F1118" : "#FFFFFF",
              fontWeight: "700"
            }
          },
          {
            value: "1",
            label: `${currentYear - 1}`,
            labelStyle: {
              color: yearOffset === "1" ? "#0F1118" : "#FFFFFF",
              fontWeight: "700"
            }
          }
        ]}
      />

      {/* Summary Stats */}
      <Card style={[styles.summaryCard, styles.surfaceCard, { shadowColor: colors.shadowBlack, backgroundColor: "#1A1A1A", borderColor: "rgba(255,255,255,0.08)" }]}>
        <Card.Content>
          <View style={styles.summaryHeader}>
            <Text variant="titleMedium" style={[styles.summaryTitle, givingSectionHeading, { color: colors.text }]}>
              {t("donations.giving")}
            </Text>
            <View style={styles.summaryHeaderActions}>
              {activeMonthFilter ? (
                <TouchableOpacity
                  style={[styles.monthFilterChip, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" }]}
                  onPress={() => setActiveMonthFilter(null)}
                  accessibilityRole="button"
                  accessibilityLabel={t("donations.clearMonthFilter", "Clear month filter")}
                >
                  <Text style={[styles.monthFilterText, givingCaption, { color: colors.text, fontWeight: "600" }]}>{selectedMonthLabel}</Text>
                  <MaterialIcons name="close" size={14} color={colors.disabled} />
                </TouchableOpacity>
              ) : null}
              <Menu
                visible={showPeriodMenu}
                onDismiss={() => setShowPeriodMenu(false)}
                anchor={
                  <TouchableOpacity style={[styles.periodSelector, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" }]} onPress={() => setShowPeriodMenu(true)}>
                    <Text variant="bodyMedium" style={[styles.periodText, { color: colors.text }]}>
                      {getPeriodLabel(selectedPeriod)}
                    </Text>
                    <MaterialIcons name="expand-more" size={20} color={colors.disabled} />
                  </TouchableOpacity>
                }>
                {periods.map(period => (
                  <Menu.Item
                    key={period.value}
                    onPress={() => {
                      setSelectedPeriod(period.value);
                      setShowPeriodMenu(false);
                    }}
                    title={period.label}
                  />
                ))}
              </Menu>
            </View>
          </View>

          {donationsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.text} />
              <Text variant="bodyMedium" style={[styles.loadingText, { color: colors.disabled }]}>
                {t("common.loading")}
              </Text>
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text variant="displaySmall" style={[styles.statValue, { color: colors.text }]}>
                  {CurrencyHelper.formatCurrency(givingStats.total)}
                </Text>
                <Text variant="bodyMedium" style={[styles.statLabel, { color: colors.disabled }]}>
                  {activeMonthFilter ? selectedMonthLabel : getPeriodLabel(selectedPeriod)}
                </Text>
                {activeMonthFilter && !filteredDonations.length ? (
                  <Text variant="bodySmall" style={[styles.monthEmptyHint, { color: colors.disabled }]}>
                    {t("donations.noTransactionsForMonth", "No transactions found for this month.")}
                  </Text>
                ) : null}
                {isYearEmpty ? (
                  <Text variant="bodySmall" style={[styles.monthEmptyHint, { color: colors.disabled }]}>
                    {t("donations.noTransactionsForYear", `No transactions found for ${selectedYearLabel}.`)}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Transaction History */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, givingSectionHeading, { color: colors.text }]}>
          {t("donations.recentActivity")}
        </Text>
        <Card style={[styles.transactionsCard, styles.surfaceCard, { backgroundColor: "#1A1A1A", borderColor: "rgba(255,255,255,0.08)" }]}>
          {donationsLoading ? (
            <Card.Content style={styles.loadingCardContent}>
              <ActivityIndicator size="small" color={colors.text} />
              <Text variant="bodyMedium" style={[styles.loadingText, { color: colors.disabled }]}>
                {t("common.loading")}
              </Text>
            </Card.Content>
          ) : (
            <FlatList
              data={filteredDonations.slice(0, 5)}
              renderItem={renderTransactionItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <Divider style={styles.divider} />}
              ListEmptyComponent={!donationsLoading ? (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyTitle, givingSectionHeading, { color: colors.text }]}>
                    {activeMonthFilter
                      ? t("donations.noTransactionsForMonth", "No transactions found for this month.")
                      : isYearEmpty
                        ? t("donations.noTransactionsForYear", `No transactions found for ${selectedYearLabel}.`)
                        : t("donations.noRecentTransactions")}
                  </Text>
                  <Text style={[styles.emptySubtitle, givingCaption, { color: colors.disabled }]}>
                    {activeMonthFilter ? selectedMonthLabel : isYearEmpty ? selectedYearLabel : t("donations.recentActivity")}
                  </Text>
                </View>
              ) : null}
            />
          )}
        </Card>
        <View style={styles.recentActivityHintRow}>
          <MaterialIcons name="info-outline" size={16} color={colors.disabled} />
          <Text variant="bodySmall" style={[styles.recentActivityHint, givingCaption, { color: colors.disabled }]}>
            {t("donations.recentActivityHint", "To view more giving activities, print your statement.")}
          </Text>
        </View>
      </View>

      {/* Utilities: statements and recurring */}
      <View style={[styles.section, styles.utilitySection]}>
        <View style={styles.sectionShell}>
          <PrintStatementButton yearOffset={yearOffset} />
        </View>

        {recurringLoading ? (
          <Card style={[styles.loadingCard, styles.surfaceCard, { backgroundColor: "#1A1A1A", borderColor: "rgba(255,255,255,0.08)" }]}>
            <Card.Content style={styles.loadingCardContent}>
              <ActivityIndicator size="small" color={colors.text} />
              <Text variant="bodyMedium" style={[styles.loadingText, { color: colors.disabled }]}>
                {t("common.loading")}
              </Text>
            </Card.Content>
          </Card>
        ) : subscriptions.length > 0 ? (
          <View>
            <Text variant="labelLarge" style={[styles.subSectionTitle, givingCaption, { color: colors.disabled, fontWeight: "600" }]}>
              {t("donations.recurring")}
            </Text>
            <FlatList
              data={subscriptions}
              renderItem={renderRecurringItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={!recurringLoading ? (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyTitle, givingSectionHeading, { color: colors.text }]}>{t("donations.noActiveRecurringGifts")}</Text>
                </View>
              ) : null}
            />
          </View>
        ) : null}
      </View>

      {/* Transaction Detail Modal */}
      <Modal visible={selectedTransaction !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedTransaction(null)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.modalOverlay }]}>
          <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalContent}>
            <Card style={[styles.detailModal, { shadowColor: colors.shadowBlack, backgroundColor: colors.card }]}>
              <Card.Content>
                <View style={styles.detailHeader}>
                  <Text variant="titleMedium" style={[styles.detailTitle, givingSectionHeading, { color: colors.text }]}>
                    {t("donations.history")}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedTransaction(null)}>
                    <MaterialIcons name="close" size={24} color={colors.disabled} />
                  </TouchableOpacity>
                </View>

                {selectedTransaction && (
                  <>
                    <View style={styles.detailAmount}>
                      <Text variant="displayMedium" style={[styles.detailAmountText, { color: colors.text }]}>
                        {CurrencyHelper.formatCurrency(selectedTransaction.amount)}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: colors.iconBackground }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedTransaction.status) }]} />
                        <Text variant="labelMedium" style={[styles.statusText, { color: colors.text }]}>
                          {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.detailBreakdown, { backgroundColor: colors.iconBackground }]}>
                      <View style={styles.detailRow}>
                        <Text variant="bodyMedium" style={[styles.detailLabel, { color: colors.disabled }]}>
                          {t("donations.giftAmount")}
                        </Text>
                        <Text variant="bodyMedium" style={[styles.detailValue, { color: colors.text }]}>
                          {CurrencyHelper.formatCurrency(selectedTransaction.amount - selectedTransaction.fees)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text variant="bodyMedium" style={[styles.detailLabel, { color: colors.disabled }]}>
                          {t("donations.processingFee")}
                        </Text>
                        <Text variant="bodyMedium" style={[styles.detailValue, { color: colors.text }]}>
                          {CurrencyHelper.formatCurrency(selectedTransaction.fees)}
                        </Text>
                      </View>
                      <Divider style={styles.detailDivider} />
                      <View style={styles.detailRow}>
                        <Text variant="titleMedium" style={[styles.detailTotalLabel, givingSectionHeading, { color: colors.text }]}>
                          {t("donations.totalLabel")}
                        </Text>
                        <Text variant="titleMedium" style={[styles.detailTotalValue, givingSectionHeading, { color: colors.text }]}>
                          {CurrencyHelper.formatCurrency(selectedTransaction.amount)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailInfo}>
                      <View style={styles.detailRow}>
                        <Text variant="bodyMedium" style={[styles.detailLabel, { color: colors.disabled }]}>
                          {t("donations.fund")}
                        </Text>
                        <Text variant="bodyMedium" style={[styles.detailValue, { color: colors.text }]}>
                          {selectedTransaction.fund}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text variant="bodyMedium" style={[styles.detailLabel, { color: colors.disabled }]}>
                          {t("donations.date")}
                        </Text>
                        <Text variant="bodyMedium" style={[styles.detailValue, { color: colors.text }]}>
                          {DateHelper.prettyDate(selectedTransaction.date)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text variant="bodyMedium" style={[styles.detailLabel, { color: colors.disabled }]}>
                          {t("donations.method")}
                        </Text>
                        <Text variant="bodyMedium" style={[styles.detailValue, { color: colors.text }]}>
                          {selectedTransaction.method}
                        </Text>
                      </View>
                      {selectedTransaction.recurring && (
                        <View style={styles.detailRow}>
                          <Text variant="bodyMedium" style={[styles.detailLabel, { color: colors.disabled }]}>
                            {t("donations.frequency")}
                          </Text>
                          <Text variant="bodyMedium" style={[styles.detailValue, { color: colors.text }]}>
                            {selectedTransaction.frequency}
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </Card.Content>
            </Card>
          </ScrollView>
        </View>
      </Modal>

      {/* Recurring Donation Management Modal */}
      <Modal transparent={true} visible={selectedRecurring !== null} animationType="slide" onRequestClose={() => setSelectedRecurring(null)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.modalOverlay }]}>
          <Card style={[styles.detailModal, { shadowColor: colors.shadowBlack, backgroundColor: colors.card }]}>
            <Card.Content>
              <View style={styles.detailHeader}>
                <Text variant="titleMedium" style={[styles.detailTitle, givingSectionHeading, { color: colors.text }]}>
                  {t("donations.manage")}
                </Text>
                <TouchableOpacity onPress={() => setSelectedRecurring(null)}>
                  <MaterialIcons name="close" size={24} color={colors.disabled} />
                </TouchableOpacity>
              </View>

              {selectedRecurring && (
                <>
                  <View style={styles.recurringInfo}>
                    <Text variant="bodyMedium" style={[styles.detailLabel, { color: colors.disabled }]}>
                      {t("donations.selectPaymentMethod")}
                    </Text>
                    <DropDownPicker
                      listMode="FLATLIST"
                      open={isPaymentMethodDropDownOpen}
                      value={selectedMethod}
                      items={paymentMethodItems}
                      setOpen={setIsPaymentMethodDropDownOpen}
                      setValue={setSelectedMethod}
                      setItems={setPaymentMethodItems}
                      onChangeValue={(value) => {
                        handlePaymentMethodChange(value as string);
                      }}
                      containerStyle={{ marginTop: DimensionHelper.wp(1) }}
                      style={{ borderColor: colors.borderLight }}
                      labelStyle={globalStyles.labelStyle}
                      dropDownContainerStyle={[styles.dropdownStyle, { backgroundColor: colors.card, borderColor: colors.borderLight, shadowColor: colors.shadowBlack }]}
                      scrollViewProps={{ scrollEnabled: true }}
                      dropDownDirection="AUTO"
                      zIndex={3000}
                      zIndexInverse={1000}
                    />
                    <Text variant="bodyMedium" style={[styles.detailLabel, { color: colors.disabled }]}>
                      {t("donations.selectInterval")}
                    </Text>
                    <DropDownPicker
                      listMode="FLATLIST"
                      open={intervalOpen}
                      value={intervalValue}
                      items={intervalItems}
                      setOpen={setIntervalOpen}
                      setValue={setIntervalValue}
                      setItems={setIntervalItems}
                      onChangeValue={(v) => {
                        if (typeof v === "string") {
                          setSelectedInterval(v);
                          setIntervalValue(v);
                          if (selectedRecurring?.plan) {
                            const inter = DonationHelper.getInterval(v);
                            const updated = { ...selectedRecurring };
                            updated.plan.interval_count = inter.interval_count;
                            updated.plan.interval = inter.interval;
                            setSelectedRecurring(updated);
                          }
                        }
                      }}
                      containerStyle={{ marginTop: DimensionHelper.wp(1) }}
                      style={{ borderColor: colors.borderLight }}
                      labelStyle={globalStyles.labelStyle}
                      dropDownContainerStyle={[styles.dropdownStyle, { backgroundColor: colors.card, borderColor: colors.borderLight, shadowColor: colors.shadowBlack }]}
                      scrollViewProps={{ scrollEnabled: true }}
                      dropDownDirection="AUTO"
                      zIndex={2000}
                      zIndexInverse={2000}
                    />
                  </View>

                  <View style={styles.managementActions}>
                    <Button
                      mode="text"
                      style={styles.stopButton}
                      textColor={colors.warning}
                      onPress={() => setSelectedRecurring(null)}
                    >
                      {t("common.cancel").toUpperCase()}
                    </Button>
                    <Button
                      mode="outlined"
                      style={[styles.stopButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.error + "80" }]}
                      textColor={colors.error}
                      onPress={handleDelete}
                      loading={loadingAction === "delete"}
                    >
                      {loadingAction === "delete" ? t("common.loading").toUpperCase() : t("common.delete").toUpperCase()}
                    </Button>
                    <Button
                      mode="contained"
                      style={styles.stopButton}
                      buttonColor={colors.text}
                      textColor="#1A1A1A"
                      onPress={handleSave}
                      loading={loadingAction === "save"}
                    >
                      {loadingAction === "save" ? t("common.loading").toUpperCase() : t("common.save").toUpperCase()}
                    </Button>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>
        </View>
      </Modal >
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16
  },
  yearTabs: { marginBottom: 2 },
  surfaceCard: {
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3
  },

  // Summary Card
  summaryCard: {
    borderRadius: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  summaryHeaderActions: {
    flexDirection: "row",
    alignItems: "center"
  },
  summaryTitle: { fontWeight: "700" },
  monthFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8
  },
  monthFilterText: { marginRight: 6 },
  periodSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1
  },
  periodText: {
    fontWeight: "600",
    marginRight: 4
  },
  statsGrid: { gap: 16 },
  statItem: { alignItems: "center" },
  statValue: {
    fontWeight: "800",
    marginBottom: 4
  },
  statLabel: { fontWeight: "500" },
  monthEmptyHint: {
    marginTop: 6,
    textAlign: "center"
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  miniStat: {
    alignItems: "center",
    flex: 1
  },
  miniStatValue: {
    fontWeight: "700",
    marginBottom: 2
  },
  miniStatLabel: { textAlign: "center" },

  // Section
  section: { gap: 12 },
  utilitySection: { marginTop: 4 },
  sectionShell: { borderRadius: 16 },
  sectionTitle: {
    fontWeight: "700",
    marginLeft: 4
  },
  subSectionTitle: {
    marginLeft: 4,
    marginBottom: 8,
    fontWeight: "600"
  },

  // Recurring Cards
  recurringCard: {
    borderRadius: 16,
    elevation: 2,
    marginBottom: 8
  },
  recurringContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4
  },
  recurringIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16
  },
  recurringDetails: { flex: 1 },
  recurringFund: {
    fontWeight: "600",
    marginBottom: 2
  },
  recurringAmount: {
    fontWeight: "600",
    marginBottom: 2
  },
  recurringNext: {},
  manageButton: {},

  // Transactions
  transactionsCard: {
    borderRadius: 16,
    elevation: 2,
    overflow: "hidden"
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16
  },
  transactionDetails: { flex: 1 },
  transactionFund: { marginBottom: 2 },
  transactionDate: { marginBottom: 2 },
  transactionMeta: {},
  recurringChip: {
    alignSelf: "flex-start",
    height: 24
  },
  recurringChipText: { fontSize: 10 },
  transactionAmount: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: 12
  },
  amountText: { marginTop: 2 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  divider: { marginHorizontal: 16 },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  modalScrollView: { flex: 1 },
  modalContent: {
    padding: 16,
    paddingTop: 50 // Safe area
  },
  detailModal: {
    borderRadius: 20,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  detailTitle: { fontWeight: "700" },
  detailAmount: {
    alignItems: "center",
    marginBottom: 24
  },
  detailAmountText: {
    fontWeight: "800",
    marginBottom: 8
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: { marginLeft: 6 },
  detailBreakdown: {
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    paddingHorizontal: 16
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  detailLabel: {},
  detailValue: { fontWeight: "500" },
  detailDivider: { marginVertical: 8 },
  detailTotalLabel: { fontWeight: "700" },
  detailTotalValue: { fontWeight: "700" },
  detailInfo: { gap: 8 },

  // Recurring Management
  recurringFreqText: {
    fontWeight: "600",
    textAlign: "center"
  },
  recurringInfo: {
    marginBottom: 24,
    gap: 8
  },
  managementActions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  stopButton: {
    borderRadius: 8,
    paddingVertical: 2
  },

  // Loading States
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12
  },
  loadingCard: {
    borderRadius: 16,
    elevation: 2
  },
  loadingCardContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 12
  },
  loadingText: { textAlign: "center" },

  // Login Prompt
  loginPromptCard: {
    borderRadius: 16,
    elevation: 2
  },
  loginPromptContent: {
    alignItems: "center",
    padding: 32
  },
  loginPromptIcon: { marginBottom: 16 },
  loginPromptTitle: {
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8
  },
  loginPromptSubtitle: {
    textAlign: "center",
    lineHeight: 20
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center"
  },
  emptyTitle: { marginBottom: 6 },
  emptySubtitle: { textAlign: "center" },
  recentActivityHint: {
    marginLeft: 6,
    lineHeight: 18
  },
  recentActivityHintRow: {
    marginTop: 6,
    marginLeft: 4,
    flexDirection: "row",
    alignItems: "center"
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 40 / 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  detailsWrap: { flex: 1 },
  fundText: {
    fontSize: 15,
    fontWeight: "500"
  },
  totalText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4
  },
  metaText: { fontSize: 14 },
  emptyText: {},
  dropdownStyle: {
    overflow: "hidden",
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  }
});
