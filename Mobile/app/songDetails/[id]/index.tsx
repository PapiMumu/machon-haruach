import React, { useEffect, useCallback, useMemo } from "react";
import { ScrollView, View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";

import { LoadingWrapper } from "../../../src/components/wrapper/LoadingWrapper";
import { OptimizedImage } from "../../../src/components/OptimizedImage";
import {
  SongAudioPlayer,
  SongLyricsSection,
  buildSongDetailsHref,
  formatDuration,
  formatTrackArtistLine
} from "../../../src/components/songs/exports";
import { UserHelper } from "../../../src/helpers";
import { PublicSongInterface } from "../../../src/interfaces/Song";
import { useCurrentChurch } from "../../../src/stores/useUserStore";

const SongDetails = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const currentChurch = useCurrentChurch();
  const { id, title, queueIds } = useLocalSearchParams<{ id: string; title?: string; queueIds?: string }>();

  useEffect(() => {
    UserHelper.addOpenScreenEvent("SongDetailsScreen");
  }, []);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        title: "",
        headerStyle: { backgroundColor: "#121212" },
        headerTintColor: "#FFFFFF",
        headerShadowVisible: false,
        headerBackVisible: false,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="chevron-left" size={27} color="#FFFFFF" />
          </TouchableOpacity>
        )
      });
    }, [navigation])
  );

  const { data: library, isLoading, error } = useQuery({
    queryKey: ["/songDetails/public/" + currentChurch?.id, "ContentApi"],
    enabled: !!id && !!currentChurch?.id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    select: (data: PublicSongInterface[]) => (Array.isArray(data) ? data.filter((s) => s?.id) : [])
  });

  const playQueue = useMemo(() => {
    if (!library?.length || !id) return [];
    const ids = queueIds?.split(",").filter(Boolean) ?? [id];
    return ids.map((songId) => library.find((s) => s.id === songId)).filter((s): s is PublicSongInterface => !!s);
  }, [library, queueIds, id]);

  const song = useMemo(() => playQueue.find((s) => s.id === id) ?? library?.find((s) => s.id === id) ?? null, [playQueue, library, id]);

  const queueIndex = useMemo(() => playQueue.findIndex((s) => s.id === id), [playQueue, id]);

  const goToQueueIndex = useCallback(
    (index: number) => {
      const target = playQueue[index];
      if (!target?.id) return;
      router.replace(buildSongDetailsHref(target, playQueue));
    },
    [playQueue]
  );

  const handleSkipPrevious = useCallback(() => {
    if (queueIndex > 0) goToQueueIndex(queueIndex - 1);
  }, [queueIndex, goToQueueIndex]);

  const handleSkipNext = useCallback(() => {
    if (queueIndex >= 0 && queueIndex < playQueue.length - 1) goToQueueIndex(queueIndex + 1);
  }, [queueIndex, playQueue.length, goToQueueIndex]);

  const displayTitle = song?.title || title || t("songs.song");
  const hasImage = song?.thumbnail && song.thumbnail.trim() !== "";
  const audioUrl = song?.audioUrl?.trim();
  const artistLine = song ? formatTrackArtistLine(song) : "";

  const metaLine = useMemo(() => {
    if (!song) return "";
    const parts: string[] = [];
    if (song.album) parts.push(song.album);
    if (song.trackNumber) parts.push(t("songs.trackNumberShort", { number: song.trackNumber }));
    if (song.seconds) parts.push(formatDuration(song.seconds));
    return parts.join(" · ");
  }, [song, t]);

  return (
    <View style={styles.container}>
      <LoadingWrapper loading={isLoading}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {error || !song ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color="#B0120C" />
              <Text variant="titleMedium" style={styles.errorTitle}>
                {t("songs.songDetailsNotFound")}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.hero}>
                <View style={styles.artworkWrap}>
                  {hasImage ? (
                    <OptimizedImage source={{ uri: song.thumbnail }} style={styles.artwork} contentFit="cover" />
                  ) : (
                    <LinearGradient colors={["#1a472a", "#1DB954", "#191414"]} style={styles.artwork}>
                      <MaterialIcons name="music-note" size={64} color="rgba(255,255,255,0.9)" />
                    </LinearGradient>
                  )}
                </View>

                <Text style={styles.title}>{displayTitle}</Text>
                {artistLine ? <Text style={styles.artist}>{artistLine}</Text> : null}
                {metaLine ? <Text style={styles.meta}>{metaLine}</Text> : null}
              </View>

              {audioUrl ? (
                <SongAudioPlayer
                  audioUrl={audioUrl}
                  variant="spotify"
                  canSkipPrevious={queueIndex > 0}
                  canSkipNext={queueIndex >= 0 && queueIndex < playQueue.length - 1}
                  onSkipPrevious={handleSkipPrevious}
                  onSkipNext={handleSkipNext}
                />
              ) : (
                <View style={styles.noAudio}>
                  <MaterialIcons name="music-off" size={28} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.noAudioText}>{t("songs.noAudioAvailable")}</Text>
                </View>
              )}

              <SongLyricsSection lyrics={song.lyrics} />
              {!song.lyrics?.trim() ? (
                <Text style={styles.noLyrics}>{t("songs.noLyricsAvailable")}</Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </LoadingWrapper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212"
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    paddingTop: 8
  },
  headerBackButton: { marginLeft: 4 },
  hero: {
    alignItems: "center",
    marginBottom: 24
  },
  artworkWrap: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 16
  },
  artwork: {
    width: 280,
    height: 280,
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 8,
    paddingHorizontal: 8
  },
  artist: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 6
  },
  meta: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500"
  },
  noAudio: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 16
  },
  noAudioText: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
    fontSize: 14
  },
  noLyrics: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    minHeight: 300
  },
  errorTitle: {
    color: "#B0120C",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16
  }
});

export default SongDetails;
