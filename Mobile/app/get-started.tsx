import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold, useFonts } from "@expo-google-fonts/poppins";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ImageBackground, Pressable, SafeAreaView, StatusBar, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

/**
 * Intermediate step after Welcome: new users register, returning users sign in.
 * Reuses existing `/auth/register` and `/auth/login` screens.
 */
const GetStarted = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const minSide = Math.min(width, height);
  const isSmallPhone = minSide < 370;
  const isLargePhone = minSide >= 430;

  const [fontsLoaded, fontError] = useFonts({
    Poppins_800ExtraBold,
    Poppins_700Bold,
    Poppins_600SemiBold
  });

  const headlineSize = isSmallPhone ? 26 : 30;
  const horizontalPadding = isSmallPhone ? 20 : 24;
  const headlineOffset = isSmallPhone ? 76 : 92;
  /** Match Welcome `Get Started` pill (height breakpoints). */
  const registerButtonHeight = isSmallPhone ? 50 : isLargePhone ? 58 : 54;

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.fontLoading}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (fontError) {
    console.warn("[GetStarted] Poppins failed to load; using system fonts.", fontError);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require("../src/assets/images/get-started.webp")} style={styles.backgroundImage} resizeMode="cover" />
      {/* Full-height scrim keeps copy readable over bright backgrounds. */}
      <LinearGradient
        colors={["rgba(6,8,14,0.22)", "rgba(6,8,14,0.36)", "rgba(6,8,14,0.58)", "rgba(6,8,14,0.88)"]}
        locations={[0, 0.4, 0.72, 1]}
        style={styles.overlayScrim}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <SafeAreaView style={styles.safe}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={[styles.backRow, { paddingTop: Math.max(insets.top, 8) }]}
        >
          <MaterialIcons name="chevron-left" size={32} color="#FFFFFF" />
        </Pressable>

        <View style={styles.centerArea}>
          <View style={[styles.textBlock, { paddingHorizontal: horizontalPadding, marginTop: headlineOffset }]}>
            <Text style={[styles.headline, { fontSize: headlineSize }, fontsLoaded ? { fontFamily: "Poppins_800ExtraBold" } : null]}>
              {t("auth.accountChoiceHeadline")}
            </Text>
            <View style={styles.trialPill}>
              <MaterialIcons name="schedule" size={16} color="#60A5FA" />
              <Text style={[styles.trialPillText, fontsLoaded ? { fontFamily: "Poppins_600SemiBold" } : null]}>
                {t("auth.accountChoiceTrialPill")}
              </Text>
            </View>
            <Text style={[styles.trialCaption, fontsLoaded ? { fontFamily: "Poppins_600SemiBold" } : null]}>
              {t("auth.accountChoiceTrialCaption")}
            </Text>
          </View>
        </View>

        <View style={[styles.actions, { paddingHorizontal: horizontalPadding, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Button
            mode="contained"
            onPress={() => router.push("/auth/register")}
            style={styles.registerPrimaryButton}
            contentStyle={[styles.registerPrimaryButtonContent, { height: registerButtonHeight }]}
            labelStyle={[styles.registerPrimaryButtonLabel, fontsLoaded ? { fontFamily: "Poppins_700Bold" } : null]}
            buttonColor="#FFFFFF"
            textColor="#0F1118"
          >
            {t("auth.startFreeTrial")}
          </Button>

          <Pressable onPress={() => router.push("/auth/login")} style={styles.maybeLaterWrap}>
            <Text style={[styles.maybeLaterText, fontsLoaded ? { fontFamily: "Poppins_600SemiBold" } : null]}>{t("auth.signIn")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  fontLoading: {
    flex: 1,
    backgroundColor: "#06080E",
    justifyContent: "center",
    alignItems: "center"
  },
  root: {
    flex: 1,
    backgroundColor: "#06080E"
  },
  backgroundImage: { ...StyleSheet.absoluteFillObject },
  overlayScrim: { ...StyleSheet.absoluteFillObject },
  safe: { flex: 1 },
  centerArea: {
    flex: 1,
    justifyContent: "center"
  },
  backRow: {
    alignSelf: "flex-start",
    paddingLeft: 8,
    paddingRight: 16,
    paddingBottom: 8
  },
  textBlock: {
    paddingTop: 8
  },
  headline: {
    color: "#E5E7EB",
    textAlign: "center",
    letterSpacing: -0.6,
    lineHeight: 36,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 14
  },
  trialPill: {
    marginTop: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.50)",
    backgroundColor: "rgba(59,130,246,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  trialPillText: {
    color: "#DBEAFE",
    fontSize: 12
  },
  trialCaption: {
    marginTop: 8,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10
  },
  spacer: {
    flex: 1,
    minHeight: 24
  },
  actions: { gap: 12 },
  registerPrimaryButton: {
    borderRadius: 999,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)"
  },
  registerPrimaryButtonContent: { height: 56 },
  registerPrimaryButtonLabel: {
    fontSize: 16,
    color: "#0F1118"
  },
  maybeLaterWrap: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20
  },
  maybeLaterText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 16,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10
  }
});

export default GetStarted;
