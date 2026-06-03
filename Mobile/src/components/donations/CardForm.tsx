import { ApiHelper } from "../../../src/helpers";
import { PaymentMethodInterface, StripeCardUpdateInterface, StripePaymentMethod } from "../../../src/interfaces";
import { CardForm as StripeCardForm, CardFormView, useStripe } from "@stripe/stripe-react-native";
import React, { useState } from "react";
import { Alert, View, StyleSheet, TextInput as RNTextInput, Text as RNText } from "react-native";
import { Button } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUserChurch } from "../../stores/useUserStore";
import { useTranslation } from "react-i18next";

interface Props {
  setMode: (mode: "display" | "edit") => void;
  card: StripePaymentMethod;
  customerId: string;
  updatedFunction: () => void;
  handleDelete: () => void;
  /** Stripe gateway row id from `/gateways/churchId/...` — disambiguates when EcoCash/Paynow are also configured. */
  stripeGatewayId?: string;
}

export function CardForm({ setMode, card, customerId, updatedFunction, handleDelete, stripeGatewayId }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cardFormDetails, setCardFormDetails] = useState<CardFormView.Details | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveStep, setSaveStep] = useState<string>("");
  const [month, setMonth] = React.useState<string>(card.exp_month?.toString() || "");
  const [year, setYear] = React.useState<string>(card.exp_year?.toString().slice(-2) || "");
  const { createPaymentMethod } = useStripe();
  const currentUserChurch = useCurrentUserChurch();
  const person = currentUserChurch?.person;
  const [cardHolderName, setCardHolderName] = useState("");

  const handleSave = () => {
    setIsSubmitting(true);
    return card.id ? updateCard() : createCard();
  };

  const createCard = async () => {
    if (!person?.id) {
      Alert.alert(t("donations.error"), t("donations.userInfoNotAvailable"));
      setIsSubmitting(false);
      return;
    }

    if (!cardFormDetails?.complete) {
      Alert.alert(t("donations.error"), t("donations.fillAllRequiredFields"));
      setIsSubmitting(false);
      return;
    }

    const trimmedCardHolderName = cardHolderName.trim();

    setSaveStep(t("donations.savingStepSecuring"));
    const stripePaymentMethod = await createPaymentMethod({
      paymentMethodType: "Card",
      paymentMethodData: {
        billingDetails: { name: trimmedCardHolderName || undefined }
      }
    });

    if (stripePaymentMethod.error) {
      Alert.alert(t("donations.failed"), stripePaymentMethod.error.message);
      setIsSubmitting(false);
      setSaveStep("");
      return;
    }

    setSaveStep(t("donations.savingStepSaving"));
    const paymentMethod: PaymentMethodInterface = {
      id: stripePaymentMethod.paymentMethod.id,
      customerId,
      personId: person.id,
      email: person?.contactInfo?.email,
      name: trimmedCardHolderName || undefined,
      provider: "stripe",
      ...(stripeGatewayId ? { gatewayId: stripeGatewayId } : {})
    };

    let saveError: string | null = null;
    try {
      const result = await ApiHelper.post("/paymentmethods/addcard", paymentMethod, "GivingApi");
      if (result?.error || result?.raw?.message) {
        saveError = result?.error || result?.raw?.message;
      }
    } catch (e: any) {
      let raw = e?.message || "";
      try {
        const parsed = JSON.parse(raw);
        raw = parsed?.error || parsed?.message || raw;
      } catch {}
      saveError = raw || t("donations.failedToCreatePaymentMethod");
    }

    if (saveError) {
      Alert.alert(t("donations.failedToCreatePaymentMethod"), saveError);
      setIsSubmitting(false);
      setSaveStep("");
      return;
    }

    // Invalidate the shared React Query cache so the saved card appears
    // immediately in both addPaymentMethod and membershipSubscribe.
    if (person?.id) {
      await queryClient.invalidateQueries({
        queryKey: ["/paymentmethods/personid/" + person.id, "GivingApi"]
      });
    }

    // Show "Card saved!" briefly, then reset so the user sees the card list.
    setSaveStep(t("donations.savingStepDone"));
    setTimeout(() => {
      setSaveStep("");
      setIsSubmitting(false);
      setMode("display");
    }, 1200);
  };

  const updateCard = async () => {
    if (!person?.id) {
      Alert.alert(t("donations.error"), t("donations.userInfoNotAvailable"));
      setIsSubmitting(false);
      return;
    }

    if (!month || !year) {
      setIsSubmitting(false);
      Alert.alert(t("donations.cannotBeLeftBlank"), t("donations.expirationCannotBeBlank"));
      return;
    }

    const payload: StripeCardUpdateInterface = {
      personId: person.id,
      paymentMethodId: card.id,
      cardData: { card: { exp_month: month, exp_year: year } },
      provider: "stripe",
      ...(stripeGatewayId ? { gatewayId: stripeGatewayId } : {})
    };

    const result = await ApiHelper.post("/paymentmethods/updatecard", payload, "GivingApi");
    if (result?.raw?.message) {
      Alert.alert(t("donations.updateFailed"), result.raw.message);
    } else {
      setMonth("");
      setYear("");
      setMode("display");
      await updatedFunction();
    }
    setIsSubmitting(false);
  };

  const isNewCard = !card.id;

  return (
    <View style={styles.container}>
      {/* Form */}
      <View style={styles.formCard}>
        {isNewCard ? (
          <>
            <RNText style={styles.fieldLabel}>{t("donations.cardHolderName")}</RNText>
            <RNTextInput
              value={cardHolderName}
              onChangeText={setCardHolderName}
              placeholder={t("donations.cardHolderName")}
              placeholderTextColor="#888888"
              style={styles.textField}
              autoCapitalize="words"
              autoCorrect={false}
            />

            {/* Stripe CardForm — renders Card Number, Expiry, and CVC as separate rows */}
            <StripeCardForm
              cardStyle={{
                backgroundColor: "#1A1A1A",
                textColor: "#FFFFFF",
                placeholderColor: "#888888"
              }}
              style={styles.stripeCardForm}
              onFormComplete={(details) => setCardFormDetails(details)}
            />

            <View style={styles.infoRow}>
              <MaterialIcons name="lock" size={13} color="#666666" style={styles.lockIcon} />
              <RNText style={styles.infoText}>{t("donations.creditCardChargeInfo")}</RNText>
            </View>
          </>
        ) : (
          <>
            <RNText style={styles.fieldLabel}>{t("donations.expirationMonth")}</RNText>
            <RNTextInput
              value={month}
              onChangeText={setMonth}
              placeholder="MM"
              placeholderTextColor="#888888"
              keyboardType="number-pad"
              maxLength={2}
              style={styles.textField}
            />
            <RNText style={styles.fieldLabel}>{t("donations.expirationYear")}</RNText>
            <RNTextInput
              value={year}
              onChangeText={setYear}
              placeholder="YY"
              placeholderTextColor="#888888"
              keyboardType="number-pad"
              maxLength={2}
              style={styles.textField}
            />
          </>
        )}
      </View>

      {/* Save progress hint */}
      {!!saveStep && (
        <View style={styles.saveStepRow}>
          <RNText style={styles.saveStepText}>{saveStep}</RNText>
        </View>
      )}

      {/* Buttons */}
      <View style={styles.buttonRow}>
        {card.id && (
          <Button
            mode="outlined"
            onPress={handleDelete}
            style={styles.deleteBtn}
            labelStyle={styles.deleteBtnLabel}
            textColor="#FF6B6B">
            {t("common.delete")}
          </Button>
        )}
        <Button
          mode="outlined"
          onPress={() => setMode("display")}
          style={styles.secondaryBtn}
          labelStyle={styles.secondaryBtnLabel}
          textColor="rgba(255,255,255,0.72)">
          {t("common.cancel")}
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSubmitting}
          disabled={isSubmitting || (isNewCard && !cardFormDetails?.complete)}
          style={styles.primaryBtn}
          labelStyle={styles.primaryBtnLabel}
          buttonColor="#FFFFFF"
          textColor="#1A1A1A">
          {t("common.save")}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)"
  },
  cardGlyph: {
    width: 22,
    height: 16,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.85)",
    overflow: "hidden"
  },
  cardGlyphStripe: {
    width: "100%",
    height: 5,
    backgroundColor: "rgba(0,0,0,0.25)"
  },
  cardGlyphLine: {
    position: "absolute",
    left: 4,
    bottom: 4,
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(0,0,0,0.3)"
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3
  },
  formCard: {
    marginHorizontal: 16,
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 18
  },
  fieldLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "400",
    marginBottom: 8,
    marginLeft: 4
  },
  textField: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 16,
    backgroundColor: "#262626",
    marginBottom: 16
  },
  stripeCardForm: {
    height: 200,
    marginBottom: 14
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 2
  },
  lockIcon: {
    marginTop: 2
  },
  infoText: {
    color: "#666666",
    fontSize: 12,
    lineHeight: 17,
    flex: 1
  },
  saveStepRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: "center"
  },
  saveStepText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontStyle: "italic"
  },
  buttonRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 999,
    borderColor: "rgba(255,255,255,0.2)",
    minHeight: 50,
    justifyContent: "center"
  },
  secondaryBtnLabel: {
    fontWeight: "700",
    fontSize: 14
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 999,
    minHeight: 50,
    justifyContent: "center"
  },
  primaryBtnLabel: {
    fontWeight: "800",
    fontSize: 14
  },
  deleteBtn: {
    flex: 1,
    borderRadius: 999,
    borderColor: "rgba(255,107,107,0.4)",
    minHeight: 50,
    justifyContent: "center"
  },
  deleteBtnLabel: {
    fontWeight: "700",
    fontSize: 14
  }
});
