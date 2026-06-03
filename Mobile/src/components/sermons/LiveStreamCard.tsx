import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Text, Card, Button } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { formatStreamScheduleDisplay } from "../../helpers/streamingTimeDisplay";
import { useThemeColors } from "../../theme";

export interface LiveStreamData {
  isLive: boolean;
  nextStreamDate: Date;
  streamTitle: string;
  streamDescription: string;
  streamUrl: string;
  /** YouTube/Vimeo embed URL when the service is live */
  embedUrl?: string | null;
  /** Church/service IANA timezone for schedule display (e.g. Africa/Harare) */
  scheduleTimeZone?: string;
}

interface LiveStreamCardProps {
  liveStreamData: LiveStreamData;
  timeUntilStream: {
    expired: boolean;
    days: number;
    hours: number;
    minutes: number;
  };
  onWatchLive?: () => void;
}

export const LiveStreamCard: React.FC<LiveStreamCardProps> = ({ liveStreamData, timeUntilStream, onWatchLive }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const scheduleLabel = formatStreamScheduleDisplay(
    liveStreamData.nextStreamDate,
    liveStreamData.scheduleTimeZone
  );

  const showLiveExperience =
    liveStreamData.isLive ||
    (timeUntilStream.expired && Boolean(liveStreamData.embedUrl?.trim() || liveStreamData.streamUrl?.trim()));

  if (showLiveExperience) {
    return (
      <Card style={[styles.liveCard, { shadowColor: colors.error, backgroundColor: "#1A1A1A" }]}>
        <LinearGradient colors={["#D32F2F", "#F44336"]} style={styles.liveGradient}>
          <View style={styles.liveContent}>
            <View style={styles.liveIndicator}>
              <View style={[styles.liveDot, { backgroundColor: colors.white }]} />
              <Text variant="titleMedium" style={[styles.liveText, { color: colors.white }]}>
                {t("sermons.liveNow")}
              </Text>
            </View>
            <Text variant="headlineSmall" style={[styles.liveTitle, { color: colors.white }]}>
              {liveStreamData.streamTitle}
            </Text>
            <Text variant="bodyMedium" style={[styles.liveDescription, { color: colors.white }]}>
              {liveStreamData.streamDescription}
            </Text>
            <Button
              mode="contained"
              style={[styles.watchButton, { backgroundColor: colors.white }]}
              labelStyle={[styles.watchButtonText, { color: colors.error }]}
              icon="play-circle"
              onPress={() => onWatchLive?.()}>
              {t("sermons.watchLive")}
            </Button>
          </View>
        </LinearGradient>
      </Card>
    );
  }

  const gradientColors: [string, string, string] = ["#070B14", "#10192A", colors.primary];

  const timeChip = (key: string, value: number, singular: string, plural: string) => (
    <View key={key} style={styles.timeChip}>
      <Text
        variant="displaySmall"
        style={[
          styles.timeNumberModern,
          { color: colors.white },
          Platform.OS === "ios" && ({ fontVariant: ["tabular-nums"] } as const)
        ]}>
        {value}
      </Text>
      <Text variant="labelSmall" style={[styles.timeLabelModern, { color: "rgba(255,255,255,0.82)" }]}>
        {(value === 1 ? singular : plural).toUpperCase()}
      </Text>
    </View>
  );

  return (
    <Card style={[styles.countdownCard, { shadowColor: "#000" }]}>
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.countdownGradient}>
        <View style={[styles.countdownAccent, { backgroundColor: colors.primary }]} />
        <View style={styles.countdownContent}>
          <Text variant="labelMedium" style={[styles.countdownLabel, { color: "rgba(255,255,255,0.72)" }]}>
            {t("sermons.nextServiceIn")}
          </Text>
          <View style={styles.countdownTimer}>
            {timeUntilStream.days > 0 ? timeChip("days", timeUntilStream.days, t("sermons.day"), t("sermons.days")) : null}
            {timeChip("hours", timeUntilStream.hours, t("sermons.hour"), t("sermons.hours"))}
            {timeChip("minutes", timeUntilStream.minutes, t("sermons.minute"), t("sermons.minutes"))}
          </View>
          <View style={styles.countdownDivider} />
          <Text variant="titleLarge" style={[styles.streamTitle, { color: colors.white }]}>
            {liveStreamData.streamTitle}
          </Text>
          <Text variant="bodyMedium" style={[styles.streamDescription, { color: "rgba(255,255,255,0.88)" }]}>
            {liveStreamData.streamDescription}
          </Text>
          <View style={[styles.streamTimePill, { borderColor: "rgba(255,255,255,0.14)" }]}>
            <Text variant="labelLarge" style={[styles.streamTime, { color: "rgba(255,255,255,0.92)" }]}>
              {scheduleLabel.date} · {scheduleLabel.time}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Card>
  );
};

const styles = StyleSheet.create({
  liveCard: {
    marginBottom: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3
  },
  liveGradient: {
    padding: 24,
    alignItems: "center"
  },
  liveContent: { alignItems: "center" },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  liveText: {
    fontWeight: "800",
    letterSpacing: 1
  },
  liveTitle: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8
  },
  liveDescription: {
    opacity: 0.9,
    textAlign: "center",
    marginBottom: 20
  },
  watchButton: {
    borderRadius: 25,
    paddingHorizontal: 24
  },
  watchButtonText: { fontWeight: "700" },
  countdownCard: {
    marginBottom: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    elevation: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    backgroundColor: "#070B14"
  },
  countdownGradient: {
    paddingTop: 22,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: "center"
  },
  countdownAccent: {
    alignSelf: "center",
    width: 44,
    height: 3,
    borderRadius: 2,
    marginBottom: 18,
    opacity: 0.95
  },
  countdownContent: {
    alignItems: "center",
    width: "100%"
  },
  countdownLabel: {
    fontWeight: "600",
    marginBottom: 18,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontSize: 11
  },
  countdownTimer: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 22,
    gap: 10
  },
  timeChip: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: 78,
    alignItems: "center"
  },
  timeNumberModern: {
    fontWeight: "800",
    fontSize: 34,
    lineHeight: 40,
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10
  },
  timeLabelModern: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8
  },
  countdownDivider: {
    height: 1,
    width: "100%",
    maxWidth: 280,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 18
  },
  streamTitle: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.2,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6
  },
  streamDescription: {
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 22,
    paddingHorizontal: 4
  },
  streamTimePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.22)"
  },
  streamTime: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2
  }
});
