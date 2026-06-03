import React, { useCallback } from "react";
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
import { AlbumTrackRow, buildSongDetailsHref } from "../../../src/components/songs/exports";
import { PublicSongInterface } from "../../../src/interfaces/Song";
import { useCurrentChurch } from "../../../src/stores/useUserStore";
import { PlaylistInterface } from "@machonharuach/helpers";

const MusicPlaylistDetails = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const currentChurch = useCurrentChurch();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        title: "",
        headerStyle: { backgroundColor: "#121212" },
        headerTintColor: "#FFFFFF",
        headerShadowVisible: false,
        headerBackVisible: false,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="chevron-left" size={27} color="#FFFFFF" />
          </TouchableOpacity>
        )
      });
    }, [navigation])
  );

  const { data: playlist, isLoading: playlistLoading } = useQuery({
    queryKey: ["/playlists/" + id, "ContentApi"],
    enabled: !!id,
    select: (data: any) => (data?.id ? (data as PlaylistInterface) : null)
  });

  const { data: tracks, isLoading: tracksLoading } = useQuery({
    queryKey: ["/playlists/" + id + "/songs/public/" + currentChurch?.id, "ContentApi"],
    enabled: !!id && !!currentChurch?.id,
    placeholderData: [],
    select: (data: any[]) => data.filter((s: any) => s?.id) as PublicSongInterface[]
  });

  const displayTitle = title ? decodeURIComponent(title) : playlist?.title || t("songs.playlist");
  const hasCover = playlist?.thumbnail && playlist.thumbnail.trim() !== "";
  const isLoading = playlistLoading || tracksLoading;

  const handleSongPress = (song: PublicSongInterface) => {
    router.push(buildSongDetailsHref(song, tracks || []));
  };

  return (
    <View style={styles.container}>
      <LoadingWrapper loading={isLoading}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.cover}>
              {hasCover ? (
                <OptimizedImage source={{ uri: playlist!.thumbnail }} style={styles.coverImage} contentFit="cover" />
              ) : (
                <LinearGradient colors={["#1a472a", "#1DB954", "#191414"]} style={styles.coverImage}>
                  <MaterialIcons name="queue-music" size={56} color="rgba(255,255,255,0.9)" />
                </LinearGradient>
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.playlistType}>{t("songs.playlist")}</Text>
              <Text style={styles.playlistTitle}>{displayTitle}</Text>
              {playlist?.description ? <Text style={styles.description}>{playlist.description}</Text> : null}
              <Text style={styles.trackMeta}>{t("songs.trackCount", { count: tracks?.length || 0 })}</Text>
            </View>
          </View>

          <Text style={styles.listHeading}>{t("songs.playlistTracks")}</Text>
          {!tracks?.length ? (
            <Text style={styles.empty}>{t("songs.noPlaylistTracks")}</Text>
          ) : (
            tracks.map((track, index) => (
              <AlbumTrackRow key={track.id} song={track} index={index} onPress={handleSongPress} />
            ))
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  headerBack: { marginLeft: 4 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    marginBottom: 28
  },
  cover: {
    width: 128,
    height: 128,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#282828",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10
  },
  coverImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center"
  },
  headerText: { flex: 1, paddingBottom: 4 },
  playlistType: {
    color: "#1DB954",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6
  },
  playlistTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.3
  },
  description: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18
  },
  trackMeta: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    marginTop: 10,
    fontWeight: "600"
  },
  listHeading: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12
  },
  empty: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 24
  }
});

export default MusicPlaylistDetails;
