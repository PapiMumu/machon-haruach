import React from "react";
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Button, Text } from "react-native-paper";
import { router } from "expo-router";
import { Poppins_700Bold, Poppins_800ExtraBold, useFonts } from "@expo-google-fonts/poppins";
import { useThemeColors } from "../src/theme";

const Welcome = () => {
  const tc = useThemeColors();
  const [fontsLoaded, fontError] = useFonts({
    Poppins_800ExtraBold,
    Poppins_700Bold
  });
  const { width, height } = useWindowDimensions();
  const minSide = Math.min(width, height);
  const isSmallPhone = minSide < 370;
  const isLargePhone = minSide >= 430;

  const titleSize = isSmallPhone ? 37 : isLargePhone ? 48 : 42;
  const titleLineHeight = isSmallPhone ? 42 : isLargePhone ? 53 : 47;
  const horizontalPadding = isSmallPhone ? 16 : isLargePhone ? 24 : 20;
  const bottomPadding = isSmallPhone ? 20 : isLargePhone ? 36 : 28;
  const buttonHeight = isSmallPhone ? 50 : isLargePhone ? 58 : 54;

  const titleColor = "#FFFFFF";
  const buttonBackground = "#FFFFFF";
  const buttonText = "#0F1118";

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.fontLoading}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (fontError) {
    console.warn("[Welcome] Poppins failed to load; using system fonts.", fontError);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={tc.isDark ? "light-content" : "dark-content"} />
      <Image
        source={require("../src/assets/images/Welcome.jpg")}
        style={styles.backgroundImage}
        contentFit="cover"
        contentPosition="center"
        allowDownscaling={false}
        transition={0}
        cachePolicy="none"
      />

      <View style={[styles.content, { paddingHorizontal: horizontalPadding, paddingBottom: bottomPadding }]}>
        <Text
          style={[
            styles.title,
            { color: titleColor, fontSize: titleSize, lineHeight: titleLineHeight },
            fontsLoaded ? { fontFamily: "Poppins_800ExtraBold" } : null
          ]}
        >
          Welcome to{"\n"}Machon HaRuach
        </Text>

        <Button
          mode="contained"
          style={[styles.button, { backgroundColor: buttonBackground }]}
          contentStyle={[styles.buttonContent, { height: buttonHeight }]}
          labelStyle={[styles.buttonLabel, { color: buttonText }, fontsLoaded ? { fontFamily: "Poppins_700Bold" } : null]}
          onPress={() => router.push("/get-started")}
        >
          Get Started
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  backgroundImage: { ...StyleSheet.absoluteFillObject },
  content: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 28
  },
  fontLoading: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    fontSize: 42,
    lineHeight: 47,
    letterSpacing: -1.1,
    marginBottom: 24,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8
  },
  button: {
    borderRadius: 999,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)"
  },
  buttonContent: { height: 56 },
  buttonLabel: { fontSize: 16 }
});

export default Welcome;
