import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Card } from "react-native-paper";
import { DateHelper } from "../../helpers";
import { SermonInterface } from "@machonharuach/helpers";
import { useThemeColors } from "../../theme";

interface SermonInfoProps {
  sermon: SermonInterface;
  playlistTitle?: string;
  formatDuration: (seconds?: number) => string;
}

export const SermonInfo: React.FC<SermonInfoProps> = ({ sermon, playlistTitle, formatDuration }) => {
  const colors = useThemeColors();
  return (
    <Card style={[styles.infoCard, { shadowColor: colors.shadowBlack }]}>
      <Card.Content style={styles.infoContent}>
        {playlistTitle && (
          <View style={styles.seriesChip}>
            <Text variant="labelMedium" style={[styles.seriesLabel, { color: colors.primary }]}>
              {playlistTitle}
            </Text>
          </View>
        )}

        <Text variant="headlineSmall" style={[styles.sermonTitle, { color: "#FFFFFF" }]}>
          {sermon.title || "Untitled Sermon"}
        </Text>

        <View style={styles.metaRow}>
          <Text variant="bodyMedium" style={[styles.dateText, { color: "rgba(255,255,255,0.7)" }]}>
            {sermon.publishDate ? DateHelper.prettyDate(DateHelper.toDate(sermon.publishDate)) : ""}
          </Text>
          {sermon.duration && (
            <>
              <Text variant="bodyMedium" style={[styles.separator, { color: "rgba(255,255,255,0.7)" }]}>
                •
              </Text>
              <Text variant="bodyMedium" style={[styles.durationInfo, { color: "rgba(255,255,255,0.7)" }]}>
                {formatDuration(sermon.duration)}
              </Text>
            </>
          )}
        </View>

        {sermon.description && (
          <Text variant="bodyMedium" style={[styles.description, { color: "rgba(255,255,255,0.86)" }]}>
            {sermon.description}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    marginBottom: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1A1A1A",
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3
  },
  infoContent: { padding: 20 },
  seriesChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)"
  },
  seriesLabel: {
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    fontSize: 11
  },
  sermonTitle: {
    fontWeight: "800",
    marginBottom: 12,
    lineHeight: 36
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  dateText: {},
  separator: { marginHorizontal: 8 },
  durationInfo: {},
  description: { lineHeight: 22 }
});
