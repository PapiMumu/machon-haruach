import React from "react";
import { LoadingWrapper } from "../../src/components/wrapper/LoadingWrapper";
import { ApiHelper, CheckEmailResponseInterface, EnvironmentHelper } from "../../src/helpers";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from "react-native";
import * as ExpoLinking from "expo-linking";
import { Button, Text, TextInput, Banner } from "react-native-paper";
import { useAppTheme } from "../../src/theme";
import { useTranslation } from "react-i18next";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Constants from "expo-constants";
import { __DEV__ } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChurchSettings } from "../../src/hooks/useChurchSettings";

const paramString = (v: string | string[] | undefined): string => {
  if (v == null) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
};

const Register = () => {
  const { t } = useTranslation();
  const { theme, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const minSide = Math.min(width, height);
  const isSmallPhone = minSide < 370;
  const isLargePhone = minSide >= 430;
  const registerButtonHeight = isSmallPhone ? 50 : isLargePhone ? 58 : 54;
  const params = useLocalSearchParams<{ email?: string; firstName?: string; lastName?: string; churchId?: string; churchName?: string }>();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(paramString(params.email));
  const [firstName, setFirstName] = useState(paramString(params.firstName));
  const [lastName, setLastName] = useState(paramString(params.lastName));
  const [matchedChurchId, setMatchedChurchId] = useState(paramString(params.churchId));
  const [matchedChurchName, setMatchedChurchName] = useState(paramString(params.churchName));
  const { data: churchSettings } = useChurchSettings(matchedChurchId || undefined);

  const openEmailApp = async () => {
    try {
      const gmailUrl = Platform.OS === "android" ? "googlegmail://co" : "googlegmail://";
      if (await Linking.canOpenURL(gmailUrl)) {
        await Linking.openURL(gmailUrl);
        return;
      }
      if (await Linking.canOpenURL("mailto:")) {
        await Linking.openURL("mailto:");
      }
    } catch {
      // keep registration success flow even if app linking fails
    }
  };

  const trialDays = useMemo(() => {
    const settings = Array.isArray(churchSettings) ? churchSettings : [];
    const raw = String(settings.find((s: any) => s?.keyName === "mobileSubscriptionTrialDays")?.value || "7");
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 7;
  }, [churchSettings]);

  const monthlyAmountDisplay = useMemo(() => {
    const settings = Array.isArray(churchSettings) ? churchSettings : [];
    return String(settings.find((s: any) => s?.keyName === "mobileSubscriptionMonthlyAmount")?.value || "").trim();
  }, [churchSettings]);

  const alertEmailAlreadyRegistered = () => {
    const e = email.trim();
    Alert.alert(t("common.alert"), t("auth.userExists"), [
      { text: t("common.ok"), style: "cancel" },
      {
        text: t("auth.signIn"),
        onPress: () => router.replace({ pathname: "/auth/login", params: e ? { email: e } : undefined })
      }
    ]);
  };

  const checkEmailForMatch = async (emailToCheck: string) => {
    if (!emailToCheck) return;
    const emailReg = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,6})+$/;
    if (!emailReg.test(emailToCheck)) return;
    try {
      const resp: CheckEmailResponseInterface = await ApiHelper.postAnonymous("/users/checkEmail", { email: emailToCheck }, "MembershipApi");
      if (resp.exists) {
        Alert.alert(t("common.alert"), t("auth.userExists"));
      } else if (resp.peopleMatches && resp.peopleMatches.length > 0) {
        const match = resp.peopleMatches[0];
        if (!firstName) setFirstName(match.firstName);
        if (!lastName) setLastName(match.lastName);
        if (resp.peopleMatches.length === 1) {
          setMatchedChurchId(match.churchId);
          setMatchedChurchName(match.churchName);
        }
      }
    } catch { /* silently ignore lookup failures */ }
  };

  const registerApiCall = async () => {
    setLoading(true);
    try {
      const extra = Constants.expoConfig?.extra ?? {};
      const adminRoot = String(extra.ADMIN_WEB_ROOT || extra.B1ADMIN_WEB_ROOT || "https://admin.machonharuach.org").replace(/\/$/, "");
      const appNameForEmail = String(extra.APP_NAME_FOR_EMAIL || "Machon HaRuach");
      const schemeRaw = Constants.expoConfig?.scheme;
      const scheme = Array.isArray(schemeRaw) ? (schemeRaw[0] || "b1mobile") : (schemeRaw || "b1mobile");
      const mobilePasswordResetBase = ExpoLinking.createURL("/auth/set-password", { scheme });
      const mobileAndroidPackage = Constants.expoConfig?.android?.package ?? "church.b1.mobile";
      const resetHandoffApiBase = EnvironmentHelper.MembershipApi.replace(/\/$/, "");

      const registerData: any = {
        email,
        firstName,
        lastName,
        appUrl: adminRoot,
        appName: appNameForEmail,
        mobilePasswordResetBase,
        mobileAndroidPackage,
        resetHandoffApiBase
      };
      if (matchedChurchId) registerData.churchId = matchedChurchId;
      const data = await ApiHelper.postAnonymous("/users/register", registerData, "MembershipApi");
      const registeredEmail = data?.email;
      const authGuid = data?.authGuid != null ? String(data.authGuid) : "";
      const inAppSetPassword = __DEV__ === true || extra.IN_APP_SET_PASSWORD_AFTER_REGISTER === true;
      const trialEndFromApi = data?.trialEndsAt ? new Date(data.trialEndsAt) : null;
      const trialEndText =
        trialEndFromApi && !Number.isNaN(trialEndFromApi.getTime())
          ? trialEndFromApi.toLocaleDateString()
          : t("auth.trialEndsInDays", { days: trialDays });

      if (registeredEmail != null && registeredEmail !== "") {
        if (inAppSetPassword && authGuid !== "") {
          router.replace({ pathname: "/auth/set-password", params: { email: registeredEmail, authGuid } });
        } else {
          // Open Gmail/app inbox immediately when available to help users complete password setup.
          await openEmailApp();
          Alert.alert(
            t("auth.trialStartedTitle"),
            t("auth.trialStartedBodyWithEmail", { trialEnd: trialEndText }),
            [
              { text: t("auth.openEmailApp"), onPress: () => { void openEmailApp(); } },
              { text: "OK", onPress: () => router.replace("/auth/login") }
            ]
          );
        }
      } else {
        Alert.alert(t("common.error"), t("auth.userExists"));
      }
    } catch (error: any) {
      if (error.message && error.message.includes("user already exists")) {
        Alert.alert(t("common.error"), t("auth.userExists"));
      } else {
        Alert.alert(t("common.error"), error.message || t("common.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const validateDetails = () => {
    let result = true;
    if (email != "") {
      const emailReg = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,6})+$/;
      if (emailReg.test(email) === false) {
        Alert.alert(t("common.alert"), t("auth.invalidEmail"));
        result = false;
      } else if (firstName === "") {
        Alert.alert(t("common.alert"), t("auth.enterFirstName"));
        result = false;
      } else if (lastName === "") {
        Alert.alert(t("common.alert"), t("auth.enterLastName"));
        result = false;
      }
    } else {
      Alert.alert(t("common.alert"), t("auth.enterEmail"));
      result = false;
    }
    return result;
  };

  return (
    <LoadingWrapper loading={loading}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={[styles.safe, { backgroundColor: "#06080E" }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={[styles.backRow, { paddingTop: Math.max(insets.top, 8) }]}
        >
          <MaterialIcons name="chevron-left" size={32} color="#FFFFFF" />
        </Pressable>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: Math.max(insets.bottom, 24) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingTop: spacing.sm, paddingBottom: spacing.md }}>
            <Text style={styles.title}>{t("auth.registerAccount")}</Text>
            <Text style={styles.subtitle}>{t("auth.registerSubtitle")}</Text>
          </View>

          <View style={styles.trialCard}>
            <View style={styles.trialCardHeader}>
              <MaterialIcons name="schedule" size={18} color="#60A5FA" />
              <Text style={styles.trialCardTitle}>{t("auth.registerTrialTitle", { days: trialDays })}</Text>
            </View>
            <Text style={styles.trialCardBody}>{t("auth.registerTrialBody")}</Text>
            {monthlyAmountDisplay ? (
              <Text style={styles.trialCardMeta}>{t("auth.registerTrialMeta", { amount: monthlyAmountDisplay })}</Text>
            ) : null}
          </View>

          {matchedChurchName ? (
            <Banner
              visible={true}
              icon={({ size }) => <MaterialIcons name="info" size={size} color="#FFFFFF" />}
              style={styles.banner}
            >
              {t("auth.churchRecordFound", { churchName: matchedChurchName })}
            </Banner>
          ) : null}

          <TextInput
            mode="outlined"
            label={t("auth.firstName")}
            value={firstName}
            onChangeText={setFirstName}
            autoCorrect={false}
            autoComplete="given-name"
            textContentType="givenName"
            style={styles.field}
            outlineStyle={styles.fieldOutline}
            theme={{ colors: { primary: "#FFFFFF", onSurfaceVariant: "rgba(255,255,255,0.72)" } }}
            left={<TextInput.Icon icon="account" color="rgba(255,255,255,0.72)" />}
            textColor="#FFFFFF"
          />

          <TextInput
            mode="outlined"
            label={t("auth.lastName")}
            value={lastName}
            onChangeText={setLastName}
            autoCorrect={false}
            autoComplete="family-name"
            textContentType="familyName"
            style={styles.field}
            outlineStyle={styles.fieldOutline}
            theme={{ colors: { primary: "#FFFFFF", onSurfaceVariant: "rgba(255,255,255,0.72)" } }}
            left={<TextInput.Icon icon="account" color="rgba(255,255,255,0.72)" />}
            textColor="#FFFFFF"
          />

          <TextInput
            mode="outlined"
            label={t("auth.email")}
            value={email}
            onChangeText={setEmail}
            onBlur={() => checkEmailForMatch(email)}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            style={styles.field}
            outlineStyle={styles.fieldOutline}
            theme={{ colors: { primary: "#FFFFFF", onSurfaceVariant: "rgba(255,255,255,0.72)" } }}
            left={<TextInput.Icon icon="email" color="rgba(255,255,255,0.72)" />}
            textColor="#FFFFFF"
          />

          <Text style={styles.privacyText}>
            {t("auth.privacyConfirm")}{" "}
            <Text style={styles.privacyLink} onPress={() => router.navigate("/auth/privacy")}>
              {t("auth.privacyPolicy").toLowerCase()}.
            </Text>
          </Text>
          <Text style={styles.trialFootnote}>{t("auth.registerTrialFootnote", { days: trialDays })}</Text>

          <Button
            mode="contained"
            onPress={() => validateDetails() && registerApiCall()}
            loading={loading}
            style={styles.primaryButton}
            contentStyle={[styles.primaryButtonContent, { height: registerButtonHeight }]}
            labelStyle={[styles.primaryButtonLabel, { color: "#0F1118" }]}
            buttonColor="#FFFFFF"
            textColor="#0F1118"
          >
            {t("auth.startFreeTrial")}
          </Button>

          <View style={{ height: spacing.md }} />
        </ScrollView>
      </SafeAreaView>
    </LoadingWrapper>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  backRow: {
    alignSelf: "flex-start",
    paddingLeft: 8,
    paddingRight: 16,
    paddingBottom: 8
  },
  scroll: { flex: 1 },
  title: {
    color: "#FFFFFF",
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 32,
    letterSpacing: -0.6,
    lineHeight: 38,
    textAlign: "left"
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10
  },
  banner: {
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 12
  },
  trialCard: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.50)",
    backgroundColor: "rgba(59,130,246,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  trialCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6
  },
  trialCardTitle: {
    color: "#DBEAFE",
    fontFamily: "Poppins_700Bold",
    fontSize: 15
  },
  trialCardBody: {
    color: "rgba(219,234,254,0.92)",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_500Medium"
  },
  trialCardMeta: {
    marginTop: 6,
    color: "rgba(219,234,254,0.86)",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold"
  },
  field: {
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  fieldOutline: {
    borderRadius: 14,
    borderColor: "rgba(255,255,255,0.24)"
  },
  privacyText: {
    color: "rgba(255,255,255,0.68)",
    marginTop: 4,
    marginBottom: 18
  },
  trialFootnote: {
    color: "rgba(255,255,255,0.75)",
    marginTop: -8,
    marginBottom: 14,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  privacyLink: {
    color: "#FFFFFF",
    textDecorationLine: "underline"
  },
  primaryButton: {
    borderRadius: 999,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)"
  },
  primaryButtonContent: { height: 56 },
  primaryButtonLabel: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16
  }
});

export default Register;
