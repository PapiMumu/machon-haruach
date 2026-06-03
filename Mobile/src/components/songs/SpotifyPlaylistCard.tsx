import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { OptimizedImage } from "../OptimizedImage";
import { DimensionHelper } from "../../helpers/DimensionHelper";

const SIZE = DimensionHelper.wp(38);

interface SpotifyPlaylistCardProps {
  title: string;
  subtitle?: string;
  thumbnail?: string;
  onPress: () => void;
}

export const SpotifyPlaylistCard: React.FC<SpotifyPlaylistCardProps> = ({ title, subtitle, thumbnail, onPress }) => {
  const hasImage = thumbnail && thumbnail.trim() !== "";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrap}>
      <View style={styles.artwork}>
        {hasImage ? (
          <OptimizedImage source={{ uri: thumbnail }} style={styles.image} contentFit="cover" />
        ) : (
          <LinearGradient colors={["#1a472a", "#1DB954", "#121212"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.image}>
            <MaterialIcons name="queue-music" size={36} color="rgba(255,255,255,0.92)" />
          </LinearGradient>
        )}
        <View style={styles.playBadge}>
          <MaterialIcons name="play-arrow" size={20} color="#000000" />
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

export const SPOTIFY_PLAYLIST_WIDTH = SIZE + 12;

const styles = StyleSheet.create({
  wrap: { width: SIZE + 12 },
  artwork: {
    width: SIZE,
    height: SIZE,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#282828",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10
  },
  image: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center"
  },
  playBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 6
  },
  title: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
    lineHeight: 18
  },
  subtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500"
  }
});
