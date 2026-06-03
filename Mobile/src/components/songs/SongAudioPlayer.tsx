import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "react-native-paper";
import { Audio, AVPlaybackStatus } from "expo-av";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface SongAudioPlayerProps {
  audioUrl: string;
  title?: string;
  variant?: "card" | "spotify";
  onSkipPrevious?: () => void;
  onSkipNext?: () => void;
  canSkipPrevious?: boolean;
  canSkipNext?: boolean;
}

function formatPositionMillis(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const SongAudioPlayer: React.FC<SongAudioPlayerProps> = ({
  audioUrl,
  title,
  variant = "card",
  onSkipPrevious,
  onSkipNext,
  canSkipPrevious = false,
  canSkipNext = false
}) => {
  const isSpotify = variant === "spotify";
  const soundRef = useRef<Audio.Sound | null>(null);
  const onSkipNextRef = useRef(onSkipNext);
  onSkipNextRef.current = onSkipNext;
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) setError(status.error);
      return;
    }
    setPositionMillis(status.positionMillis);
    setDurationMillis(status.durationMillis ?? 0);
    setPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setPlaying(false);
      setPositionMillis(0);
      if (canSkipNext) onSkipNextRef.current?.();
    }
  }, [canSkipNext]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setPositionMillis(0);
      setDurationMillis(0);
      setPlaying(false);
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true
        });
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: false }, onPlaybackStatusUpdate);
        if (!mounted) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
      } catch {
        if (mounted) setError("Unable to load audio");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, [audioUrl, onPlaybackStatusUpdate]);

  const togglePlay = async () => {
    const sound = soundRef.current;
    if (!sound) return;
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) await sound.pauseAsync();
    else await sound.playAsync();
  };

  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;

  const transportDisabled = (enabled: boolean) => !enabled || loading;

  return (
    <View style={[styles.container, isSpotify ? styles.containerSpotify : styles.containerCard]}>
      {!isSpotify && title ? (
        <Text variant="titleMedium" style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>
      ) : null}
      {error ? (
        <Text variant="bodyMedium" style={styles.errorText}>{error}</Text>
      ) : isSpotify ? (
        <>
          <View style={[styles.progressTrack, styles.progressTrackSpotify]}>
            <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatPositionMillis(positionMillis)}</Text>
            <Text style={[styles.time, styles.timeDim]}>
              {durationMillis > 0 ? formatPositionMillis(durationMillis) : "--:--"}
            </Text>
          </View>
          <View style={styles.transportRow}>
            <TouchableOpacity
              onPress={onSkipPrevious}
              disabled={transportDisabled(canSkipPrevious)}
              style={styles.transportBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <MaterialIcons
                name="skip-previous"
                size={36}
                color={canSkipPrevious && !loading ? "#FFFFFF" : "rgba(255,255,255,0.25)"}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} disabled={loading} style={styles.playButton} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <MaterialIcons name={playing ? "pause" : "play-arrow"} size={36} color="#000000" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSkipNext}
              disabled={transportDisabled(canSkipNext)}
              style={styles.transportBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <MaterialIcons
                name="skip-next"
                size={36}
                color={canSkipNext && !loading ? "#FFFFFF" : "rgba(255,255,255,0.25)"}
              />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.controls}>
          <TouchableOpacity onPress={togglePlay} disabled={loading} style={styles.playButton} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <MaterialIcons name={playing ? "pause" : "play-arrow"} size={36} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <View style={styles.timeCol}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.time}>{formatPositionMillis(positionMillis)}</Text>
              <Text style={[styles.time, styles.timeDim]}>
                {durationMillis > 0 ? formatPositionMillis(durationMillis) : "--:--"}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16
  },
  containerCard: {
    backgroundColor: "#1A1A1A",
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 16
  },
  containerSpotify: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 8,
    marginBottom: 8
  },
  cardTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 14
  },
  errorText: {
    color: "#B0120C"
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    marginTop: 8
  },
  transportBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6
  },
  timeCol: {
    flex: 1
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6
  },
  time: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)"
  },
  timeDim: {
    color: "rgba(255,255,255,0.4)"
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden"
  },
  progressTrackSpotify: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#1DB954"
  }
});
