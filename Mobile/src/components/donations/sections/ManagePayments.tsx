import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, Card } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { PaymentMethods } from "../LazyDonationComponents";
import { StripePaymentMethod } from "../../../interfaces";
import { UserInterface } from "../../../interfaces";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "../../../theme";
import { givingSectionHeading } from "../givingTypography";

interface ManagePaymentsProps {
  person: UserInterface | undefined;
  customerId: string;
  paymentMethods: StripePaymentMethod[];
  isLoading: boolean;
  publishKey: string;
  stripeGatewayId?: string;
  loadData: () => Promise<void>;
  /** When true, do not show the sign-in card (caller assumes an authenticated user, e.g. Add Payment Method). */
  hideSignInPrompt?: boolean;
}

export const ManagePayments: React.FC<ManagePaymentsProps> = ({
  person,
  customerId,
  paymentMethods,
  isLoading,
  publishKey,
  stripeGatewayId,
  loadData,
  hideSignInPrompt
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  if (!person?.id && !hideSignInPrompt) {
    return (
      <Card style={[styles.loginPromptCard, { shadowColor: colors.shadowBlack }]}>
        <Card.Content style={styles.loginPromptContent}>
          <View style={styles.loginPromptIconWrap}>
            <MaterialIcons name="login" size={30} color={colors.white} />
          </View>
          <Text variant="titleMedium" style={[styles.loginPromptTitle, givingSectionHeading]}>
            {t("auth.signIn")}
          </Text>
          <Text variant="bodyMedium" style={styles.loginPromptSubtitle}>
            {t("donations.manage")}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <PaymentMethods
      customerId={customerId}
      paymentMethods={paymentMethods}
      updatedFunction={loadData}
      isLoading={isLoading}
      publishKey={publishKey}
      stripeGatewayId={stripeGatewayId}
    />
  );
};

const styles = StyleSheet.create({
  loginPromptCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1A1A1A",
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3
  },
  loginPromptContent: {
    alignItems: "center",
    padding: 32
  },
  loginPromptIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 14
  },
  loginPromptTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8
  },
  loginPromptSubtitle: {
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    lineHeight: 20
  }
});
