import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { OptimizedImage } from "../OptimizedImage";
import { DimensionHelper } from "../../helpers/DimensionHelper";

const POSTER_WIDTH = DimensionHelper.wp(40);
const POSTER_HEIGHT = POSTER_WIDTH * (9 / 16);

export type NetflixPosterVariant = "sermon" | "series";

interface NetflixPosterCardProps {
  title: string;
  thumbnail?: string;
  subtitle?: string;
  variant: NetflixPosterVariant;
  badge?: "recent" | "new" | null;
  onPress: () => void;
}

export const NetflixPosterCard: React.FC<NetflixPosterCardProps> = ({
  title,
  thumbnail,
  subtitle,
  variant,
  badge,
  onPress
}) => {
  const hasImage = thumbnail && thumbnail.trim() !== "";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrap}>
      <View style={styles.poster}>
        {hasImage ? (
          <OptimizedImage source={{ uri: thumbnail }} style={styles.image} contentFit="cover" />
        ) : (
          <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} style={styles.image}>
            <MaterialIcons
              name={variant === "series" ? "playlist-play" : "play-circle-outline"}
              size={36}
              color="rgba(255,255,255,0.85)"
            />
          </LinearGradient>
        )}
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.75)"]} style={styles.imageGradient} />
        {badge ? (
          <View style={[styles.badge, badge === "recent" ? styles.badgeRecent : styles.badgeNew]}>
            <Text style={styles.badgeText}>{badge === "recent" ? "RECENT" : "NEW"}</Text>
          </View>
        ) : null}
        {variant === "series" ? (
          <View style={styles.seriesIcon}>
            <MaterialIcons name="video-library" size={14} color="#FFFFFF" />
          </View>
        ) : null}
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

export const NETFLIX_POSTER_WIDTH = POSTER_WIDTH;

const styles = StyleSheet.create({
  wrap: { width: POSTER_WIDTH },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1A1A1A"
  },
  image: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center"
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%"
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeRecent: { backgroundColor: "#E50914" },
  badgeNew: { backgroundColor: "#46D369" },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6
  },
  seriesIcon: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 4,
    padding: 4
  },
  title: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
    lineHeight: 17
  },
  subtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500"
  }
});
