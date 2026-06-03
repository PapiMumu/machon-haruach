import React from "react";
import { View, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { OptimizedImage } from "../OptimizedImage";
import { DateHelper } from "../../helpers";
import { SermonInterface } from "@machonharuach/helpers";
import { useTranslation } from "react-i18next";
import { useThemeColors, CommonStyles } from "../../theme";

const HERO_HEIGHT = Dimensions.get("window").width * 0.62;

interface FeaturedSermonProps {
  sermon: SermonInterface;
  onPress: (sermon: SermonInterface) => void;
}

export const FeaturedSermon: React.FC<FeaturedSermonProps> = ({ sermon, onPress }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const hasImage = sermon.thumbnail && sermon.thumbnail.trim() !== "";
  const durationText =
    sermon.duration && sermon.duration > 0
      ? `${Math.floor(sermon.duration / 60)}:${(sermon.duration % 60).toString().padStart(2, "0")}`
      : "";

  return (
    <TouchableOpacity onPress={() => onPress(sermon)} activeOpacity={0.92} style={styles.heroWrap}>
      <View style={styles.heroContainer}>
        {hasImage ? (
          <OptimizedImage source={{ uri: sermon.thumbnail }} style={styles.heroImage} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={["#0d0d12", "#1a1a2e", "#16213e"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[CommonStyles.absoluteFill, styles.heroFallback]}>
            <MaterialIcons name="movie" size={72} color="rgba(255,255,255,0.25)" />
          </LinearGradient>
        )}

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.92)"]}
          locations={[0, 0.45, 1]}
          style={styles.heroGradient}
        />

        <View style={styles.badgeRow}>
          <View style={styles.recentBadge}>
            <Text style={styles.recentBadgeText}>{t("sermons.recentBadge")}</Text>
          </View>
          {durationText ? (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{durationText}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroLabel}>{t("sermons.latestSermon")}</Text>
          <Text style={styles.heroTitle} numberOfLines={3}>
            {sermon.title || "Untitled Sermon"}
          </Text>
          {sermon.publishDate ? (
            <Text style={styles.heroDate}>{DateHelper.prettyDate(DateHelper.toDate(sermon.publishDate))}</Text>
          ) : null}
          <View style={styles.playRow}>
            <View style={[styles.playButton, { backgroundColor: colors.white }]}>
              <MaterialIcons name="play-arrow" size={28} color="#000000" />
            </View>
            <Text style={styles.playLabel}>{t("sermons.playNow")}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  heroWrap: {
    marginBottom: 8,
    marginHorizontal: -16
  },
  heroContainer: {
    height: HERO_HEIGHT,
    width: "100%",
    backgroundColor: "#141414",
    overflow: "hidden"
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },
  heroFallback: {
    justifyContent: "center",
    alignItems: "center"
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject
  },
  badgeRow: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  recentBadge: {
    backgroundColor: "#E50914",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4
  },
  recentBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8
  },
  durationBadge: {
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4
  },
  durationText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  heroContent: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24
  },
  heroLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 30,
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6
  },
  heroDate: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginBottom: 14,
    fontWeight: "500"
  },
  playRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  playLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  }
});
