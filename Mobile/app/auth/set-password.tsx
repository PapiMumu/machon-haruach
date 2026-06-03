import React, { useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Text, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingWrapper } from "../../src/components/wrapper/LoadingWrapper";
import { ApiHelper } from "../../src/helpers";

const paramString = (v: string | string[] | undefined): string => {
  if (v == null) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
};

const SetPassword = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string; authGuid?: string }>();
  const email = paramString(params.email);
  const authGuid = paramString(params.authGuid);

  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const submit = async () => {
    if (!authGuid) {
      Alert.alert(t("common.error"), t("auth.setPasswordInvalidSession"), [{ text: "OK", onPress: () => router.replace("/auth/login") }]);
      return;
    }
    if (!password) {
      Alert.alert(t("common.alert"), t("auth.enterPassword"));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t("common.alert"), t("profileEdit.passwordRequirements"));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t("common.alert"), t("profileEdit.passwordsMustMatch"));
      return;
    }

    setLoading(true);
    try {
      const result = await ApiHelper.postAnonymous(
        "/users/setPasswordGuid",
        { authGuid, email: email || undefined, newPassword: password },
        "MembershipApi"
      );
      if (result?.success === true) {
        Alert.alert(t("common.success"), t("auth.setPasswordSuccess"), [{ text: "OK", onPress: () => router.replace("/auth/login") }]);
      } else {
        Alert.alert(t("common.error"), t("auth.setPasswordFailed"));
      }
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message || t("auth.setPasswordFailed"));
    } finally {
      setLoading(false);
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
          style={[styles.backRow, { paddingTop: Math.max(insets.top, 8) }]}>
          <MaterialIcons name="chevron-left" size={32} color="#FFFFFF" />
        </Pressable>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 24) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={{ paddingTop: 8, paddingBottom: 16 }}>
            <Text style={styles.title}>{t("auth.setPasswordTitle")}</Text>
            <Text style={styles.subtitle}>{t("auth.setPasswordHint")}</Text>
          </View>

          {email ? (
            <Text style={styles.emailText}>{email}</Text>
          ) : null}

          <TextInput
            mode="outlined"
            label={t("auth.newPasswordLabel")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            autoComplete="password-new"
            style={styles.field}
            outlineStyle={styles.fieldOutline}
            theme={{ colors: { primary: "#FFFFFF", onSurfaceVariant: "rgba(255,255,255,0.72)" } }}
            left={<TextInput.Icon icon="lock" color="rgba(255,255,255,0.72)" />}
            right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(v => !v)} />}
            textColor="#FFFFFF"
          />

          <TextInput
            mode="outlined"
            label={t("auth.confirmPasswordLabel")}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            autoComplete="password-new"
            style={styles.field}
            outlineStyle={styles.fieldOutline}
            theme={{ colors: { primary: "#FFFFFF", onSurfaceVariant: "rgba(255,255,255,0.72)" } }}
            left={<TextInput.Icon icon="lock-check" color="rgba(255,255,255,0.72)" />}
            right={<TextInput.Icon icon={showConfirm ? "eye-off" : "eye"} onPress={() => setShowConfirm(v => !v)} />}
            textColor="#FFFFFF"
          />

          <Button
            mode="contained"
            onPress={submit}
            loading={loading}
            disabled={loading}
            style={styles.primaryButton}
            contentStyle={{ height: 56 }}
            labelStyle={styles.primaryButtonLabel}
            buttonColor="#FFFFFF"
            textColor="#0F1118">
            {t("auth.savePassword")}
          </Button>
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
  emailText: {
    color: "rgba(255,255,255,0.72)",
    marginBottom: 12
  },
  field: {
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  fieldOutline: {
    borderRadius: 14,
    borderColor: "rgba(255,255,255,0.24)"
  },
  primaryButton: { borderRadius: 999 },
  primaryButtonLabel: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16
  }
});

export default SetPassword;
