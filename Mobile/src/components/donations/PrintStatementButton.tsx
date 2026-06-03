import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, Image, ActivityIndicator } from "react-native";
import { Button } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Print from "expo-print";
import { ApiHelper, DonationInterface, FundDonationInterface, FundInterface, DateHelper } from "@machonharuach/helpers";
import { useTranslation } from "react-i18next";
import { useCurrentUserChurch } from "../../stores/useUserStore";
import { generateStatementHtml } from "./DonationStatementHtml";
import { useThemeColors } from "../../theme";

interface Props {
  yearOffset: string;
}

export function PrintStatementButton({ yearOffset }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const currentUserChurch = useCurrentUserChurch();
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const statementLogoUri = Image.resolveAssetSource(require("../../assets/images/gnw_logo-gold_512.png")).uri;

  const handlePrint = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 0));
    try {
      const year = currentYear - parseInt(yearOffset);
      const [funds, fundDonations, allDonations] = await Promise.all([
        ApiHelper.get("/funds", "GivingApi") as Promise<FundInterface[]>,
        ApiHelper.get("/fundDonations/my", "GivingApi") as Promise<FundDonationInterface[]>,
        ApiHelper.get("/donations/my", "GivingApi") as Promise<DonationInterface[]>
      ]);

      const donations = allDonations.filter(d =>
        DateHelper.toDate(d.donationDate).getFullYear() === year);

      const html = generateStatementHtml({
        year,
        person: currentUserChurch?.person as any,
        church: currentUserChurch?.church,
        funds,
        fundDonations,
        donations,
        logoUri: statementLogoUri
      });

      await Print.printAsync({ html });
    } catch (err) {
      Alert.alert(t("common.error"), t("donations.statementFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      mode="contained"
      style={[styles.button, { backgroundColor: colors.text }]}
      textColor="#1A1A1A"
      labelStyle={styles.buttonLabel}
      onPress={handlePrint}
      disabled={loading}
    >
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator size="small" color="#1A1A1A" style={styles.buttonAdornment} />
        ) : (
          <MaterialIcons name="print" size={18} color="#1A1A1A" style={styles.buttonAdornment} />
        )}
        <Text style={styles.buttonText}>{loading ? "Processing..." : t("donations.printStatement", "Print Statement")}</Text>
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    paddingVertical: 10,
    elevation: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  buttonAdornment: { marginRight: 8 },
  buttonText: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
    color: "#1A1A1A"
  }
});
