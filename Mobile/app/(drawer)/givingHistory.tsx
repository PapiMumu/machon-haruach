import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { EnhancedGivingHistory } from "../../src/components/donations/LazyDonationComponents";
import { useDonationTabData } from "../../src/hooks/useDonationTabData";
import { useLocalSearchParams } from "expo-router";

export default function GivingHistoryScreen() {
  const { customerId, paymentMethods, donationImpactData, donationImpactLoading } = useDonationTabData();
  const params = useLocalSearchParams<{ year?: string; month?: string }>();
  const selectedYear = params.year ? Number(params.year) : undefined;
  const selectedMonth = params.month ? Number(params.month) : undefined;
  const validSelectedYear = selectedYear && Number.isFinite(selectedYear) ? selectedYear : undefined;
  const validSelectedMonth = selectedMonth && selectedMonth >= 1 && selectedMonth <= 12 ? selectedMonth : undefined;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <EnhancedGivingHistory
          customerId={customerId}
          paymentMethods={paymentMethods || []}
          donationImpactData={donationImpactData || []}
          donationImpactLoading={donationImpactLoading}
          selectedYear={validSelectedYear}
          selectedMonth={validSelectedMonth}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  scroll: { padding: 16, paddingBottom: 32 }
});
