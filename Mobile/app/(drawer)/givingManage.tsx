import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ManagePayments } from "../../src/components/donations/sections/exports";
import { DonationPendingPlaceholder } from "../../src/components/donations/DonationPendingPlaceholder";
import { useDonationTabData } from "../../src/hooks/useDonationTabData";

export default function GivingManageScreen() {
  const { person, customerId, paymentMethods, publishKey, stripeGateway, stripeReady, areMethodsLoading, loadData } = useDonationTabData();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!stripeReady ? (
          <DonationPendingPlaceholder />
        ) : (
          <ManagePayments
            person={person}
            customerId={customerId}
            paymentMethods={paymentMethods}
            isLoading={areMethodsLoading}
            publishKey={publishKey}
            stripeGatewayId={stripeGateway?.id}
            loadData={loadData}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  scroll: { padding: 16, paddingBottom: 32 }
});
