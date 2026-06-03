import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { PublicSongInterface } from "../../interfaces/Song";
import { formatDuration, formatTrackArtistLine } from "./formatSongCredits";

interface AlbumTrackRowProps {
  song: PublicSongInterface;
  index: number;
  onPress: (song: PublicSongInterface) => void;
}

export const AlbumTrackRow: React.FC<AlbumTrackRowProps> = ({ song, index, onPress }) => {
  const trackNum = song.trackNumber ?? index + 1;
  const duration = formatDuration(song.seconds);
  const artistLine = formatTrackArtistLine(song);
  const canPlay = !!song.audioUrl?.trim();

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(song)} activeOpacity={0.65}>
      <Text style={styles.trackNumber}>{trackNum}</Text>
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title || "Untitled"}
        </Text>
        {artistLine ? (
          <Text style={styles.credits} numberOfLines={2}>
            {artistLine}
          </Text>
        ) : null}
      </View>
      <View style={styles.end}>
        {duration ? <Text style={styles.duration}>{duration}</Text> : null}
        {canPlay ? (
          <View style={styles.playBtn}>
            <MaterialIcons name="play-arrow" size={20} color="#000000" />
          </View>
        ) : (
          <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.35)" />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)"
  },
  trackNumber: {
    width: 28,
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center"
  },
  main: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2
  },
  credits: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16
  },
  end: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 56,
    justifyContent: "flex-end"
  },
  duration: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "500"
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center"
  }
});
