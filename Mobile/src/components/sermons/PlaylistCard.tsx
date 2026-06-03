import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, Card } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { OptimizedImage } from "../OptimizedImage";
import { DateHelper } from "../../helpers";
import { PlaylistInterface } from "@machonharuach/helpers";
import { useThemeColors, CommonStyles } from "../../theme";

interface PlaylistCardProps {
  playlist: PlaylistInterface;
  onPress: (playlist: PlaylistInterface) => void;
  variant?: "card" | "list";
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, onPress, variant = "card" }) => {
  const colors = useThemeColors();
  const hasImage = playlist.thumbnail && playlist.thumbnail.trim() !== "";
  const isList = variant === "list";

  return (
    <TouchableOpacity onPress={() => onPress(playlist)}>
      <Card
        style={[
          styles.playlistCard,
          isList ? styles.playlistCardList : null,
          { shadowColor: colors.shadowBlack, backgroundColor: "#1A1A1A" }
        ]}>
        <View style={styles.cardInner}>
          {!isList ? (
            <View style={styles.playlistHero}>
              {hasImage ? (
                <OptimizedImage source={{ uri: playlist.thumbnail }} style={CommonStyles.fillImage} contentFit="cover" />
              ) : (
                <LinearGradient colors={["#1C2040", "#2F3465", "#4B5288"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[CommonStyles.fillImage, styles.playlistFallback]}>
                  <View style={[CommonStyles.absoluteFill, { opacity: 0.3 }]}>
                    <View style={styles.playlistCircle1} />
                    <View style={styles.playlistCircle2} />
                  </View>
                  <View style={styles.playlistIcon}>
                    <MaterialIcons name="playlist-play" size={32} color={colors.onPrimary} opacity={0.9} />
                  </View>
                </LinearGradient>
              )}
            </View>
          ) : null}

          {/* Footer panel (Home-card style) */}
          <View style={[styles.footer, isList ? styles.footerList : null]}>
            <View style={[styles.footerThumb, isList ? styles.footerThumbList : null]}>
              {hasImage ? (
                <OptimizedImage source={{ uri: playlist.thumbnail }} style={styles.footerThumbImage} contentFit="cover" />
              ) : (
                <LinearGradient colors={["#1C2040", "#2F3465", "#4B5288"]} style={styles.footerThumbImage} />
              )}
            </View>
            <View style={styles.footerText}>
              <Text variant="titleMedium" style={[styles.footerTitle, { color: colors.white }]} numberOfLines={1}>
                {playlist.title}
              </Text>
              {playlist.description ? (
                <Text variant="bodySmall" style={[styles.footerSubtitle, { color: colors.white }]} numberOfLines={1}>
                  {playlist.description}
                </Text>
              ) : (
                <Text variant="bodySmall" style={[styles.footerSubtitle, { color: colors.white }]} numberOfLines={1}>
                  {playlist.publishDate ? DateHelper.prettyDate(DateHelper.toDate(playlist.publishDate)) : ""}
                </Text>
              )}
              {playlist.description ? (
                <Text variant="bodySmall" style={[styles.footerMeta, { color: colors.white }]} numberOfLines={1}>
                  {playlist.publishDate ? DateHelper.prettyDate(DateHelper.toDate(playlist.publishDate)) : ""}
                </Text>
              ) : null}
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.white} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  playlistCard: {
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    overflow: "hidden"
  },
  playlistCardList: { borderRadius: 16 },
  cardInner: { position: "relative" },
  playlistHero: {
    position: "relative",
    aspectRatio: 16 / 9,
    width: "100%"
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: "#1A1A1A"
  },
  footerList: { paddingVertical: 12 },
  footerThumb: {
    width: 58,
    height: 58,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#121212"
  },
  footerThumbList: {
    width: 52,
    height: 52,
    borderRadius: 12
  },
  footerThumbImage: {
    width: "100%",
    height: "100%"
  },
  footerText: {
    flex: 1,
    minWidth: 0,
    marginRight: 8
  },
  footerTitle: {
    fontWeight: "700",
    marginBottom: 4
  },
  footerSubtitle: { opacity: 0.85 },
  footerMeta: { opacity: 0.65, marginTop: 2 },
  playlistFallback: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden"
  },
  playlistCircle1: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    top: -20,
    right: -20
  },
  playlistCircle2: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.08)",
    bottom: -15,
    left: -15
  },
  playlistIcon: { zIndex: 2 },
  playlistInfo: {
    flex: 1,
    marginRight: 12
  }
});
