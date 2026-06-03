import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { AlbumCreditLine } from "./formatSongCredits";

interface AlbumCreditsSectionProps {
  lines: AlbumCreditLine[];
}

export const AlbumCreditsSection: React.FC<AlbumCreditsSectionProps> = ({ lines }) => {
  const { t } = useTranslation();
  if (!lines.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{t("songs.albumCredits")}</Text>
      {lines.map((line) => (
        <View key={line.labelKey} style={styles.line}>
          <Text style={styles.label}>{t(line.labelKey)}</Text>
          <Text style={styles.value}>{line.values.join(", ")}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)"
  },
  heading: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10
  },
  line: {
    marginBottom: 8
  },
  label: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2
  },
  value: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    lineHeight: 20
  }
});
