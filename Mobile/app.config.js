const fs = require("fs");
const path = require("path");
const { version } = require("./package.json");
// Expo CLI loads Mobile/.env when evaluating this file (MEMBERSHIP_API, STAGE → extra).
const hasGoogleServicesFile = fs.existsSync(path.join(__dirname, "google-services.json"));

module.exports = {
  expo: {
    // Home-screen label (Android truncates long names under the icon). Full branding stays in-app.
    name: "Machon",
    slug: "Mobile",
    version,
    orientation: "portrait",
    icon: "./assets/images/machon-haruach-icon-contained.png",
    userInterfaceStyle: "light",
    scheme: "machonharuach", // For deep linking
    splash: {
      image: "./src/assets/images/gnw_logo-gold_512.png",
      resizeMode: "contain",
      backgroundColor: "#2F3465"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "org.machonharuach.mobile",
      buildNumber: "57",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: "Machon HaRuach needs camera access to allow you to take photos for your profile and share with your church community.",
        NSPhotoLibraryUsageDescription: "Machon HaRuach needs access to your photos to allow you to upload profile pictures and share images with your church community.",
        NSMicrophoneUsageDescription: "Machon HaRuach needs microphone access to allow you to record audio messages and participate in church communications.",
        NSLocationWhenInUseUsageDescription: "Machon HaRuach uses your location to help you find nearby church events and connect with local church members.",
        NSUserNotificationsUsageDescription: "Machon HaRuach sends notifications to keep you updated about church events, messages, and important announcements.",
        LSApplicationQueriesSchemes: ["mailto", "tel", "sms"]
      }
    },
    android: {
      package: "org.machonharuach.mobile",
      ...(hasGoogleServicesFile ? { googleServicesFile: "./google-services.json" } : {}),
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        foregroundImage: "./assets/images/machon-haruach-adaptive-foreground.png",
        backgroundColor: "#FFFFFF"
      }
      // Uncomment this if you want to be explicit about permissions
      /*
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECORD_AUDIO",
        "ACCESS_FINE_LOCATION"
      ],
      */
    },
    web: {
      favicon: "./assets/images/machon-haruach-favicon.png"
    },
    plugins: [
      "expo-dev-client",
      [
        "@sentry/react-native/expo",
        {
          "url": "https://sentry.io/",
          "project": "machon-haruach-mobile",
          "organization": "machon-haruach"
        }
      ],
      "expo-secure-store",
      [
        "expo-notifications",
        {
          icon: "./assets/images/machon-haruach-notification-icon.png",
          color: "#ffffff",
          sounds: ["./assets/sounds/notification.mp3"]
        }
      ],
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "17.0",
            useFrameworks: "static"
          }
        }
      ],
      ...(hasGoogleServicesFile ? ["@react-native-firebase/app"] : [])
      // "@react-native-firebase/analytics"
    ],
    updates: {
      enabled: false,
      checkAutomatically: "NEVER",
      fallbackToCacheTimeout: 0
    },
    extra: {
      /** Base URL for staff admin (web fallback in reset-password email). No trailing slash. */
      ADMIN_WEB_ROOT:
        process.env.ADMIN_WEB_ROOT ||
        process.env.B1ADMIN_WEB_ROOT ||
        process.env.EXPO_PUBLIC_ADMIN_WEB_ROOT ||
        "https://admin.machonharuach.org",
      /** Shown in registration emails (subject/body branding). */
      APP_NAME_FOR_EMAIL: process.env.APP_NAME_FOR_EMAIL || "Machon HaRuach",
      MEMBER_WEB_ROOT:
        process.env.MEMBER_WEB_ROOT || process.env.B1_WEB_ROOT || "https://{subdomain}.machonharuach.org",
      /**
       * Attendance API base (same host pattern as Admin). If unset, derived from MEMBERSHIP_API by swapping /membership → /attendance.
       * Required for Select Branch to list campuses from Admin Attendance when not using Branches JSON only.
       */
      ATTENDANCE_API: process.env.ATTENDANCE_API || "",
      CONTENT_API: process.env.CONTENT_API || "https://api.machonharuach.org/content",
      CONTENT_ROOT: process.env.CONTENT_ROOT || "https://content.machonharuach.org",
      DOING_API: process.env.DOING_API || "https://api.machonharuach.org/doing",
      GIVING_API: process.env.GIVING_API || "https://api.machonharuach.org/giving",
      LESSONS_API: process.env.LESSONS_API || "https://api.lessons.church",
      LESSONS_ROOT: process.env.LESSONS_ROOT || "https://lessons.church",
      MEMBERSHIP_API: process.env.MEMBERSHIP_API || "https://api.machonharuach.org/membership",
      MESSAGING_API: process.env.MESSAGING_API || "https://api.machonharuach.org/messaging",
      STAGE: process.env.STAGE || "prod",
      /**
       * Spirit Embassy (Machon HaRuach) is always the default church in Mobile.
       * Set this to your Spirit Embassy membership church UUID per environment (staging/prod) so branch/campus
       * lists do not depend on search. If empty, the app resolves Spirit Embassy via membership search for "spirit embassy".
       */
      DEFAULT_CHURCH_ID: process.env.DEFAULT_CHURCH_ID || "",
      /** Set to "1" to open in-app set-password after register (e.g. release build QA). Dev builds use __DEV__ automatically. */
      IN_APP_SET_PASSWORD_AFTER_REGISTER: process.env.IN_APP_SET_PASSWORD_AFTER_REGISTER === "1",
      YOUVERSION_API_KEY: process.env.YOUVERSION_API_KEY,
      /** False until Mobile/google-services.json exists and the app is rebuilt with Firebase. */
      FCM_CONFIGURED: hasGoogleServicesFile
    }
  }
};
