import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { OptimizedImage } from "../OptimizedImage";
import { DimensionHelper } from "../../helpers/DimensionHelper";

const SIZE = DimensionHelper.wp(32);

interface SpotifySingleCardProps {
  title: string;
  artist?: string;
  thumbnail?: string;
  canPlay?: boolean;
  onPress: () => void;
}

export const SpotifySingleCard: React.FC<SpotifySingleCardProps> = ({ title, artist, thumbnail, canPlay, onPress }) => {
  const hasImage = thumbnail && thumbnail.trim() !== "";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.wrap}>
      <View style={styles.artwork}>
        {hasImage ? (
          <OptimizedImage source={{ uri: thumbnail }} style={styles.image} contentFit="cover" />
        ) : (
          <LinearGradient colors={["#2d1b69", "#11998e", "#191414"]} style={styles.image}>
            <MaterialIcons name="music-note" size={32} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        )}
        {canPlay ? (
          <View style={styles.playBadge}>
            <MaterialIcons name="play-arrow" size={18} color="#000000" />
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {artist ? (
        <Text style={styles.artist} numberOfLines={1}>
          {artist}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

export const SPOTIFY_SINGLE_WIDTH = SIZE + 10;

const styles = StyleSheet.create({
  wrap: { width: SIZE + 10 },
  artwork: {
    width: SIZE,
    height: SIZE,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#282828"
  },
  image: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center"
  },
  playBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4
  },
  title: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    lineHeight: 16
  },
  artist: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginTop: 2
  }
});
