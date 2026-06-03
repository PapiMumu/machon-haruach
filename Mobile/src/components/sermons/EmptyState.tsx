import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, Card } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { useThemeColors, CommonStyles } from "../../theme";

interface EmptyStateProps {
  type: "playlists" | "sermons" | "songs";
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const iconName = type === "playlists" ? "playlist-add" : type === "songs" ? "library-music" : "video-library";
  const title =
    type === "playlists"
      ? "No Sermon Series Available"
      : type === "songs"
        ? t("songs.noSongs")
        : "No Recent Sermons";
  const subtitle =
    type === "playlists"
      ? "Check back later for new sermon series from your church."
      : type === "songs"
        ? t("songs.noSongsMessage")
        : "Check back later for new sermons from your church.";

  return (
    <Card style={[styles.emptyCard, { shadowColor: colors.shadowBlack }]}>
      <Card.Content style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name={iconName} size={28} color={colors.white} />
        </View>
        <Text variant="titleMedium" style={[styles.title, CommonStyles.textCenter]}>
          {title}
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, CommonStyles.textCenter]}>
          {subtitle}
        </Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1A1A1A",
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3
  },
  content: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 14
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginBottom: 8
  },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    lineHeight: 21
  }
});
