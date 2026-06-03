import React, { useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { GivingOverview } from "../../src/components/donations/sections/exports";
import { useDonationTabData } from "../../src/hooks/useDonationTabData";
import { setPendingRepeatDonation } from "../../src/helpers/DonationNavBridge";

export default function GivingOverviewScreen() {
  const { givingStats, givingImpact, givingImpactByFund, donationImpactData } = useDonationTabData();

  const goGiveWithRepeat = useCallback(() => {
    if (!givingStats.lastGift || !donationImpactData?.[0]) return;
    setPendingRepeatDonation({
      amount: String(donationImpactData[0]?.amount),
      fundId: donationImpactData[0]?.fund?.id
    });
    router.replace("/(drawer)/(tabs)/donation");
  }, [givingStats.lastGift, donationImpactData]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GivingOverview
          givingStats={givingStats}
          givingImpact={givingImpact}
          givingImpactByFund={givingImpactByFund}
          onDonatePress={goGiveWithRepeat}
          onHistoryPress={() => router.push("/(drawer)/givingHistory")}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  scroll: { padding: 16, paddingBottom: 32 }
});
