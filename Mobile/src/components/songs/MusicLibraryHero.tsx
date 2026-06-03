import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";

interface MusicLibraryHeroProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
}

export const MusicLibraryHero: React.FC<MusicLibraryHeroProps> = ({ title, subtitle, eyebrow }) => (
  <LinearGradient colors={["#0d2818", "#061208", "#000000"]} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.hero}>
    <View style={styles.glow} />
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <MaterialIcons name="library-music" size={28} color="#1DB954" />
      </View>
      <View style={styles.textCol}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: -16,
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden"
  },
  glow: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(29,185,84,0.12)"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(29,185,84,0.18)",
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.35)",
    alignItems: "center",
    justifyContent: "center"
  },
  textCol: { flex: 1 },
  eyebrow: {
    color: "#1DB954",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 4
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
    fontWeight: "500"
  }
});
