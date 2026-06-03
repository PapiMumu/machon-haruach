import React, { useCallback, useEffect } from "react";
import { EnhancedDonationForm } from "../../../src/components/donations/LazyDonationComponents";
import { DonationPendingPlaceholder } from "../../../src/components/donations/DonationPendingPlaceholder";
import { UserHelper } from "@/helpers/UserHelper";
import { takePendingRepeatDonation } from "../../../src/helpers/DonationNavBridge";
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native";
import { ScrollView, View, StyleSheet, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/theme";
import { useDonationTabData } from "../../../src/hooks/useDonationTabData";
import { findDrawerNavigation } from "../../../src/helpers/drawerNavigation";
import { restoreDrawerProfileAvatar } from "../../../src/hooks/useRestoreDrawerProfileAvatar";

const Donation = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const { t } = useTranslation();
  const tc = useThemeColors();
  const isFocused = useIsFocused();
  const {
    customerId,
    paymentMethods,
    publishKey,
    gatewayData,
    stripeReady,
    loadData,
    selectedRepeatDonation,
    setSelectedRepeatDonation
  } = useDonationTabData();

  useEffect(() => {
    UserHelper.addOpenScreenEvent("Donation Screen");
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    const pending = takePendingRepeatDonation();
    if (pending) setSelectedRepeatDonation(pending);
  }, [isFocused, setSelectedRepeatDonation]);

  useFocusEffect(
    useCallback(() => {
      const drawerNav = findDrawerNavigation(navigation);
      if (!drawerNav?.setOptions) return;

      drawerNav.setOptions({
        headerLeft: () => <View style={{ width: 56 }} />,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", marginRight: 8 }}>
            <TouchableOpacity
              onPress={() => router.push("/(drawer)/myGiving")}
              accessibilityRole="button"
              accessibilityLabel={t("donations.myGiving")}>
              <MaterialCommunityIcons name="view-dashboard-outline" size={26} color={tc.white} />
            </TouchableOpacity>
          </View>
        )
      });

      return () => {
        restoreDrawerProfileAvatar(navigation);
      };
    }, [navigation, router, t, tc.white])
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {!stripeReady ? (
            <DonationPendingPlaceholder />
          ) : (
            <EnhancedDonationForm
              paymentMethods={paymentMethods}
              customerId={customerId}
              gatewayData={gatewayData}
              publishKey={publishKey}
              updatedFunction={loadData}
              initialDonation={selectedRepeatDonation}
            />
          )}
        </ScrollView>
      </View>
    </View>
  );
};

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
  }
});

export default Donation;
