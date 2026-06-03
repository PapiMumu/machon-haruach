import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import WebView from "react-native-webview";
import { Button, Text } from "react-native-paper";
import { ApiHelper } from "../../src/helpers";
import { MainHeader } from "../../src/components/wrapper/MainHeader";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "../../src/theme";

type Params = {
  browserUrl?: string;
  pollUrl?: string;
  gatewayId?: string;
  churchId?: string;
  personId?: string;
  method?: string;
  amount?: string;
  isRecurring?: string;
  interval?: string;
};

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

export default function PaynowCheckout() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const params = useLocalSearchParams<Params>();
  const webviewRef = useRef<WebView>(null);
  const [checking, setChecking] = useState(false);
  const [done, setDone] = useState(false);

  const browserUrl = asString(params.browserUrl);
  const pollUrl = asString(params.pollUrl);
  const gatewayId = asString(params.gatewayId);
  const churchId = asString(params.churchId);
  const personId = asString(params.personId);
  const method = asString(params.method);
  const amount = asString(params.amount);
  const isRecurring = asString(params.isRecurring) === "true";
  const interval = asString(params.interval);

  const ready = !!browserUrl && !!pollUrl && !!churchId;

  const payload = useMemo(() => ({ pollUrl, gatewayId, churchId, personId, method }), [pollUrl, gatewayId, churchId, personId, method]);

  const checkStatus = async () => {
    if (!ready || checking || done) return;
    setChecking(true);
    try {
      const result = await ApiHelper.post("/donate/paynow/status", payload, "GivingApi");
      const status = String((result as any)?.status || (result as any)?.Status || "").toLowerCase();
      // Paynow status values vary; backend also marks complete when it detects "paid-like" statuses.
      const paidLike = status.includes("paid") || status.includes("delivered") || status.includes("awaiting delivery") || status.includes("success");
      if (paidLike) {
        setDone(true);
        Alert.alert(t("donations.success"), t("donations.thankYou"), [
          {
            text: t("common.ok"),
            onPress: () => {
              // Return to Giving screen; donation screen will refresh via its own queries.
              router.back();
            }
          }
        ]);
      }
    } catch (err: any) {
      // Swallow transient errors while polling; user can retry manually.
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      checkStatus();
    }, 3000);
    return () => clearInterval(id);

  }, [ready, done, pollUrl, churchId, gatewayId]);

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: "#000000" }]}>
        <MainHeader title="Paynow" openDrawer={() => {}} back={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.title}>Paynow checkout is not ready</Text>
          <Text style={styles.subtitle}>Missing payment URL or configuration.</Text>
          <Button mode="contained" onPress={() => router.back()} style={styles.backBtn} buttonColor="#E4E7ED" textColor="#1A1A1A">
            {t("common.ok")}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000000" }]}>
      <MainHeader title="Paynow" openDrawer={() => {}} back={() => router.back()} />

      <View style={styles.webWrap}>
        <WebView
          ref={webviewRef}
          source={{ uri: browserUrl }}
          startInLoadingState
          allowsBackForwardNavigationGestures
          scalesPageToFit={false}
          // Helps Paynow pages behave more consistently on Android
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled={Platform.OS === "android"}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.footerText}>
          <Text style={styles.footerTitle}>{isRecurring ? t("donations.recurring") : t("donations.donate")}</Text>
          <Text style={styles.footerSubtitle}>{amount ? `${t("donations.amount")}: ${amount}` : t("donations.paymentMethods")}</Text>
          {isRecurring && interval ? <Text style={styles.footerSubtitle}>{t("donations.frequency")}: {interval}</Text> : null}
        </View>

        <Button
          mode="contained"
          onPress={checkStatus}
          loading={checking}
          disabled={checking || done}
          style={styles.checkBtn}
          buttonColor={colors.primary}
          textColor="#FFFFFF"
        >
          Check status
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webWrap: { flex: 1 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#000000"
  },
  footerText: { marginBottom: 10 },
  footerTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  footerSubtitle: { color: "rgba(255,255,255,0.7)", marginTop: 2 },
  checkBtn: { borderRadius: 999, minHeight: 50, justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  title: { color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginBottom: 8, textAlign: "center" },
  subtitle: { color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 16 },
  backBtn: { borderRadius: 999, minHeight: 50, justifyContent: "center", paddingHorizontal: 24 }
});

