import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, Button, Card } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { WebView } from "react-native-webview";

import OptimizedImage from "@/components/OptimizedImage";

export default function GoodNewsVideoScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    title?: string;
    subtitle?: string;
    thumbnail?: string;
    embedUrl?: string;
    externalUrl?: string;
    storyMode?: string;
  }>();
  const [showVideo, setShowVideo] = useState(false);

  const title = String(params.title || "Video");
  const subtitle = String(params.subtitle || "");
  const thumbnail = String(params.thumbnail || "");
  const embedUrl = String(params.embedUrl || "");
  const externalUrl = String(params.externalUrl || "");
  const isStoryMode = String(params.storyMode || "0") === "1";

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        title: "",
        headerStyle: { backgroundColor: "#000000" },
        headerTintColor: "#FFFFFF",
        headerShadowVisible: false,
        headerBackVisible: false,
        headerRight: () => null,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="chevron-left" size={27} color="#FFFFFF" />
          </TouchableOpacity>
        )
      });
    }, [navigation])
  );

  const canPlay = useMemo(() => embedUrl.trim().length > 0, [embedUrl]);

  useEffect(() => {
    if (isStoryMode && canPlay) setShowVideo(true);
  }, [isStoryMode, canPlay]);

  const openExternal = () => {
    if (!externalUrl) return;
    Alert.alert("Open in browser", "Open this video in your browser?", [
      { text: "Cancel", style: "cancel" },
      { text: "Open", onPress: () => Linking.openURL(externalUrl) }
    ]);
  };

  return (
    <View style={styles.container}>
      {isStoryMode ? (
        <View style={styles.storyVideoContainer}>
          {canPlay ? (
            <WebView
              source={{ uri: embedUrl, headers: { Referer: "https://b1.church/" } }}
              userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 B1.church"
              style={styles.storyWebView}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mixedContentMode="compatibility"
              originWhitelist={["*"]}
            />
          ) : (
            <View style={styles.storyFallback}>
              <Text style={styles.subtitle}>Unable to play this video.</Text>
            </View>
          )}
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!showVideo && (
          <Card style={styles.previewCard}>
            <TouchableOpacity activeOpacity={0.9} style={styles.previewContainer} onPress={() => canPlay && setShowVideo(true)}>
              <OptimizedImage
                source={thumbnail ? { uri: thumbnail } : require("../../assets/home/Announcements.jpg")}
                style={styles.previewImage}
                contentFit="cover"
              />
              <View style={styles.previewOverlay}>
                <View style={styles.playButton}>
                  <MaterialIcons name="play-arrow" size={48} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
          </Card>
        )}

        {showVideo && canPlay && (
          <Card style={styles.videoCard}>
            <View style={styles.videoContainer}>
              <WebView
                source={{ uri: embedUrl, headers: { Referer: "https://b1.church/" } }}
                userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 B1.church"
                style={styles.webView}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                allowsInlineMediaPlayback
                mixedContentMode="compatibility"
                originWhitelist={["*"]}
              />
            </View>
          </Card>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        <View style={styles.actionsRow}>
          {!showVideo && (
            <Button
              mode="contained"
              onPress={() => canPlay && setShowVideo(true)}
              style={styles.primaryButton}
              buttonColor="#FFFFFF"
              textColor="#1A1A1A"
              labelStyle={styles.primaryButtonLabel}
            >
              Watch Video
            </Button>
          )}
          <Button mode="outlined" onPress={openExternal} style={styles.secondaryButton} textColor="#FFFFFF">
            Open in Browser
          </Button>
        </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBackButton: { marginLeft: 8 },
  container: { flex: 1, backgroundColor: "#000000" },
  scroll: { flex: 1, backgroundColor: "#000000" },
  scrollContent: { padding: 16, paddingBottom: 32 },
  storyVideoContainer: {
    flex: 1,
    backgroundColor: "#000000"
  },
  storyWebView: {
    flex: 1,
    backgroundColor: "#000000"
  },
  storyFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24
  },
  previewCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1A1A1A",
    overflow: "hidden",
    marginBottom: 14
  },
  previewContainer: { position: "relative", aspectRatio: 16 / 9 },
  previewImage: { width: "100%", height: "100%" },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center"
  },
  playButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "rgba(21,101,192,0.9)",
    alignItems: "center",
    justifyContent: "center"
  },
  videoCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14
  },
  videoContainer: { aspectRatio: 16 / 9, backgroundColor: "#000000" },
  webView: { flex: 1 },
  infoSection: { marginTop: 6 },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30
  },
  subtitle: {
    marginTop: 10,
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    lineHeight: 22
  },
  actionsRow: { marginTop: 18, gap: 10 },
  primaryButton: { borderRadius: 999, paddingVertical: 6 },
  primaryButtonLabel: { fontWeight: "800", fontSize: 15, lineHeight: 20 },
  secondaryButton: {
    borderRadius: 999,
    borderColor: "rgba(255,255,255,0.22)"
  }
});

