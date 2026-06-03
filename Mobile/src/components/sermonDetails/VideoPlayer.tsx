import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Card, ActivityIndicator } from "react-native-paper";
import { WebView } from "react-native-webview";
import { useThemeColors } from "../../theme";

interface VideoPlayerProps {
  videoUrl: string;
  visible: boolean;
  /** Full-screen layout for dedicated live stream page */
  fullScreen?: boolean;
}

const webViewProps = {
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 B1.church",
  allowsFullscreenVideo: true,
  mediaPlaybackRequiresUserAction: false,
  javaScriptEnabled: true,
  domStorageEnabled: true,
  startInLoadingState: true,
  allowsInlineMediaPlayback: true,
  mixedContentMode: "compatibility" as const,
  originWhitelist: ["*"]
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, visible, fullScreen = false }) => {
  const colors = useThemeColors();
  if (!visible) return null;

  const loading = (
    <View style={[styles.loadingContainer, { backgroundColor: colors.black }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (!videoUrl) {
    if (fullScreen) {
      return <View style={[styles.fullScreenRoot, { backgroundColor: colors.black }]}>{loading}</View>;
    }
    return (
      <Card style={[styles.videoCard, { shadowColor: colors.shadowBlack }]}>
        <View style={[styles.videoContainer, { backgroundColor: colors.black }]}>{loading}</View>
      </Card>
    );
  }

  const player = (
    <WebView
      source={{
        uri: videoUrl,
        headers: { Referer: "https://machonharuach.org/" }
      }}
      {...webViewProps}
      style={fullScreen ? styles.fullScreenWebView : styles.webView}
      renderLoading={() => loading}
      onError={(syntheticEvent) => {
        console.warn("WebView error: ", syntheticEvent.nativeEvent);
      }}
      androidLayerType={Platform.OS === "android" ? "hardware" : undefined}
    />
  );

  if (fullScreen) {
    return <View style={[styles.fullScreenRoot, { backgroundColor: colors.black }]}>{player}</View>;
  }

  return (
    <Card style={[styles.videoCard, { shadowColor: colors.shadowBlack }]}>
      <View style={[styles.videoContainer, { backgroundColor: colors.black }]}>{player}</View>
    </Card>
  );
};

const styles = StyleSheet.create({
  videoCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6
  },
  videoContainer: { aspectRatio: 16 / 9 },
  fullScreenRoot: { flex: 1 },
  webView: { flex: 1 },
  fullScreenWebView: { flex: 1, backgroundColor: "#000000" },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center"
  }
});
