import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { parseLyricsForDisplay } from "./parseLyrics";

interface SongLyricsSectionProps {
  lyrics?: string | null;
}

export const SongLyricsSection: React.FC<SongLyricsSectionProps> = ({ lyrics }) => {
  const { t } = useTranslation();
  const lines = parseLyricsForDisplay(lyrics);

  if (!lines.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{t("songs.lyrics")}</Text>
      <View style={styles.body}>
        {lines.map((line, i) => {
          if (line.type === "blank") return <View key={`b-${i}`} style={styles.blank} />;
          if (line.type === "section") {
            return (
              <Text key={`s-${i}`} style={styles.section}>
                {line.text}
              </Text>
            );
          }
          return (
            <Text key={`l-${i}`} style={styles.line}>
              {line.text}
            </Text>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: -0.2
  },
  body: {
    paddingBottom: 24
  },
  section: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8
  },
  line: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 4
  },
  blank: {
    height: 10
  }
});
