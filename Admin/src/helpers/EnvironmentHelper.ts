import { CommonEnvironmentHelper, ApiHelper, Locale } from "@machonharuach/apphelper";
import { EnvironmentHelper as WebsiteEnvironmentHelper } from "@machonharuach/apphelper-website";
import { FileHelper } from "@machonharuach/helpers";

export class EnvironmentHelper {
  private static LessonsApi = "";
  static B1Url = "";
  static ChurchAppsUrl = "";
  static Common = CommonEnvironmentHelper;
  private static uploaderPatched = false;
  private static formDataAclPatched = false;

  /**
   * `CommonEnvironmentHelper.init("staging"|"prod")` hardcodes api.*.churchapps.org and does NOT read REACT_APP_*.
   * Self-hosted stacks set REACT_APP_ATTENDANCE_API etc. in .env — those must win or Admin never hits your Lambda.
   */
  private static applyReactAppApiOverrides() {
    const e = process.env;
    const C = EnvironmentHelper.Common;
    C.AttendanceApi = e.REACT_APP_ATTENDANCE_API || e.NEXT_PUBLIC_ATTENDANCE_API || C.AttendanceApi;
    C.DoingApi = e.REACT_APP_DOING_API || e.NEXT_PUBLIC_DOING_API || C.DoingApi;
    C.GivingApi = e.REACT_APP_GIVING_API || e.NEXT_PUBLIC_GIVING_API || C.GivingApi;
    C.MembershipApi = e.REACT_APP_MEMBERSHIP_API || e.NEXT_PUBLIC_MEMBERSHIP_API || C.MembershipApi;
    C.ReportingApi = e.REACT_APP_REPORTING_API || e.NEXT_PUBLIC_REPORTING_API || C.ReportingApi;
    C.MessagingApi = e.REACT_APP_MESSAGING_API || e.NEXT_PUBLIC_MESSAGING_API || C.MessagingApi;
    C.MessagingApiSocket = e.REACT_APP_MESSAGING_API_SOCKET || e.NEXT_PUBLIC_MESSAGING_API_SOCKET || C.MessagingApiSocket;
    C.ContentApi = e.REACT_APP_CONTENT_API || e.NEXT_PUBLIC_CONTENT_API || C.ContentApi;
    C.AskApi = e.REACT_APP_ASK_API || e.NEXT_PUBLIC_ASK_API || C.AskApi;
    C.GoogleAnalyticsTag = e.REACT_APP_GOOGLE_ANALYTICS || e.NEXT_PUBLIC_GOOGLE_ANALYTICS || C.GoogleAnalyticsTag;
    C.ContentRoot = e.REACT_APP_CONTENT_ROOT || e.NEXT_PUBLIC_CONTENT_ROOT || C.ContentRoot;
    C.B1Root = e.REACT_APP_B1_ROOT || e.NEXT_PUBLIC_B1_ROOT || C.B1Root;
    C.AdminRoot = e.REACT_APP_B1ADMIN_ROOT || e.NEXT_PUBLIC_B1ADMIN_ROOT || C.AdminRoot;
    C.LessonsRoot = e.REACT_APP_LESSONS_ROOT || e.NEXT_PUBLIC_LESSONS_ROOT || C.LessonsRoot;
  }

  /** `@machonharuach/apphelper-website` rebuilds `ApiHelper.apiConfigs` from `Common` after our first override — sync URLs again. */
  private static syncApiHelperUrlsFromCommon() {
    const C = EnvironmentHelper.Common;
    const byKey: Record<string, string> = {
      MembershipApi: C.MembershipApi,
      AttendanceApi: C.AttendanceApi,
      MessagingApi: C.MessagingApi,
      ContentApi: C.ContentApi,
      GivingApi: C.GivingApi,
      DoingApi: C.DoingApi
    };
    ApiHelper.apiConfigs.forEach((cfg) => {
      const url = byKey[cfg.keyName];
      if (url) cfg.url = url;
    });
  }

  /**
   * S3 buckets with Object Ownership = Bucket owner enforced reject ACL fields.
   * Patch helper upload to avoid sending acl=public-read in browser FormData.
   */
  private static patchPresignedUploaderForAclFreeBuckets() {
    if (EnvironmentHelper.uploaderPatched) return;
    EnvironmentHelper.uploaderPatched = true;

    const uploadWithoutAcl = (presigned: any, uploadedFile: File, progressCallback: (percent: number) => void) => {
      const formData = new FormData();
      if (presigned?.fields) {
        for (const property in presigned.fields) {
          formData.append(property, presigned.fields[property]);
        }
      }
      // Some presigned responses put key/content-type in root or fields.
      // Only append fallback values if the field wasn't already supplied.
      if (!presigned?.fields?.key && presigned?.key) formData.append("key", presigned.key);
      if (!presigned?.fields?.["Content-Type"] && uploadedFile?.type) formData.append("Content-Type", uploadedFile.type);
      formData.append("file", uploadedFile);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progressCallback(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              status: xhr.status,
              statusText: xhr.statusText,
              data: xhr.responseText
            });
          } else {
            reject(new Error(`HTTP Error: ${xhr.status} ${xhr.statusText}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error occurred"));
        });

        xhr.open("POST", presigned.url);
        xhr.send(formData);
      });
    };

    FileHelper.postPresignedFile = uploadWithoutAcl;
  }

  /**
   * Some bundled upload helpers still append `acl=public-read` directly to FormData.
   * For ACL-disabled S3 buckets this causes: "Invalid according to Policy: Extra input fields: acl".
   */
  private static patchFormDataAclAppend() {
    if (EnvironmentHelper.formDataAclPatched) return;
    EnvironmentHelper.formDataAclPatched = true;

    const originalAppend = FormData.prototype.append;
    FormData.prototype.append = function(name: string, value: string | Blob, fileName?: string) {
      if (name === "acl") return;
      if (fileName !== undefined) {
        return originalAppend.call(this, name, value, fileName);
      }
      return originalAppend.call(this, name, value);
    };
  }

  static init = async () => {
    const stage = process.env.REACT_APP_STAGE;

    switch (stage) {
      case "staging": EnvironmentHelper.initStaging(); break;
      case "prod": EnvironmentHelper.initProd(); break;
      default: EnvironmentHelper.initDev(); break;
    }
    EnvironmentHelper.Common.init(stage);
    // Apply .env before website helper runs — it calls Common.init again and rebuilds apiConfigs.
    EnvironmentHelper.applyReactAppApiOverrides();

    WebsiteEnvironmentHelper.init();
    // Website helper resets Common + apiConfigs from hardcoded churchapps hosts unless we override again.
    EnvironmentHelper.applyReactAppApiOverrides();
    EnvironmentHelper.syncApiHelperUrlsFromCommon();
    EnvironmentHelper.patchPresignedUploaderForAclFreeBuckets();
    EnvironmentHelper.patchFormDataAclAppend();

    ApiHelper.apiConfigs.push(
      {
        keyName: "ReportingApi",
        url: EnvironmentHelper.Common.ReportingApi,
        jwt: "",
        permissions: []
      },
      {
        keyName: "LessonsApi",
        url: EnvironmentHelper.LessonsApi,
        jwt: "",
        permissions: []
      },
      {
        keyName: "AskApi",
        url: EnvironmentHelper.Common.AskApi,
        jwt: "",
        permissions: []
      }
    );

    // `/apphelper/locales/...` is not served by Vite dev server (returns index.html → JSON parse error).
    // `public/locales/{{lng}}.json` includes the strings Admin needs.
    await Locale.init([`/locales/{{lng}}.json?v=24`]);
  };

  static initLocal = async () => { };

  static initDev = () => {
    this.initStaging();
    EnvironmentHelper.LessonsApi = process.env.REACT_APP_LESSONS_API || EnvironmentHelper.LessonsApi;
    EnvironmentHelper.B1Url = process.env.REACT_APP_B1_WEBSITE_URL || EnvironmentHelper.B1Url;
  };

  //NOTE: None of these values are secret.
  static initStaging = () => {
    EnvironmentHelper.LessonsApi = "https://api.staging.lessons.church";
    EnvironmentHelper.B1Url = "https://{subdomain}.staging.machonharuach.org";
  };

  //NOTE: None of these values are secret.
  static initProd = () => {
    EnvironmentHelper.Common.GoogleAnalyticsTag = "G-47N4XQJQJ5";
    EnvironmentHelper.LessonsApi = "https://api.lessons.church";
    EnvironmentHelper.B1Url = "https://{subdomain}.machonharuach.org";
  };
}
