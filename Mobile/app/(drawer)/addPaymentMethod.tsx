import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput, Image, Modal, Pressable } from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useStripeInit } from "../../src/hooks/useStripeInit";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Button, Card, Text } from "react-native-paper";
import { EnhancedBankForm } from "../../src/components/donations/EnhancedBankForm";
import { CardForm } from "../../src/components/donations/CardForm";
import { useCurrentUserChurch, useUser } from "../../src/stores/useUserStore";
import { useChurchStore } from "../../src/stores/useChurchStore";
import { ErrorHelper } from "../../src/helpers/ErrorHelper";
import { ApiHelper } from "../../src/helpers";
import { getCardLogo } from "../../src/helpers/cardLogos";
import { GatewayData, StripePaymentMethod } from "../../src/interfaces";
import { useTranslation } from "react-i18next";
import PaypalLogo from "../../src/assets/images/card-paypal.svg";
import {
  clearEcoCashPhone,
  clearPaynowSetup,
  loadEcoCashPhone,
  loadPaynowSetup,
  loadPaynowPreferred,
  loadSavedMethodChoice,
  saveEcoCashPhone,
  savePaynowSetup,
  savePaynowPreferred,
  saveSavedMethodChoice,
  SAVED_METHOD_STRIPE_PREFIX
} from "../../src/helpers/givingGatewayPrefs";
import { givingFormLabel, givingListRowTitle, givingModalTitle, givingSectionHeading } from "../../src/components/donations/givingTypography";

function gatewayIsStripe(g: GatewayData) {
  return (g.provider || "").toLowerCase() === "stripe";
}

function gatewayIsEcoCash(g: GatewayData) {
  const p = (g.provider || "").toLowerCase();
  return p === "ecocash" || p.includes("eco");
}

function gatewayIsPaynow(g: GatewayData) {
  return (g.provider || "").toLowerCase() === "paynow";
}

function gatewayIsPaypal(g: GatewayData) {
  return (g.provider || "").toLowerCase() === "paypal";
}

export default function AddPaymentMethodScreen() {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const user = useUser();
  const currentUserChurch = useCurrentUserChurch();
  const loadPersonRecord = useChurchStore(state => state.loadPersonRecord);
  const person = currentUserChurch?.person;
  const churchId = currentUserChurch?.church?.id || "";
  const prefsOwnerId = person?.id || user?.id || "";
  const isSignedIn = !!user;
  const hasChurchSession = !!currentUserChurch?.jwt;
  const identityReady = !!person?.id;
  const [customerId, setCustomerId] = useState("");
  const [publishKey, setPublishKey] = useState("");
  const [pickerMode, setPickerMode] = useState<"picker" | "bank" | "card" | "ecocash" | "paynowCard" | "paynowBank">("picker");

  // Refresh saved payment methods each time this screen gains focus so a
  // newly saved card appears immediately in the saved cards section.
  useFocusEffect(
    useCallback(() => {
      if (person?.id) refetchPaymentMethods();
      return () => {
        // Reset to picker view when navigating away so back-navigation never
        // shows a stale open form.
        setPickerMode("picker");
      };
    }, [person?.id, refetchPaymentMethods])
  );

  /** Donorbox-style accordion: one section open at a time for international checkout. */
  const [expandedAccordion, setExpandedAccordion] = useState<null | "card" | "bank" | "ecocash" | "paypal">(null);
  const [ecoPhoneDraft, setEcoPhoneDraft] = useState("");
  const [paynowPreferred, setPaynowPreferred] = useState(false);
  const [paynowCardName, setPaynowCardName] = useState("");
  const [paynowCardNetwork, setPaynowCardNetwork] = useState<"vmc" | "zimswitch">("vmc");
  const [paynowCardEmail, setPaynowCardEmail] = useState("");
  const [paynowCardPhone, setPaynowCardPhone] = useState("");
  const [paynowBankName, setPaynowBankName] = useState("");
  const [paynowBankAccountName, setPaynowBankAccountName] = useState("");
  const [paynowBankEmail, setPaynowBankEmail] = useState("");
  const [paynowBankPhone, setPaynowBankPhone] = useState("");
  const [paynowPreferredMethod, setPaynowPreferredMethod] = useState<"card" | "bank" | "">("");
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [chosenSavedPaymentKey, setChosenSavedPaymentKey] = useState("");
  const [churchData, setChurchData] = useState<any>(null);
  const [deletingMethodId, setDeletingMethodId] = useState("");

  const normalizeEcoCashPhone = (input: string) => {
    const digitsOnly = (input || "").replace(/\D/g, "");
    // Accept common intl prefix and normalize to local 07XXXXXXXX format.
    if (digitsOnly.startsWith("263") && digitsOnly.length >= 12) {
      const local = "0" + digitsOnly.slice(3);
      return local.slice(0, 10);
    }
    return digitsOnly.slice(0, 10);
  };

  const normalizePhoneDigits = (input: string, maxLength = 15) => (input || "").replace(/\D/g, "").slice(0, maxLength);

  const isValidEcoCashPhone = (phone: string) => /^07\d{8}$/.test(phone);

  const {
    data: gatewayData,
    isLoading: gatewayLoading,
    refetch: refetchGateway
  } = useQuery<GatewayData[]>({
    queryKey: ["/gateways/churchId/" + churchId, "GivingApi"],
    enabled: !!churchId && isFocused,
    placeholderData: [],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  const stripeGateway = useMemo(() => (gatewayData || []).find(gatewayIsStripe) ?? null, [gatewayData]);
  const ecoCashGateway = useMemo(() => (gatewayData || []).find(gatewayIsEcoCash) ?? null, [gatewayData]);
  const paynowGateway = useMemo(() => (gatewayData || []).find(gatewayIsPaynow) ?? null, [gatewayData]);
  const paypalGateway = useMemo(() => (gatewayData || []).find(gatewayIsPaypal) ?? null, [gatewayData]);

  const bankIcon = require("../../src/assets/images/bank.png");
  const ecoCashLogo = require("../../src/assets/images/ecocash-seeklogo.png");
  const paynowLogo = require("../../src/assets/images/paynow.png");
  const zimswitchLogo = require("../../src/assets/images/zimswitch.png");

  const { data: customerData, isLoading: customerLoading } = useQuery<any>({
    queryKey: ["/customers?personId=" + person?.id, "GivingApi"],
    enabled: !!person?.id && isFocused,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  const {
    data: paymentMethodsData,
    isLoading: paymentMethodsLoading,
    refetch: refetchPaymentMethods
  } = useQuery<StripePaymentMethod[]>({
    queryKey: ["/paymentmethods/personid/" + person?.id, "GivingApi"],
    enabled: !!person?.id && isFocused,
    placeholderData: [],
    staleTime: 0,
    gcTime: 10 * 60 * 1000
  });

  const stripePublicKey = stripeGateway?.publicKey || "";
  useStripeInit(stripePublicKey);

  useEffect(() => {
    setPublishKey(stripePublicKey);
  }, [stripePublicKey]);

  // Pre-create Stripe customer as soon as gateway + person are known so that
  // saving a card later only needs a single Stripe API call (attachPaymentMethod).
  useEffect(() => {
    if (!stripeGateway || !person?.id || customerId) return;
    const email = person?.contactInfo?.email || "";
    const name = person?.name?.display || "";
    ApiHelper.post("/paymentmethods/ensure-customer", {
      personId: person.id,
      email,
      name,
      provider: "stripe",
      ...(stripeGateway?.id ? { gatewayId: stripeGateway.id } : {})
    }, "GivingApi")
      .then((res: any) => {
        if (res?.customerId && !customerId) setCustomerId(res.customerId);
      })
      .catch(() => {});
  }, [stripeGateway, person?.id, customerId]);

  useEffect(() => {
    if (paymentMethodsData && Array.isArray(paymentMethodsData) && paymentMethodsData.length > 0) {
      setCustomerId(paymentMethodsData[0]?.customerId || "");
    } else if (customerData && (!paymentMethodsData || paymentMethodsData.length === 0)) {
      const cust = Array.isArray(customerData) ? customerData[0] : customerData;
      setCustomerId(cust?.id || cust?.customerId || "");
    }
  }, [paymentMethodsData, customerData]);

  // When the user returns from the card form back to picker view, refresh
  // saved payment methods so the newly added card appears immediately.
  useEffect(() => {
    if (pickerMode === "picker" && person?.id) {
      refetchPaymentMethods();
    }
  }, [pickerMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (churchId && !churchData) {
      ApiHelper.get("/churches/" + churchId, "MembershipApi")
        .then((data: any) => setChurchData(data))
        .catch((error: any) => {
          ErrorHelper.logError("add-payment-method-load-church", error);
        });
    }
  }, [churchId, churchData]);

  const loadPrefs = useCallback(async () => {
    if (!churchId || !prefsOwnerId) {
      setPrefsLoaded(true);
      return;
    }
    try {
      const [phone, payPref, savedMethodKey] = await Promise.all([
        loadEcoCashPhone(churchId, prefsOwnerId),
        loadPaynowPreferred(churchId, prefsOwnerId),
        loadSavedMethodChoice(churchId, prefsOwnerId)
      ]);
      const setup = await loadPaynowSetup(churchId, prefsOwnerId);
      setEcoPhoneDraft(normalizeEcoCashPhone(phone));
      setPaynowPreferred(payPref);
      setPaynowPreferredMethod((setup.preferredMethod as "card" | "bank" | undefined) || "");
      setPaynowCardNetwork((setup.cardNetwork as "vmc" | "zimswitch" | undefined) || "vmc");
      setPaynowCardName(setup.cardName || "");
      setPaynowCardEmail(setup.cardEmail || "");
      setPaynowCardPhone(normalizePhoneDigits(setup.cardPhone || "", 10));
      setPaynowBankName(setup.bankName || "");
      setPaynowBankAccountName(setup.bankAccountName || "");
      setPaynowBankEmail(setup.bankEmail || "");
      setPaynowBankPhone(normalizePhoneDigits(setup.bankPhone || ""));
      setChosenSavedPaymentKey(savedMethodKey || "");
    } finally {
      setPrefsLoaded(true);
    }
  }, [churchId, prefsOwnerId]);

  useEffect(() => {
    if (isFocused && prefsOwnerId) {
      setPrefsLoaded(false);
      loadPrefs();
    }
  }, [isFocused, prefsOwnerId, loadPrefs]);

  const loadData = async () => {
    try {
      await Promise.all([refetchGateway(), refetchPaymentMethods()]);
    } catch (err: any) {
      Alert.alert(t("donations.failedPaymentMethods"), err?.message ?? "");
      ErrorHelper.logError("add-payment-method-screen-load", err);
    }
  };

  const stripeReady = !!stripeGateway && !!publishKey;
  const churchCountry = String((churchData?.country || (currentUserChurch as any)?.church?.country || "")).trim().toLowerCase();
  const isZimbabweChurch = churchCountry === "zimbabwe" || churchCountry === "zw";
  const isZimbabwePaynowBranch = isZimbabweChurch || (!!paynowGateway && !stripeGateway);
  const hasPaynowCardPrefs = !!(paynowCardName || paynowCardEmail || paynowCardPhone);
  const hasSavedEcoCashPhone = isValidEcoCashPhone(ecoPhoneDraft);
  // "International" card setup in this screen should only represent Stripe card flow.
  // Zimbabwe ZimSwitch / Paynow card is handled in the Zimbabwe section below.
  const cardOptionAvailable = !!stripeGateway;
  const bankOptionAvailable = !isZimbabwePaynowBranch && (!!stripeGateway || !!paynowGateway);
  const bootLoading = gatewayLoading || customerLoading;
  const showAnyGateway = (gatewayData?.length ?? 0) > 0;

  const handleSaveEcoPhone = async () => {
    if (!churchId || !prefsOwnerId) return;
    const normalized = normalizeEcoCashPhone(ecoPhoneDraft);
    if (!normalized) {
      Alert.alert(t("common.alert"), t("donations.ecoCashPhoneRequired"));
      return;
    }
    if (!isValidEcoCashPhone(normalized)) {
      Alert.alert(t("common.alert"), "Use a valid 10-digit EcoCash number (format: 07XXXXXXXX).");
      return;
    }
    try {
      await saveEcoCashPhone(churchId, prefsOwnerId, normalized);
      setEcoPhoneDraft(normalized);
      Alert.alert(t("common.success"), t("donations.ecoCashPhoneSaved"));
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? "");
    }
  };

  const handleRemoveEcoPhone = async () => {
    if (!churchId || !prefsOwnerId) return;
    Alert.alert("Remove EcoCash", "Remove saved EcoCash phone number from this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await clearEcoCashPhone(churchId, prefsOwnerId);
            setEcoPhoneDraft("");
            Alert.alert(t("common.success"), "EcoCash phone removed.");
          } catch (e: any) {
            Alert.alert(t("common.error"), e?.message ?? "");
          }
        }
      }
    ]);
  };

  const handlePaynowToggle = async (value: boolean) => {
    setPaynowPreferred(value);
    if (!churchId || !prefsOwnerId) return;
    try {
      await savePaynowPreferred(churchId, prefsOwnerId, value);
    } catch (e: any) {
      setPaynowPreferred(!value);
      Alert.alert(t("common.error"), e?.message ?? "");
    }
  };

  const handleSavePaynowCard = async () => {
    if (!churchId || !prefsOwnerId) return;
    try {
      await savePaynowSetup(churchId, prefsOwnerId, {
        preferredMethod: "card",
        cardNetwork: paynowCardNetwork,
        cardName: paynowCardName.trim(),
        cardEmail: paynowCardEmail.trim(),
        cardPhone: normalizePhoneDigits(paynowCardPhone.trim(), 10),
        bankName: paynowBankName.trim(),
        bankAccountName: paynowBankAccountName.trim(),
        bankEmail: paynowBankEmail.trim(),
        bankPhone: normalizePhoneDigits(paynowBankPhone.trim())
      });
      setPaynowPreferredMethod("card");
      Alert.alert(t("common.success"), t("donations.paynowInfoSaved"));
      setPickerMode("picker");
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? "");
    }
  };

  const handleRemoveSavedPaynowCard = async () => {
    if (!churchId || !prefsOwnerId) return;
    Alert.alert("Remove saved card", "Remove saved Paynow card information from this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await clearPaynowSetup(churchId, prefsOwnerId);
            setPaynowCardName("");
            setPaynowCardEmail("");
            setPaynowCardPhone("");
            setPaynowPreferredMethod("");
            Alert.alert(t("common.success"), "Saved card information removed.");
          } catch (e: any) {
            Alert.alert(t("common.error"), e?.message ?? "");
          }
        }
      }
    ]);
  };

  const handleSavePaynowBank = async () => {
    if (!churchId || !prefsOwnerId) return;
    try {
      await savePaynowSetup(churchId, prefsOwnerId, {
        preferredMethod: "bank",
        cardNetwork: paynowCardNetwork,
        cardName: paynowCardName.trim(),
        cardEmail: paynowCardEmail.trim(),
        cardPhone: normalizePhoneDigits(paynowCardPhone.trim(), 10),
        bankName: paynowBankName.trim(),
        bankAccountName: paynowBankAccountName.trim(),
        bankEmail: paynowBankEmail.trim(),
        bankPhone: normalizePhoneDigits(paynowBankPhone.trim())
      });
      setPaynowPreferredMethod("bank");
      Alert.alert(t("common.success"), t("donations.paynowInfoSaved"));
      setPickerMode("picker");
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? "");
    }
  };

  const handleRefreshIdentity = async () => {
    try {
      await Promise.all([
        refetchGateway(),
        person?.id ? refetchPaymentMethods() : Promise.resolve(),
        (!person?.id && hasChurchSession) ? loadPersonRecord() : Promise.resolve()
      ]);
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? "");
    }
  };

  const handleDeleteSavedStripeCard = (method: StripePaymentMethod) => {
    const methodCustomerId = method?.customerId || customerId;
    if (!method?.id || !methodCustomerId) {
      Alert.alert(t("donations.deleteMethodError"));
      return;
    }
    Alert.alert(t("donations.deleteMethodConfirmTitle"), t("donations.deleteMethodConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.ok"),
        onPress: async () => {
          try {
            setDeletingMethodId(method.id);
            await ApiHelper.delete(`/paymentmethods/${method.id}/${methodCustomerId}`, "GivingApi");
            await refetchPaymentMethods();
          } catch (err: any) {
            Alert.alert(t("donations.deleteMethodError"));
            ErrorHelper.logError("add-payment-method-delete-card", err);
          } finally {
            setDeletingMethodId("");
          }
        }
      }
    ]);
  };

  const renderStripeNotReady = () => (
    <View style={styles.pendingWrap}>
      <View style={styles.pendingCard}>
        <View style={styles.pendingIcon}>
          <View style={styles.pendingDot} />
        </View>
        <View style={styles.pendingTextWrap}>
          <View style={styles.pendingTitleRow}>
            <View style={styles.pendingTitleBar} />
          </View>
          <View style={styles.pendingSubBar} />
        </View>
      </View>

      <View style={styles.pendingDetails}>
        <Text style={styles.pendingTitle}>Payment setup is still loading</Text>
        <Text style={styles.pendingSubtitle}>
          {[
            !churchId ? "Missing church id" : null,
            !showAnyGateway ? "No gateways returned from API" : null,
            showAnyGateway && stripeGateway && !stripeGateway.publicKey ? "Stripe publishable key is missing" : null
          ]
            .filter(Boolean)
            .join(" • ") || "Fetching payment configuration…"}
        </Text>

        <Button
          mode="contained"
          onPress={handleRefreshIdentity}
          style={styles.retryBtn}
          labelStyle={styles.retryLabel}
          buttonColor="#1A1A1A"
          textColor="#FFFFFF">
          Retry
        </Button>
      </View>
    </View>
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(drawer)/(tabs)/donation");
    }
  };

  const toggleAccordion = (key: "card" | "bank" | "ecocash" | "paypal") => {
    setExpandedAccordion(prev => (prev === key ? null : key));
  };

  const startBankSetup = () => {
    if (!bankOptionAvailable) return;
    if (stripeGateway) {
      setPickerMode("bank");
    } else if (paynowGateway) {
      setPickerMode("paynowBank");
    }
  };

  const startPaypalCheckout = () => {
    if (!paypalGateway) {
      Alert.alert(t("common.alert"), t("donations.checkoutPaypalUnavailableHint"));
      return;
    }
    Alert.alert(
      t("donations.checkoutPaypalHeading"),
      t("donations.checkoutPaypalRedirectHint"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.continue"),
          onPress: () => {
            router.replace("/(drawer)/(tabs)/donation");
          }
        }
      ]
    );
  };

  const hasSavedPaynowCard = !!(paynowCardName || paynowCardEmail || paynowCardPhone);
  const hasCompletePaynowCardInfo = !!(
    paynowCardName.trim() &&
    paynowCardEmail.trim() &&
    paynowCardPhone.trim()
  );

  const commitChosenSavedPayment = useCallback(
    (key: string) => {
      setChosenSavedPaymentKey(key);
      if (churchId && prefsOwnerId && key) {
        saveSavedMethodChoice(churchId, prefsOwnerId, key).catch(() => {});
      }
    },
    [churchId, prefsOwnerId]
  );

  useEffect(() => {
    if (!prefsLoaded || !churchId || !prefsOwnerId) return;
    const stripeIds = new Set((paymentMethodsData || []).map(m => String(m.id || "").trim()).filter(Boolean));
    const validKey = (k: string) => {
      if (!k) return false;
      if (k.startsWith(SAVED_METHOD_STRIPE_PREFIX)) return stripeIds.has(k.slice(SAVED_METHOD_STRIPE_PREFIX.length));
      if (k === "paynow") return !!paynowGateway && hasSavedPaynowCard;
      if (k === "ecocash") return hasSavedEcoCashPhone;
      return false;
    };
    if (validKey(chosenSavedPaymentKey)) return;

    const prim = String((gatewayData || [])[0]?.provider || "").toLowerCase();
    const pm = paymentMethodsData || [];
    let next = "";
    if (prim === "paynow" && !!paynowGateway && hasSavedPaynowCard) next = "paynow";
    else if (pm[0]?.id) next = `${SAVED_METHOD_STRIPE_PREFIX}${pm[0].id}`;
    else if (hasSavedEcoCashPhone) next = "ecocash";
    else if (!!paynowGateway && hasSavedPaynowCard) next = "paynow";

    setChosenSavedPaymentKey(next);
    if (next) {
      saveSavedMethodChoice(churchId, prefsOwnerId, next).catch(() => {});
    }
  }, [
    prefsLoaded,
    churchId,
    prefsOwnerId,
    chosenSavedPaymentKey,
    paymentMethodsData,
    paynowGateway,
    hasSavedPaynowCard,
    hasSavedEcoCashPhone,
    gatewayData
  ]);

  if (pickerMode === "bank") {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.formsScroll}
          contentContainerStyle={styles.formsScrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <EnhancedBankForm
            setMode={() => setPickerMode("picker")}
            bank={new StripePaymentMethod({ type: "bank" })}
            customerId={customerId}
            updatedFunction={loadData}
            handleDelete={() => {}}
            showVerifyForm={false}
            stripeGatewayId={stripeGateway?.id}
          />
        </ScrollView>
      </View>
    );
  }

  const isCardFormOpen = pickerMode === "card";
  const isPaynowFormOpen = pickerMode === "paynowCard" || pickerMode === "paynowBank";
  const isEcoCashFormOpen = pickerMode === "ecocash";
  const isPaynowCardForm = pickerMode === "paynowCard";

  return (
    <View style={styles.container}>
      {!isSignedIn ? (
        <View style={styles.pendingDetails}>
          <Text style={styles.pendingTitle}>{t("donations.addPaymentMethod")}</Text>
          <Text style={styles.pendingSubtitle}>{t("donations.paymentMethodSignIn")}</Text>
          <Button mode="contained" onPress={handleBack} style={styles.retryBtn} labelStyle={styles.retryLabel} buttonColor="#1A1A1A" textColor="#FFFFFF">
            {t("common.done")}
          </Button>
        </View>
      ) : bootLoading ? (
        renderStripeNotReady()
      ) : !showAnyGateway ? (
        renderStripeNotReady()
      ) : (
        <View style={styles.bodyFlex}>
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.mainScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>
            {/* Saved Stripe cards — LifeChurch style, shown above payment method accordions */}
            {(Array.isArray(paymentMethodsData) && paymentMethodsData.length > 0) || hasSavedEcoCashPhone || hasSavedPaynowCard ? (
              <View style={styles.savedCardsSection}>
                {Array.isArray(paymentMethodsData) &&
                  paymentMethodsData.map((method: StripePaymentMethod, index: number) => {
                    const mBrandLabel = method?.name ? method.name.charAt(0).toUpperCase() + method.name.slice(1) : "Card";
                    const expMonth = method?.exp_month ? String(method.exp_month).padStart(2, "0") : "";
                    const expYear = method?.exp_year ? String(method.exp_year) : "";
                    const expiryText = expMonth && expYear ? `Expires ${expMonth}/${expYear}` : "";
                    const CardLogo = getCardLogo(method?.name);
                    const stripeKey = `${SAVED_METHOD_STRIPE_PREFIX}${method.id}`;
                    const stripeSelected = chosenSavedPaymentKey === stripeKey;
                    return (
                      <Card
                        key={method.id || index}
                        style={[
                          styles.savedCardItem,
                          {
                            borderColor: stripeSelected ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.18)"
                          }
                        ]}>
                        <Card.Content style={styles.savedCardContent}>
                          <TouchableOpacity
                            style={styles.savedCardSelectHit}
                            activeOpacity={0.85}
                            onPress={() => commitChosenSavedPayment(stripeKey)}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${mBrandLabel} ending ${method.last4 || ""}`}
                            accessibilityState={{ selected: stripeSelected }}>
                            <View style={styles.savedCardLogoWrap}>
                              <CardLogo width={54} height={34} />
                            </View>
                            <View style={styles.savedCardTextCol}>
                              <Text style={styles.savedCardTitle}>
                                {mBrandLabel}
                                {method.last4 ? ` *${method.last4}` : ""}
                              </Text>
                              {!!expiryText && <Text style={styles.savedCardExpiry}>{expiryText}</Text>}
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteSavedStripeCard(method)}
                            accessibilityRole="button"
                            accessibilityLabel="Delete saved payment method"
                            style={styles.savedDeleteBtn}
                            disabled={deletingMethodId === method.id}>
                            <MaterialIcons
                              name="delete-outline"
                              size={20}
                              color={deletingMethodId === method.id ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.78)"}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => commitChosenSavedPayment(stripeKey)}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: stripeSelected }}>
                            <MaterialIcons
                              name={stripeSelected ? "radio-button-checked" : "radio-button-unchecked"}
                              size={24}
                              color={stripeSelected ? "#FFFFFF" : "rgba(255,255,255,0.4)"}
                            />
                          </TouchableOpacity>
                        </Card.Content>
                      </Card>
                    );
                  })}

                {/* Saved Paynow / ZimSwitch — same row pattern as saved cards */}
                {hasSavedPaynowCard ? (
                  <Card
                    style={[
                      styles.savedCardItem,
                      {
                        borderColor:
                          chosenSavedPaymentKey === "paynow"
                            ? "rgba(255,255,255,0.32)"
                            : "rgba(255,255,255,0.18)"
                      }
                    ]}>
                    <Card.Content style={styles.savedCardContent}>
                      <TouchableOpacity
                        style={styles.savedCardSelectHit}
                        activeOpacity={0.9}
                        onPress={() => setPickerMode("paynowCard")}
                        accessibilityRole="button"
                        accessibilityLabel="Open saved card information">
                        <View style={styles.savedCardLogoWrap}>
                          <Image
                            source={paynowCardNetwork === "zimswitch" ? zimswitchLogo : paynowLogo}
                            style={paynowCardNetwork === "zimswitch" ? styles.savedMethodLogoZimSwitch : styles.savedMethodLogoPaynow}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.savedCardTextCol}>
                          <Text style={styles.savedCardTitle}>
                            {paynowCardNetwork === "zimswitch" ? "ZimSwitch" : "Paynow card"}
                          </Text>
                          <Text style={styles.savedCardExpiry} numberOfLines={2}>
                            {[paynowCardName?.trim(), paynowCardEmail?.trim(), paynowCardPhone?.trim()].filter(Boolean).join(" · ") ||
                              t("donations.paynowInfoSaved")}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.savedDeleteBtn}
                        onPress={handleRemoveSavedPaynowCard}
                        accessibilityRole="button"
                        accessibilityLabel="Remove saved card information">
                        <MaterialIcons name="delete-outline" size={20} color="rgba(255,255,255,0.78)" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => commitChosenSavedPayment("paynow")}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: chosenSavedPaymentKey === "paynow" }}>
                        <MaterialIcons
                          name={chosenSavedPaymentKey === "paynow" ? "radio-button-checked" : "radio-button-unchecked"}
                          size={24}
                          color={chosenSavedPaymentKey === "paynow" ? "#FFFFFF" : "rgba(255,255,255,0.4)"}
                        />
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                ) : null}

                {/* Saved EcoCash — same row pattern as saved cards */}
                {hasSavedEcoCashPhone ? (
                  <Card
                    style={[
                      styles.savedCardItem,
                      {
                        borderColor:
                          chosenSavedPaymentKey === "ecocash"
                            ? "rgba(255,255,255,0.32)"
                            : "rgba(255,255,255,0.18)"
                      }
                    ]}>
                    <Card.Content style={styles.savedCardContent}>
                      <TouchableOpacity
                        style={styles.savedCardSelectHit}
                        activeOpacity={0.9}
                        onPress={() => setPickerMode("ecocash")}
                        accessibilityRole="button"
                        accessibilityLabel="Open saved mobile number">
                        <View style={styles.savedCardLogoWrap}>
                          <Image source={ecoCashLogo} style={styles.savedMethodLogoEcoCash} resizeMode="contain" />
                        </View>
                        <View style={styles.savedCardTextCol}>
                          <Text style={styles.savedCardTitle}>Saved mobile number</Text>
                          <Text style={styles.savedCardExpiry}>{ecoPhoneDraft}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.savedDeleteBtn}
                        onPress={handleRemoveEcoPhone}
                        accessibilityRole="button"
                        accessibilityLabel="Remove saved EcoCash mobile number">
                        <MaterialIcons name="delete-outline" size={20} color="rgba(255,255,255,0.78)" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => commitChosenSavedPayment("ecocash")}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: chosenSavedPaymentKey === "ecocash" }}>
                        <MaterialIcons
                          name={chosenSavedPaymentKey === "ecocash" ? "radio-button-checked" : "radio-button-unchecked"}
                          size={24}
                          color={chosenSavedPaymentKey === "ecocash" ? "#FFFFFF" : "rgba(255,255,255,0.4)"}
                        />
                      </TouchableOpacity>
                    </Card.Content>
                  </Card>
                ) : null}
              </View>
            ) : null}

            {/* Donorbox-style accordions: always visible for every branch while we refine UI/UX */}
            <View style={styles.intlSection}>
              <Text style={styles.sectionTitle}>{t("donations.checkoutPaymentMethodsHeading")}</Text>
              <Text style={styles.sectionSubtitle}>{t("donations.checkoutPaymentMethodsSub")}</Text>

              <Card style={[styles.gatewayCard, styles.accordionCard]}>
                <TouchableOpacity
                  style={styles.accordionHeader}
                  activeOpacity={0.85}
                  disabled={!cardOptionAvailable}
                  onPress={() => setPickerMode("card")}
                  accessibilityRole="button"
                  accessibilityLabel={t("donations.checkoutDebitCredit")}>
                  <View style={styles.accordionHeaderIcon}>
                    <View style={styles.sheetCardGlyph} pointerEvents="none">
                      <View style={styles.sheetCardStripe} />
                      <View style={styles.sheetCardLine} />
                    </View>
                  </View>
                  <View style={styles.accordionHeaderText}>
                    <Text style={styles.accordionHeaderTitle}>{t("donations.checkoutDebitCredit")}</Text>
                  </View>
                  <MaterialIcons
                    name="expand-more"
                    size={24}
                    color="rgba(255,255,255,0.72)"
                  />
                </TouchableOpacity>
              </Card>

              {(isZimbabweChurch || !!ecoCashGateway) ? (
                <Card style={[styles.gatewayCard, styles.accordionCard]}>
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    activeOpacity={0.85}
                    disabled={!isSignedIn}
                    onPress={() => setPickerMode("ecocash")}
                    accessibilityRole="button"
                    accessibilityLabel={t("donations.checkoutEcoCashHeading")}>
                    <View style={styles.accordionHeaderIcon}>
                      <View style={styles.addMethodIconShell}>
                        <Image source={ecoCashLogo} style={styles.addMethodEcoCashIcon} resizeMode="contain" />
                      </View>
                    </View>
                    <View style={styles.accordionHeaderText}>
                      <Text style={styles.accordionHeaderTitle}>{t("donations.checkoutEcoCashHeading")}</Text>
                    </View>
                    <MaterialIcons
                      name="expand-more"
                      size={24}
                      color="rgba(255,255,255,0.72)"
                    />
                  </TouchableOpacity>
                </Card>
              ) : null}

              {(isZimbabweChurch || !!paynowGateway) ? (
                <Card style={[styles.gatewayCard, styles.accordionCard]}>
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    activeOpacity={0.85}
                    disabled={!isSignedIn}
                    onPress={() => {
                      setPaynowCardNetwork("zimswitch");
                      setPickerMode("paynowCard");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="ZimSwitch">
                    <View style={styles.accordionHeaderIcon}>
                      <View style={styles.addMethodIconShell}>
                        <Image source={zimswitchLogo} style={styles.addMethodZimSwitchIcon} resizeMode="contain" />
                      </View>
                    </View>
                    <View style={styles.accordionHeaderText}>
                      <Text style={styles.accordionHeaderTitle}>ZimSwitch</Text>
                    </View>
                    <MaterialIcons
                      name="expand-more"
                      size={24}
                      color="rgba(255,255,255,0.72)"
                    />
                  </TouchableOpacity>
                </Card>
              ) : null}

              <Card style={[styles.gatewayCard, styles.accordionCard, !paypalGateway ? styles.accordionCardMuted : null]}>
                <TouchableOpacity
                  style={styles.accordionHeader}
                  activeOpacity={0.85}
                  disabled={!paypalGateway}
                  onPress={() => toggleAccordion("paypal")}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: expandedAccordion === "paypal" }}>
                  <View style={styles.accordionHeaderIcon}>
                    <View style={styles.sheetIconShell}>
                      <PaypalLogo width={22} height={14} />
                    </View>
                  </View>
                  <View style={styles.accordionHeaderText}>
                    <Text style={styles.accordionHeaderTitle}>{t("donations.checkoutPaypalHeading")}</Text>
                  </View>
                  <MaterialIcons
                    name={expandedAccordion === "paypal" ? "expand-less" : "expand-more"}
                    size={24}
                    color="rgba(255,255,255,0.72)"
                  />
                </TouchableOpacity>
                {expandedAccordion === "paypal" ? (
                  <Card.Content style={styles.accordionBody}>
                    <Text style={styles.accordionHint}>
                      {paypalGateway ? t("donations.checkoutPaypalHint") : t("donations.checkoutPaypalUnavailableHint")}
                    </Text>
                    <Button
                      mode="contained"
                      onPress={startPaypalCheckout}
                      disabled={!paypalGateway}
                      style={styles.sheetPrimaryBtn}
                      labelStyle={styles.sheetPrimaryBtnLabel}
                      buttonColor="#E4E7ED"
                      textColor="#1A1A1A">
                      {t("common.continue")}
                    </Button>
                  </Card.Content>
                ) : null}
              </Card>

            </View>

            {/* EcoCash is listed once in the accordion above; omit duplicate Zimbabwe-only row. */}
            {isZimbabwePaynowBranch && paynowGateway ? (
              <View style={styles.regionalSection}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  disabled={!isSignedIn}
                  onPress={() => setPickerMode("paynowCard")}
                  accessibilityRole="button"
                  accessibilityLabel={t("donations.zimbabwePaynowCardRowTitle")}>
                  <Card style={styles.gatewayCard}>
                    <Card.Content>
                      <View style={styles.zwRowInner}>
                        <View style={styles.gatewayIconWrapLight}>
                          <Image source={paynowLogo} style={styles.gatewayLogoWide} resizeMode="contain" />
                        </View>
                        <View style={styles.gatewayHeaderText}>
                          <Text style={styles.gatewayTitle}>{t("donations.zimbabwePaynowCardRowTitle")}</Text>
                          <Text style={styles.gatewaySubtitle}>{t("donations.zimbabwePaynowCardRowSub")}</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.55)" />
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Card form bottom sheet — slides up over the page so all content stays visible */}
            <Modal
              transparent
              visible={isCardFormOpen}
              animationType="slide"
              onRequestClose={() => setPickerMode("picker")}>
              <Pressable style={styles.sheetBackdrop} onPress={() => setPickerMode("picker")} />
              <View style={styles.sheet}>
                <View style={styles.sheetHeader}>
                  <TouchableOpacity onPress={() => setPickerMode("picker")} style={styles.sheetCloseBtn}>
                    <MaterialIcons name="close" size={22} color="rgba(255,255,255,0.9)" />
                  </TouchableOpacity>
                  <Text style={styles.sheetTitle}>{t("donations.checkoutDebitCredit")}</Text>
                  <View style={{ width: 36 }} />
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}>
                  <View style={styles.cardSheetContent}>
                    <CardForm
                      setMode={() => setPickerMode("picker")}
                      card={new StripePaymentMethod({ type: "card" })}
                      customerId={customerId}
                      updatedFunction={loadData}
                      handleDelete={() => {}}
                      stripeGatewayId={stripeGateway?.id}
                    />
                  </View>
                </ScrollView>
              </View>
            </Modal>

            <Modal
              transparent
              visible={isPaynowFormOpen}
              animationType="slide"
              onRequestClose={() => setPickerMode("picker")}>
              <Pressable style={styles.sheetBackdrop} onPress={() => setPickerMode("picker")} />
              <View style={styles.sheet}>
                <View style={styles.sheetHeader}>
                  <TouchableOpacity onPress={() => setPickerMode("picker")} style={styles.sheetCloseBtn}>
                    <MaterialIcons name="close" size={22} color="rgba(255,255,255,0.9)" />
                  </TouchableOpacity>
                  <Text style={styles.sheetTitle}>{isPaynowCardForm ? "Card Information" : "Paynow Bank"}</Text>
                  <View style={{ width: 36 }} />
                </View>
                <View style={styles.paynowSheetContent}>
                  {!isPaynowCardForm ? (
                    <View style={styles.gatewayHeaderRow}>
                      <View style={styles.gatewayHeaderLeft}>
                        <View style={styles.gatewayIconWrapLight}>
                          <Image source={paynowLogo} style={styles.gatewayLogoWide} resizeMode="contain" />
                        </View>
                        <View style={styles.gatewayHeaderText}>
                          <Text style={styles.gatewaySubtitle}>
                            Bank payments for your branch are completed on Paynow secure checkout during giving.
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.gatewayBody}>
                    {isPaynowCardForm ? (
                      <>
                        <Text style={styles.fieldLabel}>{t("donations.paynowCardName")}</Text>
                        <TextInput
                          value={paynowCardName}
                          onChangeText={setPaynowCardName}
                          placeholder={t("donations.paynowCardName")}
                          placeholderTextColor="rgba(255,255,255,0.45)"
                          style={styles.textField}
                          editable={prefsLoaded}
                        />
                        <Text style={styles.fieldLabel}>{t("donations.paynowCardEmail")}</Text>
                        <TextInput
                          value={paynowCardEmail}
                          onChangeText={setPaynowCardEmail}
                          placeholder="name@example.com"
                          placeholderTextColor="rgba(255,255,255,0.45)"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          style={styles.textField}
                          editable={prefsLoaded}
                        />
                        <Text style={styles.fieldLabel}>{t("donations.paynowCardPhone")}</Text>
                        <TextInput
                          value={paynowCardPhone}
                          onChangeText={(v) => setPaynowCardPhone(v.replace(/\D/g, "").slice(0, 10))}
                          placeholder="07XXXXXXXX"
                          placeholderTextColor="rgba(255,255,255,0.45)"
                          keyboardType="number-pad"
                          maxLength={10}
                          style={styles.textField}
                          editable={prefsLoaded}
                        />
                      </>
                    ) : (
                      <>
                        <Text style={styles.fieldLabel}>{t("donations.paynowBankName")}</Text>
                        <TextInput
                          value={paynowBankName}
                          onChangeText={setPaynowBankName}
                          placeholder={t("donations.paynowBankName")}
                          placeholderTextColor="rgba(255,255,255,0.45)"
                          style={styles.textField}
                          editable={prefsLoaded}
                        />
                        <Text style={styles.fieldLabel}>{t("donations.paynowBankAccountName")}</Text>
                        <TextInput
                          value={paynowBankAccountName}
                          onChangeText={setPaynowBankAccountName}
                          placeholder={t("donations.paynowBankAccountName")}
                          placeholderTextColor="rgba(255,255,255,0.45)"
                          style={styles.textField}
                          editable={prefsLoaded}
                        />
                        <Text style={styles.fieldLabel}>{t("donations.paynowBankEmail")}</Text>
                        <TextInput
                          value={paynowBankEmail}
                          onChangeText={setPaynowBankEmail}
                          placeholder={t("donations.paynowBankEmail")}
                          placeholderTextColor="rgba(255,255,255,0.45)"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          style={styles.textField}
                          editable={prefsLoaded}
                        />
                        <Text style={styles.fieldLabel}>{t("donations.paynowBankPhone")}</Text>
                        <TextInput
                          value={paynowBankPhone}
                          onChangeText={(v) => setPaynowBankPhone(normalizePhoneDigits(v))}
                          placeholder={t("donations.paynowBankPhone")}
                          placeholderTextColor="rgba(255,255,255,0.45)"
                          keyboardType="number-pad"
                          inputMode="numeric"
                          maxLength={15}
                          style={styles.textField}
                          editable={prefsLoaded}
                        />
                      </>
                    )}
                    <Button
                      mode="contained"
                      onPress={isPaynowCardForm ? handleSavePaynowCard : handleSavePaynowBank}
                      style={styles.sheetPrimaryBtn}
                      labelStyle={styles.sheetPrimaryBtnLabel}
                      disabled={!prefsLoaded}
                      buttonColor="#E4E7ED"
                      textColor="#1A1A1A">
                      {isPaynowCardForm && hasCompletePaynowCardInfo ? <MaterialIcons name="task-alt" size={24} color="#1A1A1A" style={styles.ecoCashTickIcon} /> : "Set up"}
                    </Button>
                  </View>
                </View>
              </View>
            </Modal>

            <Modal
              transparent
              visible={isEcoCashFormOpen}
              animationType="slide"
              onRequestClose={() => setPickerMode("picker")}>
              <Pressable style={styles.sheetBackdrop} onPress={() => setPickerMode("picker")} />
              <View style={styles.sheet}>
                <View style={styles.sheetHeader}>
                  <TouchableOpacity onPress={() => setPickerMode("picker")} style={styles.sheetCloseBtn}>
                    <MaterialIcons name="close" size={22} color="rgba(255,255,255,0.9)" />
                  </TouchableOpacity>
                  <Image source={ecoCashLogo} style={styles.ecoCashHeaderLogo} resizeMode="contain" />
                  <View style={{ width: 36 }} />
                </View>
                <View style={styles.paynowSheetContent}>
                  <View style={styles.gatewayHeaderRow}>
                    <View style={styles.gatewayHeaderText}>
                      <Text style={styles.gatewaySubtitle}></Text>
                    </View>
                  </View>
                  <View style={styles.gatewayBody}>
                    <Text style={styles.fieldLabel}>Mobile Number</Text>
                    <TextInput
                      value={ecoPhoneDraft}
                      onChangeText={(v) => setEcoPhoneDraft(normalizeEcoCashPhone(v))}
                      placeholder="07XXXXXXXX"
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      keyboardType="number-pad"
                      maxLength={10}
                      style={styles.textField}
                      editable={prefsLoaded}
                    />
                    <Text style={styles.gatewaySubtitle}>{t("donations.ecoCashSectionSubtitle")}</Text>
                    <Button
                      mode="contained"
                      onPress={handleSaveEcoPhone}
                      style={[styles.sheetPrimaryBtn, styles.ecoCashSetupBtn]}
                      labelStyle={styles.sheetPrimaryBtnLabel}
                      disabled={!prefsLoaded}
                      buttonColor="#E4E7ED"
                      textColor="#1A1A1A">
                      {isValidEcoCashPhone(ecoPhoneDraft) ? <MaterialIcons name="task-alt" size={24} color="#1A1A1A" style={styles.ecoCashTickIcon} /> : "Set up"}
                    </Button>
                  </View>
                </View>
              </View>
            </Modal>
          </ScrollView>

          {!isCardFormOpen && !isPaynowFormOpen && !isEcoCashFormOpen ? (
            <View style={styles.bottomBar}>
              <Button mode="contained" onPress={handleBack} style={styles.doneBtn} labelStyle={styles.doneLabel} buttonColor="#FFFFFF" textColor="#1A1A1A">
                {t("common.done")}
              </Button>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  bodyFlex: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8
  },
  mainScroll: { flex: 1 },
  mainScrollContent: {
    paddingBottom: 24,
    gap: 14
  },
  regionalSection: {
    marginBottom: 4,
    gap: 12
  },
  intlSection: {
    marginBottom: 4,
    gap: 12
  },
  sectionTitle: {
    ...givingSectionHeading,
    color: "#FFFFFF",
    fontSize: 15,
    marginBottom: 4
  },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8
  },
  zwRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  accordionCard: {
    overflow: "hidden"
  },
  accordionCardMuted: {
    opacity: 0.72
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12
  },
  accordionHeaderIcon: {
    width: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  accordionHeaderText: {
    flex: 1,
    minWidth: 0
  },
  accordionHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  },
  accordionBody: {
    paddingTop: 0,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)"
  },
  accordionHint: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14
  },
  gatewayCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)"
  },
  gatewayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  gatewayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: 10
  },
  gatewayHeaderText: {
    flex: 1,
    minWidth: 0
  },
  gatewayTitle: {
    ...givingModalTitle,
    color: "#FFFFFF",
    marginBottom: 3
  },
  gatewaySubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 18
  },
  gatewayBody: { marginTop: 14 },
  gatewayBodyTight: { marginTop: 10 },
  gatewayIconWrapLight: {
    width: 44,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)"
  },
  gatewayIconWrapDark: {
    width: 44,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  gatewayLogoWide: {
    width: 38,
    height: 20
  },
  /* LifeChurch-style saved Stripe cards at top of screen */
  savedCardsSection: {
    marginBottom: 8
  },
  savedCardItem: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)"
  },
  savedCardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14
  },
  savedCardSelectHit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0
  },
  savedCardLogoWrap: {
    width: 64,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  savedCardLogoImage: {
    width: 54,
    height: 34
  },
  savedCardGlyph: {
    width: 38,
    height: 26,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.85)",
    overflow: "hidden"
  },
  savedCardGlyphStripe: {
    width: "100%" as any,
    height: 8,
    backgroundColor: "rgba(0,0,0,0.22)"
  },
  savedCardGlyphLine: {
    position: "absolute",
    left: 6,
    bottom: 6,
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.28)"
  },
  savedCardTextCol: {
    flex: 1,
    minWidth: 0
  },
  savedCardTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 4
  },
  savedCardExpiry: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13
  },
  savedDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  savedMethodLogoEcoCash: {
    width: 50,
    height: 26
  },
  savedMethodLogoZimSwitch: {
    width: 54,
    height: 28
  },
  savedMethodLogoPaynow: {
    width: 48,
    height: 22
  },
  savedCardNetworkIconWrap: {
    width: 44,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  savedEcoCashIconWrap: {
    width: 52,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  savedEcoCashIcon: {
    width: 44,
    height: 24
  },
  savedCardNetworkIcon: {
    width: 38,
    height: 22
  },
  savedRemoveBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center"
  },
  addMethodIconRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  addMethodIconShell: {
    width: 36,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  addMethodBankIcon: {
    width: 18,
    height: 14,
    tintColor: "#111111"
  },
  addMethodBankCardGlyph: {
    width: 36,
    height: 24
  },
  addMethodBankCardStripe: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  addMethodBankCardLine: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 7,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#111111"
  },
  addMethodEcoCashIcon: {
    width: 24,
    height: 12
  },
  addMethodZimSwitchIcon: {
    width: 30,
    height: 14
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.12)"
  },
  sheet: {
    backgroundColor: "#000000",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 0,
    paddingBottom: 18
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center"
  },
  sheetTitle: {
    ...givingModalTitle,
    color: "#FFFFFF"
  },
  ecoCashHeaderLogo: {
    width: 92,
    height: 24
  },
  sheetBody: {
    paddingHorizontal: 14,
    paddingTop: 6,
    gap: 10
  },
  paynowSheetContent: {
    paddingHorizontal: 14,
    paddingBottom: 16
  },
  cardSheetContent: {
    paddingHorizontal: 14,
    paddingBottom: 32
  },
  sheetOption: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  sheetOptionSelected: {
    borderColor: "rgba(46,229,209,0.8)",
    backgroundColor: "rgba(46,229,209,0.08)"
  },
  sheetOptionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  },
  sheetCardGlyph: {
    width: 30,
    height: 20
  },
  sheetIconShell: {
    width: 30,
    height: 20,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  sheetCardStripe: {
    width: "100%",
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)"
  },
  sheetCardLine: {
    position: "absolute",
    left: 5,
    right: 5,
    top: 6,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#111111"
  },
  sheetBankIcon: {
    width: 16,
    height: 12,
    tintColor: "#111111"
  },
  sheetEcoCashLogo: {
    width: 22,
    height: 10
  },
  sheetEcoCashLogoStandalone: {
    width: 68,
    height: 22
  },
  sheetEcoCashOnlyWrap: {
    width: "100%",
    alignItems: "flex-start",
    justifyContent: "center"
  },
  sheetFooter: {
    paddingTop: 14,
    paddingHorizontal: 14
  },
  sheetPrimaryBtn: {
    borderRadius: 999,
    minHeight: 52,
    justifyContent: "center"
  },
  ecoCashSetupBtn: { marginTop: 10 },
  ecoCashTickIcon: { fontWeight: "800" },
  sheetPrimaryBtnLabel: {
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 20
  },
  laneHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8
  },
  fieldLabel: {
    ...givingFormLabel,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 6
  },
  networkToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12
  },
  networkChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
    minHeight: 64,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  networkChipActive: {
    borderColor: "rgba(0,0,0,0.14)",
    backgroundColor: "#E4E7ED"
  },
  networkLogo: {
    width: 88,
    height: 34
  },
  textField: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 12
  },
  ecoPhoneHint: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    marginTop: -6,
    marginBottom: 8
  },
  primaryPillBtn: {
    borderRadius: 999,
    marginTop: 4
  },
  primaryPillLabel: { fontWeight: "700" },
  removeBtn: {
    marginTop: 4,
    alignSelf: "flex-start"
  },
  removeBtnLabel: { fontWeight: "700" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4
  },
  switchLabel: {
    ...givingListRowTitle,
    color: "#FFFFFF",
    flex: 1,
    marginRight: 12
  },
  methodIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14
  },
  methodIconBlock: {
    width: 52,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14
  },
  bottomBar: {
    paddingTop: 10,
    paddingBottom: 18
  },
  doneBtn: {
    width: "100%",
    borderRadius: 999,
    minHeight: 54,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    justifyContent: "center"
  },
  doneLabel: {
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 20,
    color: "#1A1A1A"
  },
  formsScroll: { flex: 1 },
  formsScrollContent: {
    padding: 16,
    paddingBottom: 32
  },
  pendingWrap: { paddingTop: 10 },
  pendingCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1A1A1A",
    padding: 18,
    flexDirection: "row",
    alignItems: "center"
  },
  pendingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  pendingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#7FA6FF"
  },
  pendingTextWrap: { flex: 1 },
  pendingTitleRow: { marginBottom: 8 },
  pendingTitleBar: {
    width: "62%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.22)"
  },
  pendingSubBar: {
    width: "42%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.14)"
  },
  pendingDetails: {
    paddingHorizontal: 16,
    paddingTop: 14
  },
  pendingTitle: {
    ...givingSectionHeading,
    color: "#FFFFFF",
    marginBottom: 6
  },
  pendingSubtitle: {
    color: "rgba(255,255,255,0.72)",
    lineHeight: 20
  },
  retryBtn: {
    marginTop: 14,
    borderRadius: 999,
    alignSelf: "flex-start"
  },
  retryLabel: { fontWeight: "800" }
});

