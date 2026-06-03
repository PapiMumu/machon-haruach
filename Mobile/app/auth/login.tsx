import React from "react";
import { ApiHelper, EnvironmentHelper, LoginResponseInterface, CheckEmailResponseInterface } from "../../src/helpers";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import * as ExpoLinking from "expo-linking";
import { LoadingWrapper } from "../../src/components/wrapper/LoadingWrapper";
import { Button, Text, TextInput } from "react-native-paper";
import { useUserStore } from "../../src/stores/useUserStore";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TFunction } from "i18next";
import { getAccessBlockCode } from "../../src/helpers/AccessStatusHelper";

/** API may return JSON as the thrown Error message string; SES errors mention unverified identities. */
function messageForForgotPasswordFailure(raw: string, t: TFunction): string {
  const s = (raw || "").trim();
  const sesHint = /not verified|identities failed|ses|sandbox/i;
  if (sesHint.test(s)) return t("auth.forgotEmailSesBlocked");
  try {
    const j = JSON.parse(s) as { error?: { message?: string }; message?: string; errors?: string[] };
    const inner = (typeof j?.error?.message === "string" && j.error.message) || (typeof j?.message === "string" && j.message) || (Array.isArray(j?.errors) ? j.errors[0] : "");
    if (inner && sesHint.test(inner)) return t("auth.forgotEmailSesBlocked");
    if (inner && inner.length > 0 && inner.length < 500) return inner;
  } catch {
    /* not JSON */
  }
  return s.length > 0 && s.length < 500 ? s : t("auth.forgotEmailFailed");
}

const Login = () => {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ reason?: string | string[] }>();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const reasonRaw = params.reason;
    const reason = Array.isArray(reasonRaw) ? (reasonRaw[0] || "") : (reasonRaw || "");
    if (reason === "SUBSCRIPTION_INACTIVE" || reason === "TRIAL_EXPIRED") {
      Alert.alert("Subscription expired", "Your subscription has expired. Please renew your subscription to continue.");
      router.setParams({ reason: undefined as any });
    }
  }, [params.reason]);

  const validateDetails = () => {
    if (email != "") {
      const emailReg = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,6})+$/;
      if (emailReg.test(email) === false) {
        Alert.alert(t("common.alert"), t("auth.invalidEmail"));
        return false;
      } else {
        if (password != "") {
          return true;
        } else {
          Alert.alert(t("common.alert"), t("auth.enterPassword"));
          return false;
        }
      }
    } else {
      Alert.alert(t("common.alert"), t("auth.enterEmail"));
      return false;
    }
  };

  const handleLoginFailure = async () => {
    try {
      const resp: CheckEmailResponseInterface = await ApiHelper.postAnonymous("/users/checkEmail", { email }, "MembershipApi");
      if (resp.exists) {
        Alert.alert(t("common.alert"), t("auth.invalidLogin"));
      } else {
        const params: any = { email };
        if (resp.peopleMatches.length === 1) {
          params.firstName = resp.peopleMatches[0].firstName;
          params.lastName = resp.peopleMatches[0].lastName;
          params.churchId = resp.peopleMatches[0].churchId;
          params.churchName = resp.peopleMatches[0].churchName;
        } else if (resp.peopleMatches.length > 1) {
          params.firstName = resp.peopleMatches[0].firstName;
          params.lastName = resp.peopleMatches[0].lastName;
        }
        Alert.alert(t("common.alert"), t("auth.noAccountFound"), [
          { text: t("auth.register"), onPress: () => router.navigate({ pathname: "/auth/register", params }) },
          { text: "OK" }
        ]);
      }
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (/502|503|504|Internal server error|Failed to fetch|Network request failed/i.test(msg)) {
        Alert.alert(t("common.alert"), "Cannot reach the membership API. Check STAGE and MEMBERSHIP_API in Mobile/.env, and confirm the staging API is deployed.");
      } else {
        Alert.alert(t("common.alert"), t("auth.invalidLogin"));
      }
    }
  };

  const loginApiCall = () => {
    const extra = Constants.expoConfig?.extra ?? {};
    const appName = String(extra.APP_NAME_FOR_EMAIL || "Machon HaRuach");
    const params = { email: email.trim().toLowerCase(), password: password, appName };
    setLoading(true);
    ApiHelper.postAnonymous("/users/login", params, "MembershipApi")
      .then(async (data: LoginResponseInterface) => {
        const accessBlock = getAccessBlockCode(data);
        if (accessBlock) {
          setLoading(false);
          await useUserStore.getState().logout();
          router.replace({ pathname: "/auth/subscription-required", params: { email, reason: accessBlock } });
          return;
        }
        if (data.user != null) {
          const result = await useUserStore.getState().handleLogin(data as any);
          setLoading(false);
          if (result === "failed") {
            Alert.alert(t("common.alert"), t("auth.signInIncomplete"));
            return;
          }
          if (result === "needs_branch") {
            router.replace("/(drawer)/churchSearch");
            return;
          }
          router.replace("/(drawer)/(tabs)/dashboard");
        } else {
          setLoading(false);
          handleLoginFailure();
        }
      })
      .catch(async (error: any) => {
        setLoading(false);
        const accessBlock = getAccessBlockCode(error);
        if (accessBlock) {
          await useUserStore.getState().logout();
          router.replace({ pathname: "/auth/subscription-required", params: { email, reason: accessBlock } });
          return;
        }
        handleLoginFailure();
      });
  };

  const handleForgotPassword = async () => {
    if (email === "") {
      Alert.alert(t("common.alert"), t("auth.enterEmail"));
      return;
    }
    const emailReg = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,6})+$/;
    if (!emailReg.test(email)) {
      Alert.alert(t("common.alert"), t("auth.invalidEmail"));
      return;
    }
    const extra = Constants.expoConfig?.extra ?? {};
    const appUrl = String(extra.ADMIN_WEB_ROOT || extra.B1ADMIN_WEB_ROOT || "https://admin.machonharuach.org").replace(/\/$/, "");
    const appName = String(extra.APP_NAME_FOR_EMAIL || "Machon HaRuach");
    const schemeRaw = Constants.expoConfig?.scheme;
    const scheme = Array.isArray(schemeRaw) ? (schemeRaw[0] || "b1mobile") : (schemeRaw || "b1mobile");
    const mobilePasswordResetBase = ExpoLinking.createURL("/auth/set-password", { scheme });
    const mobileAndroidPackage = Constants.expoConfig?.android?.package ?? "org.machonharuach.mobile";
    const resetHandoffApiBase = EnvironmentHelper.MembershipApi.replace(/\/$/, "");
    setForgotSending(true);
    try {
      await ApiHelper.postAnonymous(
        "/users/forgot",
        {
          userEmail: email.trim(),
          appUrl,
          appName,
          fromEmail: "",
          fromName: "",
          subject: "",
          body: "",
          mobilePasswordResetBase,
          mobileAndroidPackage,
          resetHandoffApiBase
        },
        "MembershipApi"
      );
      // API returns { emailed: false } when no user exists; same message avoids account enumeration.
      Alert.alert(t("common.alert"), t("auth.forgotEmailSent"));
    } catch (e: any) {
      Alert.alert(t("common.error"), messageForForgotPasswordFailure(String(e?.message ?? ""), t));
    } finally {
      setForgotSending(false);
    }
  };

  return (
    <LoadingWrapper loading={loading}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 24) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingTop: 8, paddingBottom: 16 }}>
            <Text style={styles.title}>{t("auth.signIn")}</Text>
            <Text style={styles.subtitle}>{t("auth.signInToAccess")}</Text>
          </View>

          <TextInput
            mode="outlined"
            label={t("auth.emailLabel")}
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChangeText={setEmail}
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
            accessibilityLabel="Email address"
          />

          <TextInput
            mode="outlined"
            label={t("auth.passwordLabel")}
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
            style={styles.field}
            outlineStyle={styles.fieldOutline}
            theme={{ colors: { primary: "#FFFFFF", onSurfaceVariant: "rgba(255,255,255,0.72)" } }}
            left={<TextInput.Icon icon="lock" color="rgba(255,255,255,0.72)" />}
            right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(v => !v)} />}
            textColor="#FFFFFF"
            accessibilityLabel="Password"
          />

          <Pressable
            style={styles.forgotWrap}
            onPress={() => void handleForgotPassword()}
            disabled={forgotSending || loading}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
          >
            <Text style={[styles.forgotText, (forgotSending || loading) && styles.forgotTextDisabled]}>{forgotSending ? t("auth.forgotSending") : t("auth.forgotPassword")}</Text>
          </Pressable>

          <Button
            mode="contained"
            onPress={() => validateDetails() && loginApiCall()}
            loading={loading}
            disabled={loading}
            style={styles.primaryButton}
            contentStyle={{ height: 56 }}
            labelStyle={styles.primaryButtonLabel}
            buttonColor="#FFFFFF"
            textColor="#0F1118"
            accessibilityLabel="Sign in"
          >
            {t("auth.signIn")}
          </Button>

          <Text style={styles.privacyText}>
            {t("auth.privacyConsent")}{" "}
            <Text style={styles.privacyLink} onPress={() => router.navigate("/auth/privacy")}>
              {t("auth.privacyPolicy")}
            </Text>
          </Text>

          <Text style={styles.registerRow}>
            {t("auth.noAccount")}{" "}
            <Text style={styles.registerLink} onPress={() => router.navigate("/auth/register")} accessibilityRole="link" accessibilityLabel="Create an account">
              {t("auth.register")}
            </Text>
          </Text>

          <View style={{ height: 16 }} />
        </ScrollView>
      </SafeAreaView>
    </LoadingWrapper>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#06080E"
  },
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
  field: {
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  fieldOutline: {
    borderRadius: 14,
    borderColor: "rgba(255,255,255,0.24)"
  },
  forgotWrap: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginBottom: 16
  },
  forgotText: { color: "rgba(255,255,255,0.92)" },
  forgotTextDisabled: { opacity: 0.55 },
  primaryButton: { borderRadius: 999 },
  primaryButtonLabel: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16
  },
  privacyText: {
    color: "rgba(255,255,255,0.68)",
    marginTop: 16,
    textAlign: "center"
  },
  privacyLink: {
    color: "#FFFFFF",
    textDecorationLine: "underline"
  },
  registerRow: {
    color: "rgba(255,255,255,0.82)",
    marginTop: 14,
    textAlign: "center"
  },
  registerLink: {
    color: "#FFFFFF",
    textDecorationLine: "underline"
  }
  // (removed New to B1 help container)
});

export default Login;
