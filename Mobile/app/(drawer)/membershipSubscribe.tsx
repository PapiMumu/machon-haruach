import React, { useCallback, useEffect } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { UserHelper } from "@/helpers/UserHelper";
import { useDonationTabData } from "@/hooks/useDonationTabData";
import { useMembershipSubscriptionSettings } from "@/hooks/useMembershipSubscriptionSettings";
import { useCurrentChurch } from "@/stores/useUserStore";
import { EnhancedDonationForm } from "@/components/donations/LazyDonationComponents";
import { DonationPendingPlaceholder } from "@/components/donations/DonationPendingPlaceholder";

/**
 * App membership checkout — same shell as the Giving tab (black background, scroll, cards).
 * Monthly recurring subscription via the same `/donate/subscribe` flow as Giving (Stripe).
 */
export default function MembershipSubscribe() {
  const currentChurch = useCurrentChurch();
  const churchId = currentChurch?.id || "";
  const { data: subSettings } = useMembershipSubscriptionSettings(churchId);
  const {
    customerId,
    paymentMethods,
    publishKey,
    gatewayData,
    stripeReady,
    refetchPaymentMethods,
    setSelectedRepeatDonation,
    gatewayLoading,
  } = useDonationTabData();

  // Only show placeholder on first load — background refetches must not cause flicker
  const gatewayPending = gatewayLoading;

  useEffect(() => {
    UserHelper.addOpenScreenEvent("Membership Subscribe");
  }, []);

  // Silently refresh payment methods every time this screen gains focus so a
  // newly saved card appears immediately. Only payment methods are refetched —
  // NOT the gateway — to avoid triggering the loading placeholder and flickering.
  useFocusEffect(
    useCallback(() => {
      refetchPaymentMethods();
    }, [refetchPaymentMethods])
  );

  useEffect(() => {
    setSelectedRepeatDonation(null);
  }, [setSelectedRepeatDonation]);

  const suggested = subSettings?.monthlyAmountHint || "";

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {!stripeReady || gatewayPending ? (
            <DonationPendingPlaceholder />
          ) : (
            <EnhancedDonationForm
              variant="membership"
              membershipSuggestedAmount={suggested}
              paymentMethods={paymentMethods}
              customerId={customerId}
              gatewayData={gatewayData}
              publishKey={publishKey}
              updatedFunction={refetchPaymentMethods}
            />
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  content: { flex: 1 },
  scrollView: {
    flex: 1,
    backgroundColor: "#000000"
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32
  },

});
