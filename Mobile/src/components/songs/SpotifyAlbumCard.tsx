import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { OptimizedImage } from "../OptimizedImage";
import { DimensionHelper } from "../../helpers/DimensionHelper";

const SIZE = DimensionHelper.wp(36);

interface SpotifyAlbumCardProps {
  title: string;
  artist?: string;
  thumbnail?: string;
  metaLabel: string;
  onPress: () => void;
}

export const SpotifyAlbumCard: React.FC<SpotifyAlbumCardProps> = ({ title, artist, thumbnail, metaLabel, onPress }) => {
  const hasImage = thumbnail && thumbnail.trim() !== "";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.wrap}>
      <View style={styles.artwork}>
        {hasImage ? (
          <OptimizedImage source={{ uri: thumbnail }} style={styles.image} contentFit="cover" />
        ) : (
          <LinearGradient colors={["#1a472a", "#1DB954", "#191414"]} style={styles.image}>
            <MaterialIcons name="album" size={40} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {artist ? (
        <Text style={styles.artist} numberOfLines={1}>
          {artist}
        </Text>
      ) : null}
      <Text style={styles.meta}>{metaLabel}</Text>
    </TouchableOpacity>
  );
};

export const SPOTIFY_ALBUM_WIDTH = SIZE + 12;

const styles = StyleSheet.create({
  wrap: { width: SIZE + 12 },
  artwork: {
    width: SIZE,
    height: SIZE,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#282828",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8
  },
  image: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10
  },
  artist: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    marginTop: 2
  },
  meta: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 2
  }
});
