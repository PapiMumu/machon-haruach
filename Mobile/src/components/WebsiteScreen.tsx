import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, View, Text, StyleSheet } from "react-native";
import WebView from "react-native-webview";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useTranslation } from "react-i18next";
import { ApiHelper, globalStyles, SecureStorageHelper } from "../../src/helpers";
import { MainHeader } from "./wrapper/MainHeader";
import { UserHelper } from "../helpers/UserHelper";
import { eventBus } from "@/helpers/PushNotificationHelper";
import { useAuthStore } from "@/stores/useAuthStore";
import { Loader } from "./Loader";
import { useThemeColors } from "../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { restoreDrawerProfileAvatar } from "@/hooks/useRestoreDrawerProfileAvatar";

interface WebsiteScreenProps {
  url: string;
  title: string;
  minimalHeader?: boolean;
}

export function WebsiteScreen({ url, title, minimalHeader = false }: WebsiteScreenProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [canWebGoBack, setCanWebGoBack] = useState(false);
  const [activeWebUrl, setActiveWebUrl] = useState(String(url || ""));
  const webviewRef = useRef<WebView>(null);
  const navigationMain = useNavigation();
  const authStore = useAuthStore;
  const insets = useSafeAreaInsets();
  const normalizedUrl = String(url || "").toLowerCase();
  const normalizedTitle = String(title || "").toLowerCase();
  const isHealingInstitutePage = normalizedUrl.includes("healinginstitute.org") || normalizedTitle.includes("healing");
  const isGoodNewsDailyPage = normalizedUrl.includes("goodnews") || normalizedTitle.includes("goodnews daily");
  const isSpiritEmbassyPage = normalizedUrl.includes("spiritembassy");
  const isBrandedWebsitePage = isHealingInstitutePage || isGoodNewsDailyPage;
  const shouldHideGoodNewsTopSection = !isHealingInstitutePage && (isGoodNewsDailyPage || isSpiritEmbassyPage);
  const healingTopBarHeight = Math.max(insets.top, 8) + 44;
  const shouldHideTopSectionForUrl = useCallback(
    (targetUrl: string) => {
      const normalizedTarget = String(targetUrl || "").toLowerCase();
      if (!shouldHideGoodNewsTopSection) return false;
      // Hide only on the events landing page. Registration/detail pages must remain full.
      return normalizedTarget.includes("/events");
    },
    [shouldHideGoodNewsTopSection]
  );
  const shouldHideTopSectionNow = shouldHideTopSectionForUrl(activeWebUrl);
  const goodNewsHideTopSectionScript = `
    (function() {
      if (window.__b1HideTopApplied) return true;
      window.__b1HideTopApplied = true;

      function hideEl(el) {
        if (!el) return;
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('height', '0px', 'important');
        el.style.setProperty('min-height', '0px', 'important');
        el.style.setProperty('margin', '0px', 'important');
        el.style.setProperty('padding', '0px', 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
      }

      function hideClosestContainer(el) {
        let node = el;
        for (let i = 0; i < 6 && node; i++) {
          if (node && node.tagName) {
            const tag = node.tagName.toLowerCase();
            if (tag === 'header' || tag === 'nav' || tag === 'section' || tag === 'div') {
              hideEl(node);
              return;
            }
          }
          node = node.parentElement;
        }
        hideEl(el);
      }

      function removeTopStripBeforeMainContent() {
        const markerText = ['prophetic retreat', 'teaching programs'];
        const nodes = document.querySelectorAll('h1,h2,h3,h4,p,span,div,a,button');
        let marker = null;
        for (const node of nodes) {
          const txt = (node.textContent || '').trim().toLowerCase();
          if (txt && markerText.some((m) => txt.includes(m))) {
            marker = node;
            break;
          }
        }
        if (!marker) return;

        // Walk up to a stable content block container.
        let contentBlock = marker;
        for (let i = 0; i < 8 && contentBlock?.parentElement; i++) {
          const parent = contentBlock.parentElement;
          const tag = (parent.tagName || '').toLowerCase();
          if (tag === 'article' || tag === 'main' || tag === 'section') {
            contentBlock = parent;
            break;
          }
          contentBlock = parent;
        }
        if (!contentBlock || !contentBlock.parentElement) return;

        const parent = contentBlock.parentElement;
        const siblings = Array.from(parent.children);
        for (const sib of siblings) {
          if (sib === contentBlock) break;
          hideEl(sib);
        }
      }

      function applyHide() {
        // Common top/header structures
        [
          'header',
          'nav',
          '.site-header',
          '.top-bar',
          '.header-top',
          '.ast-above-header',
          '.elementor-location-header',
          '.elementor-sticky--active'
        ].forEach((selector) => {
          document.querySelectorAll(selector).forEach(hideEl);
        });

        // Hide the specific GoodNews top action strip by keyword matching
        const keywords = ['stay connected', 'login area', 'offering', 'seed', 'tithe', 'partner now'];
        const nodes = document.querySelectorAll('a, button, span, p, div');
        nodes.forEach((node) => {
          const txt = (node.textContent || '').trim().toLowerCase();
          if (!txt) return;
          if (keywords.some((k) => txt.includes(k))) {
            hideClosestContainer(node);
          }
        });

        // Robust fallback for pages where the top panel is rendered as generic blocks.
        removeTopStripBeforeMainContent();
      }

      applyHide();
      const obs = new MutationObserver(() => applyHide());
      obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
      // Keep for longer because this page hydrates widgets asynchronously.
      setTimeout(() => { try { obs.disconnect(); } catch (e) {} }, 25000);
      return true;
    })();
  `;

  useEffect(() => {
    // Utilities.trackEvent('Website Screen', { url });
    UserHelper.addOpenScreenEvent("Website Screen", { url });

    const timer = setTimeout(() => {
      setCurrentUrl(url);
      setActiveWebUrl(String(url || ""));
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleBackPress = useCallback(() => {
    if (isBrandedWebsitePage && canWebGoBack && webviewRef.current) {
      webviewRef.current.goBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    router.back();
  }, [isBrandedWebsitePage, canWebGoBack, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!navigationMain) return;

      navigationMain.setOptions({
        title: "",
        headerShown: true,
        headerStyle: { backgroundColor: "#000000" },
        headerTintColor: "#FFFFFF",
        headerShadowVisible: false,
        headerRight: () => null,
        headerBackVisible: false,
        headerLeft: () => (
          <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 10 }}>
            <MaterialIcons
              name="chevron-left"
              size={27}
              color="#FFFFFF"
              onPress={handleBackPress}
            />
          </View>
        )
      });

      return () => {
        restoreDrawerProfileAvatar(navigationMain);
      };
    }, [navigationMain, handleBackPress])
  );

  useEffect(() => {
    // Keep this variable referenced for compatibility with existing flows
    // that still pass `minimalHeader` explicitly.
    if (minimalHeader) {
      // no-op
    }
  }, [minimalHeader]);

  const handleMessage = (event: any) => {
    const message = JSON.parse(event.nativeEvent.data);

    if (message.event === "profile_updated") {
      manageUserUpdate();
      return;
    }

    if (message.event === "profile_deleted") {
      eventBus.emit("do_logout");
      return;
    }

    const newUrl = currentUrl + "&autoPrint=1";
    Linking.openURL(newUrl);
  };

  const manageUserUpdate = async () => {
    setIsLoading(true);
    // Attempt to re-authenticate with JWT
    const data = await ApiHelper.postAnonymous("/users/login", { jwt: await SecureStorageHelper.getSecureItem("default_jwt") }, "MembershipApi");
    if (data.user != null) {
      await authStore.getState().handleLogin(data);
    }
    setIsLoading(false);
    navigation.goBack();
  };

  const urlToScreenMapping: { [key: string]: string } = {
    "/donate": "/(drawer)/(tabs)/donation",
    "/groups/details/": "/groupDetailsRoot",
    "/my/checkin": "/(drawer)/service",
    "/my/community": "/(drawer)/membersSearch",
    "/my/community/": "/memberDetailRoot",
    "/my/groups": "/myGroupsRoot",
    "/my/plans": "/(drawer)/plan",
    "/my/plans/": "/(drawer)/planDetails",
    "/votd": "/(drawer)/votd"
  };

  const extractIdFromUrl = (url: string, basePath: string) => {
    if (url.startsWith(basePath)) {
      return url.replace(basePath, "").split("?")[0];
    }
    return null;
  };

  const handleWebViewNavigationStateChange = (event: { url: string; canGoBack?: boolean }) => {
    const { url } = event;
    setCanWebGoBack(Boolean(event.canGoBack));
    setActiveWebUrl(url);
    if (shouldHideTopSectionForUrl(url) && webviewRef.current) {
      // Re-apply after in-page navigation to catch dynamic content replacement.
      webviewRef.current.injectJavaScript(goodNewsHideTopSectionScript);
    }

    // Dynamically extract base URL
    const baseUrlMatch = url.match(/^(https?:\/\/[^/]+)/);
    const baseUrl = baseUrlMatch ? baseUrlMatch[1] : "";

    if (url.includes("/donate")) {
      if (Platform.OS === "android") {
        router.navigate("/(drawer)/(tabs)/donation");
        return false;
      } else if (Platform.OS === "ios") {
        return true;
      }
    }
    for (const basePath in urlToScreenMapping) {
      const screenPath = urlToScreenMapping[basePath];

      if (basePath.endsWith("/")) {
        const fullUrl = `${baseUrl}${basePath}`;
        const id = extractIdFromUrl(url, fullUrl);
        if (id) {
          router.navigate(screenPath as never, { params: { id } });
          return false;
        }
      } else if (url === `${baseUrl}${basePath}`) {
        router.navigate(screenPath);
        return false;
      }
    }

    return true;
  };

  return (
    <View
      style={[
        globalStyles.homeContainer,
        { backgroundColor: isBrandedWebsitePage ? "#000000" : colors.surface }
      ]}
    >
      <MainHeader title={title || "Home"} openDrawer={() => navigation.dispatch(DrawerActions.openDrawer())} back={() => router.back()} />
      <View
        style={[
          globalStyles.webViewContainer,
          isBrandedWebsitePage
            ? { backgroundColor: "#000000", overflow: "hidden" }
            : null
        ]}
        onLayout={() => setIsLayoutReady(true)}
      >
        {isLayoutReady && (
          <WebView
            source={currentUrl ? { uri: url } : undefined}
            ref={webviewRef}
            onMessage={handleMessage}
            renderError={() => (
              <View>
                <Text>{t("common.errorRetrying")}</Text>
              </View>
            )}
            userAgent={Platform.OS === "ios" ? "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148" : undefined}
            scalesPageToFit={false}
            startInLoadingState={true}
            allowsInlineMediaPlayback={true}
            allowsBackForwardNavigationGestures={true}
            mediaPlaybackRequiresUserAction={false}
            style={isBrandedWebsitePage ? { backgroundColor: "#000000" } : undefined}
            injectedJavaScriptBeforeContentLoaded={shouldHideTopSectionNow ? goodNewsHideTopSectionScript : undefined}
            injectedJavaScript={shouldHideTopSectionNow ? goodNewsHideTopSectionScript : undefined}
            // onShouldStartLoadWithRequest={handleWebViewNavigationStateChange}
            onNavigationStateChange={handleWebViewNavigationStateChange}
          />
        )}
      </View>
      {isLoading && (
        <View style={StyleSheet.absoluteFill}>
          <Loader isLoading={isLoading} />
        </View>
      )}
    </View>
  );
}
