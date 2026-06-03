import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, Card } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { OptimizedImage } from "../OptimizedImage";
import { PublicSongInterface } from "../../interfaces/Song";
import { useThemeColors, CommonStyles } from "../../theme";

interface SongCardProps {
  song: PublicSongInterface;
  onPress: (song: PublicSongInterface) => void;
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const SongCard: React.FC<SongCardProps> = ({ song, onPress }) => {
  const colors = useThemeColors();
  const hasImage = song.thumbnail && song.thumbnail.trim() !== "";
  const durationText = formatDuration(song.seconds);
  const subtitle = [song.artist, song.album].filter(Boolean).join(" · ");
  const canPlay = !!song.audioUrl?.trim();

  return (
    <TouchableOpacity onPress={() => onPress(song)}>
      <Card style={[styles.card, { shadowColor: colors.shadowBlack, backgroundColor: "#1A1A1A" }]}>
        <View style={styles.footer}>
          <View style={styles.thumb}>
            {hasImage ? (
              <OptimizedImage source={{ uri: song.thumbnail }} style={styles.thumbImage} contentFit="cover" />
            ) : (
              <LinearGradient colors={["#1C2040", "#2F3465", "#4B5288"]} style={styles.thumbImage}>
                <View style={styles.thumbIcon}>
                  <MaterialIcons name="music-note" size={26} color={colors.onPrimary} opacity={0.9} />
                </View>
              </LinearGradient>
            )}
          </View>
          <View style={styles.text}>
            <Text variant="titleMedium" style={[styles.title, { color: colors.white }]} numberOfLines={1}>
              {song.title || "Untitled"}
            </Text>
            {subtitle ? (
              <Text variant="bodySmall" style={[styles.subtitle, { color: colors.white }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
            {durationText ? (
              <Text variant="bodySmall" style={[styles.meta, { color: colors.white }]} numberOfLines={1}>
                {durationText}
              </Text>
            ) : null}
          </View>
          {canPlay ? (
            <MaterialIcons name="play-circle-filled" size={32} color="rgba(21, 101, 192, 0.95)" />
          ) : (
            <MaterialIcons name="chevron-right" size={24} color={colors.white} />
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    overflow: "hidden"
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#121212"
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center"
  },
  thumbIcon: {
    ...CommonStyles.absoluteFill,
    justifyContent: "center",
    alignItems: "center"
  },
  text: {
    flex: 1,
    minWidth: 0,
    marginRight: 4
  },
  title: {
    fontWeight: "700",
    marginBottom: 2
  },
  subtitle: { opacity: 0.85 },
  meta: { opacity: 0.65, marginTop: 2 }
});
