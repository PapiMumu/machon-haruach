import { ApiHelper } from "@machonharuach/helpers";
import Constants from "expo-constants";
import { Platform } from "react-native";

export class EnvironmentHelper {
  public static MembershipApi = "";
  public static MessagingApi = "";
  public static AttendanceApi = "";
  public static GivingApi = "";
  public static ContentApi = "";
  public static LessonsRoot = "";
  public static DoingApi = "";
  public static LessonsApi = "";
  /** Member portal base URL pattern, e.g. https://{subdomain}.machonharuach.org */
  public static MemberWebRoot = "";

  static ContentRoot = "";

  static init = () => {
    const extra = Constants.expoConfig?.extra || {};
    const stage = String(extra.STAGE || "prod").toLowerCase().trim();
    console.log("[EnvironmentHelper] Initializing with stage:", stage);
    switch (stage) {
      case "prod": EnvironmentHelper.initProd(); break;
      case "staging": EnvironmentHelper.initStaging(); break;
      default: EnvironmentHelper.initFromExtra(extra); break;
    }

    EnvironmentHelper.initFromExtra(extra);

    console.log("[EnvironmentHelper] API URLs configured:");
    console.log("  MembershipApi:", EnvironmentHelper.MembershipApi);
    console.log("  AttendanceApi:", EnvironmentHelper.AttendanceApi);
    console.log("  ContentApi:", EnvironmentHelper.ContentApi);
    console.log("  GivingApi:", EnvironmentHelper.GivingApi);

    ApiHelper.apiConfigs = [
      { keyName: "MembershipApi", url: EnvironmentHelper.MembershipApi, jwt: "", permisssions: [] },
      { keyName: "MessagingApi", url: EnvironmentHelper.MessagingApi, jwt: "", permisssions: [] },
      { keyName: "AttendanceApi", url: EnvironmentHelper.AttendanceApi, jwt: "", permisssions: [] },
      { keyName: "GivingApi", url: EnvironmentHelper.GivingApi, jwt: "", permisssions: [] },
      { keyName: "ContentApi", url: EnvironmentHelper.ContentApi, jwt: "", permisssions: [] },
      { keyName: "DoingApi", url: EnvironmentHelper.DoingApi, jwt: "", permisssions: [] },
      { keyName: "LessonsApi", url: EnvironmentHelper.LessonsApi, jwt: "", permisssions: [] }
    ];
  };

  static initDev = () => {
    EnvironmentHelper.MembershipApi = "https://api.staging.machonharuach.org/membership";
    EnvironmentHelper.MessagingApi = "https://api.staging.machonharuach.org/messaging";
    EnvironmentHelper.AttendanceApi = "https://api.staging.machonharuach.org/attendance";
    EnvironmentHelper.GivingApi = "https://api.staging.machonharuach.org/giving";
    EnvironmentHelper.LessonsApi = "https://api.staging.lessons.church";
    EnvironmentHelper.DoingApi = "https://api.staging.machonharuach.org/doing";
    EnvironmentHelper.ContentApi = "https://api.staging.machonharuach.org/content";
    EnvironmentHelper.ContentRoot = "https://content.staging.machonharuach.org";
    EnvironmentHelper.LessonsRoot = "https://staging.lessons.church";
    EnvironmentHelper.MemberWebRoot = "https://{subdomain}.staging.machonharuach.org";
  };

  static initStaging = () => {
    EnvironmentHelper.initDev();
  };

  static initFromExtra = (extra: any) => {
    const pick = (value: any, fallback: string) => (typeof value === "string" && value.trim() ? value.trim() : fallback);
    const normalizeLocalhostForAndroid = (url: string) => {
      if (Platform.OS !== "android") return url;
      return url
        .replace("http://localhost", "http://10.0.2.2")
        .replace("https://localhost", "https://10.0.2.2")
        .replace("http://127.0.0.1", "http://10.0.2.2")
        .replace("https://127.0.0.1", "https://10.0.2.2");
    };

    EnvironmentHelper.MembershipApi = normalizeLocalhostForAndroid(pick(extra.MEMBERSHIP_API, EnvironmentHelper.MembershipApi));
    EnvironmentHelper.MessagingApi = normalizeLocalhostForAndroid(pick(extra.MESSAGING_API, EnvironmentHelper.MessagingApi));
    EnvironmentHelper.AttendanceApi = normalizeLocalhostForAndroid(pick(extra.ATTENDANCE_API, EnvironmentHelper.AttendanceApi));
    const memExtra = typeof extra.MEMBERSHIP_API === "string" ? extra.MEMBERSHIP_API.trim() : "";
    const attExtra = typeof extra.ATTENDANCE_API === "string" ? extra.ATTENDANCE_API.trim() : "";
    if (memExtra && !attExtra) {
      const noTrail = memExtra.replace(/\/$/, "");
      if (noTrail.toLowerCase().endsWith("/membership")) {
        EnvironmentHelper.AttendanceApi = normalizeLocalhostForAndroid(noTrail.replace(/\/membership$/i, "/attendance"));
      }
    }
    EnvironmentHelper.GivingApi = normalizeLocalhostForAndroid(pick(extra.GIVING_API, EnvironmentHelper.GivingApi));
    EnvironmentHelper.ContentApi = normalizeLocalhostForAndroid(pick(extra.CONTENT_API, EnvironmentHelper.ContentApi));
    EnvironmentHelper.DoingApi = normalizeLocalhostForAndroid(pick(extra.DOING_API, EnvironmentHelper.DoingApi));
    EnvironmentHelper.LessonsApi = normalizeLocalhostForAndroid(pick(extra.LESSONS_API, EnvironmentHelper.LessonsApi));

    EnvironmentHelper.ContentRoot = pick(extra.CONTENT_ROOT, EnvironmentHelper.ContentRoot);
    EnvironmentHelper.LessonsRoot = pick(extra.LESSONS_ROOT, EnvironmentHelper.LessonsRoot);
    EnvironmentHelper.MemberWebRoot = normalizeLocalhostForAndroid(
      pick(extra.MEMBER_WEB_ROOT || extra.B1_WEB_ROOT, EnvironmentHelper.MemberWebRoot)
    );
  };

  static initProd = () => {
    EnvironmentHelper.MembershipApi = "https://api.machonharuach.org/membership";
    EnvironmentHelper.MessagingApi = "https://api.machonharuach.org/messaging";
    EnvironmentHelper.AttendanceApi = "https://api.machonharuach.org/attendance";
    EnvironmentHelper.GivingApi = "https://api.machonharuach.org/giving";
    EnvironmentHelper.LessonsApi = "https://api.lessons.church";
    EnvironmentHelper.DoingApi = "https://api.machonharuach.org/doing";
    EnvironmentHelper.ContentApi = "https://api.machonharuach.org/content";
    EnvironmentHelper.ContentRoot = "https://content.machonharuach.org";
    EnvironmentHelper.LessonsRoot = "https://lessons.church";
    EnvironmentHelper.MemberWebRoot = "https://{subdomain}.machonharuach.org";
  };

  /** @deprecated Use MemberWebRoot */
  static get B1WebRoot(): string {
    return EnvironmentHelper.MemberWebRoot;
  }
  static set B1WebRoot(value: string) {
    EnvironmentHelper.MemberWebRoot = value;
  }
}
