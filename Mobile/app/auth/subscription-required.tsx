import React, { useMemo, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { router, useLocalSearchParams } from "expo-router";
import { ApiHelper } from "../../src/helpers";
import { useUserStore } from "../../src/stores/useUserStore";
import type { LoginResponseInterface } from "../../src/helpers/Interfaces";

function asString(v: string | string[] | undefined): string {
  if (!v) return "";
  return Array.isArray(v) ? (v[0] || "") : v;
}

export default function SubscriptionRequired() {
  const params = useLocalSearchParams<{ email?: string; reason?: string }>();
  const [email, setEmail] = useState(asString(params.email));
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const reason = useMemo(() => asString(params.reason), [params.reason]);

  const message = reason === "TRIAL_EXPIRED"
    ? "Your 7-day trial has expired. Activate your monthly subscription to continue."
    : "Your subscription is inactive. Activate it to continue.";

  const activate = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await ApiHelper.postAnonymous("/users/activateSubscription", { email: email.trim(), password }, "MembershipApi") as LoginResponseInterface;
      const result = await useUserStore.getState().handleLogin(data);
      if (result === "full") {
        router.replace("/(drawer)/(tabs)/dashboard");
      } else if (result === "needs_branch") {
        router.replace("/(drawer)/churchSearch");
      } else {
        Alert.alert("Unable to continue", "Subscription activated, but sign-in could not be completed.");
      }
    } catch (e: any) {
      const raw = String(e?.message || "");
      const msg = raw.includes("Login failed") ? "Invalid email or password." : "Could not activate subscription. Please try again.";
      Alert.alert("Activation failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const openMembershipCheckout = () => {
    router.replace("/(drawer)/membershipSubscribe");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Subscription Required</Text>
        <Text style={styles.body}>{message}</Text>

        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.field}
        />
        <TextInput
          mode="outlined"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.field}
        />

        <Button mode="contained" onPress={openMembershipCheckout} disabled={loading}>
          Pay subscription
        </Button>

        <Button mode="outlined" onPress={() => void activate()} loading={loading} disabled={loading}>
          I already subscribed - Refresh Access
        </Button>

        <Button mode="text" onPress={() => router.replace("/auth/login")} disabled={loading}>
          Back to Sign In
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#06080E" },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 20, gap: 12 },
  title: { color: "#FFFFFF", fontSize: 28, fontFamily: "Poppins_800ExtraBold" },
  body: { color: "rgba(255,255,255,0.75)", marginBottom: 8 },
  field: { backgroundColor: "rgba(255,255,255,0.06)" }
});
