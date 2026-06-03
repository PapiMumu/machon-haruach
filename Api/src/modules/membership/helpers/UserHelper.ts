import { LoginUserChurch, RolePermission } from "../models/index.js";
import { Brand } from "../../../shared/constants/brand.js";
import { Environment, permissionsList } from "./index.js";
import { ArrayHelper, EmailHelper } from "@machonharuach/apihelper";

export class UserHelper {
  private static addAllPermissions(luc: LoginUserChurch) {
    permissionsList.forEach((perm) => {
      let api = ArrayHelper.getOne(luc.apis, "keyName", perm.apiName);
      if (api === null) {
        api = { keyName: perm.apiName, permissions: [] };
        luc.apis.push(api);
      }

      const existing = ArrayHelper.getOne(ArrayHelper.getAll(api.permissions, "contentType", perm.section), "action", perm.action);

      if (!existing) {
        const permission: RolePermission = { action: perm.action, contentType: perm.section, contentId: "" };
        api.permissions.push(permission);
      }
    });
  }

  public static addAllReportingPermissions(lucs: LoginUserChurch[]) {
    lucs.forEach((luc) => {
      this.addReportingPermissions(luc);
    });
  }

  private static addReportingPermissions(luc: LoginUserChurch) {
    const reportingApi = ArrayHelper.getOne(luc.apis, "keyName", "ReportingApi");
    if (reportingApi !== null) {
      luc.apis.forEach((api) => {
        if (api.keyName !== "ReportingApi") {
          api.permissions.forEach((perm) => {
            const reportingPermission = { ...perm, apiName: api.keyName };
            reportingApi.permissions.push(reportingPermission);
          });
        }
      });
    }
  }

  static async replaceDomainAdminPermissions(roleUserChurches: LoginUserChurch[]) {
    roleUserChurches.forEach((luc) => {
      luc.apis.forEach((api) => {
        if (api.keyName === "MembershipApi") {
          for (let i = api.permissions.length - 1; i >= 0; i--) {
            const perm = api.permissions[i];
            if (perm.contentType === "Domain" && perm.action === "Admin") {
              api.permissions.splice(i, 1);
              UserHelper.addAllPermissions(luc);
            }
          }
        }
      });
    });
  }

  static sendWelcomeEmail(
    email: string,
    loginLink: string,
    appName: string,
    appUrl: string,
    mobilePasswordResetBase?: string,
    mobileAndroidPackage?: string,
    resetHandoffApiBase?: string
  ): Promise<any> {
    if (!appName) appName = Brand.name;
    const webRoot = (appUrl || Environment.adminWebRoot).replace(/\/$/, "");
    const webHref = webRoot + loginLink;

    const authMatch = loginLink.match(/[?&]auth=([^&]+)/);
    const tsMatch = loginLink.match(/[?&]timestamp=([^&]+)/);
    const authGuid = authMatch ? decodeURIComponent(authMatch[1]) : "";
    const timestamp = tsMatch ? decodeURIComponent(tsMatch[1]) : "";

    const isPublicAdminHost = /^https?:\/\/(www\.)?admin\.machonharuach\.org\/?$/i.test(webRoot);
    const mb = mobilePasswordResetBase?.trim();
    const pkg = (mobileAndroidPackage?.trim() || Brand.mobilePackage).replace(/[^a-z0-9._]/gi, "");

    const handoffBase = resetHandoffApiBase?.trim();
    let buttonHref = webHref;
    if (handoffBase && authGuid && timestamp !== "") {
      const base = handoffBase.replace(/\/$/, "");
      const pkgParam = pkg ? `&pkg=${encodeURIComponent(pkg)}` : "";
      buttonHref = `${base}/users/reset-in-app?authGuid=${encodeURIComponent(authGuid)}&email=${encodeURIComponent(email)}&timestamp=${encodeURIComponent(timestamp)}${pkgParam}`;
    } else if (!isPublicAdminHost) {
      buttonHref = webHref;
    } else if (mb && authGuid && pkg) {
      const schemeMatch = mb.match(/^([a-z][a-z0-9+.-]*):/i);
      const scheme = schemeMatch ? schemeMatch[1] : Brand.mobileDeepLinkScheme;
      const q =
        `authGuid=${encodeURIComponent(authGuid)}&email=${encodeURIComponent(email)}` +
        (timestamp ? `&timestamp=${encodeURIComponent(timestamp)}` : "");
      const fallback = encodeURIComponent(webHref);
      buttonHref = `intent://auth/set-password?${q}#Intent;scheme=${scheme};package=${pkg};S.browser_fallback_url=${fallback};end`;
    }

    const hrefForHtml = buttonHref.replace(/&/g, "&amp;");

    const brandedAppName = appName === "Admin" ? "Machon HaRuach Admin" : appName;
    const logoHtml = Environment.emailLogoUrl
      ? `<p style="margin: 0 0 18px 0;"><img src="${Environment.emailLogoUrl}" alt="Machon HaRuach" style="max-width: 180px; width: 100%; height: auto;" /></p>`
      : "";

    const contents =
      logoHtml +
      "<h2>Welcome to " +
      brandedAppName +
      "</h2>" +
      "<p>Machon HaRuach exists to help you stay connected, grow in the Word, and participate in what God is doing through our ministry.</p>" +
      "<p><strong>Your 7-day free trial starts now.</strong> You will not be charged today. After the trial period, an active monthly subscription is required to continue full access.</p>" +
      "<p>Please click the button below to set your password and continue registration.</p>" +
      `<p><a href="${hrefForHtml}" class="btn btn-primary">Set Password</a></p>`;
    return EmailHelper.sendTemplatedEmail(Environment.supportEmail, email, brandedAppName, webRoot, "Welcome to " + brandedAppName + ".", contents, "ChurchEmailTemplate.html");
  }

  static sendInviteEmail(email: string, personName: string, contextName: string, churchName: string, loginLink: string, isExistingUser: boolean): Promise<any> {
    const appName = churchName || Brand.name;
    const appUrl = Environment.adminWebRoot;
    const actionLabel = isExistingUser ? "Log In" : "Sign Up";
    const subject = "You've been added to " + contextName;
    const contents =
      "<h2>Hello " + personName + ",</h2>" +
      "<p>You have been added to <strong>" + contextName + "</strong> at " + appName + ".</p>" +
      "<p>Click the button below to " + actionLabel.toLowerCase() + " and get started.</p>" +
      `<p><a href="${appUrl}${loginLink}" class="btn btn-primary">${actionLabel}</a></p>`;
    return EmailHelper.sendTemplatedEmail(Environment.supportEmail, email, appName, appUrl, subject, contents);
  }

  /**
   * Reset button should be a normal https:// URL (clickable in Gmail, including spam). Mobile sends
   * `resetHandoffApiBase` so the link hits `/membership/users/reset-in-app`, which opens the app.
   */
  static sendForgotEmail(
    email: string,
    loginLink: string,
    appName: string,
    appUrl: string,
    mobilePasswordResetBase?: string,
    mobileAndroidPackage?: string,
    resetHandoffApiBase?: string
  ): Promise<any> {
    if (!appName) appName = Brand.name;
    const webRoot = (appUrl || Environment.adminWebRoot).replace(/\/$/, "");
    const webHref = webRoot + loginLink;

    const authMatch = loginLink.match(/[?&]auth=([^&]+)/);
    const tsMatch = loginLink.match(/[?&]timestamp=([^&]+)/);
    const authGuid = authMatch ? decodeURIComponent(authMatch[1]) : "";
    const timestamp = tsMatch ? decodeURIComponent(tsMatch[1]) : "";

    const isPublicAdminHost = /^https?:\/\/(www\.)?admin\.machonharuach\.org\/?$/i.test(webRoot);
    const mb = mobilePasswordResetBase?.trim();
    const pkg = (mobileAndroidPackage?.trim() || Brand.mobilePackage).replace(/[^a-z0-9._]/gi, "");

    const handoffBase = resetHandoffApiBase?.trim();
    let buttonHref = webHref;
    if (handoffBase && authGuid && timestamp !== "") {
      const base = handoffBase.replace(/\/$/, "");
      const pkgParam = pkg ? `&pkg=${encodeURIComponent(pkg)}` : "";
      buttonHref = `${base}/users/reset-in-app?authGuid=${encodeURIComponent(authGuid)}&email=${encodeURIComponent(email)}&timestamp=${encodeURIComponent(timestamp)}${pkgParam}`;
    } else if (!isPublicAdminHost) {
      buttonHref = webHref;
    } else if (mb && authGuid && pkg) {
      const schemeMatch = mb.match(/^([a-z][a-z0-9+.-]*):/i);
      const scheme = schemeMatch ? schemeMatch[1] : Brand.mobileDeepLinkScheme;
      const q =
        `authGuid=${encodeURIComponent(authGuid)}&email=${encodeURIComponent(email)}` +
        (timestamp ? `&timestamp=${encodeURIComponent(timestamp)}` : "");
      const fallback = encodeURIComponent(webHref);
      buttonHref = `intent://auth/set-password?${q}#Intent;scheme=${scheme};package=${pkg};S.browser_fallback_url=${fallback};end`;
    }

    const hrefForHtml = buttonHref.replace(/&/g, "&amp;");

    const brandedAppName = appName === "Admin" ? "Machon HaRuach Admin" : appName;
    const logoHtml = Environment.emailLogoUrl
      ? `<p style="margin: 0 0 18px 0;"><img src="${Environment.emailLogoUrl}" alt="Machon HaRuach" style="max-width: 180px; width: 100%; height: auto;" /></p>`
      : "";

    const bulletButton = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto;">
<tr><td align="center" bgcolor="#1e3a5f" style="border-radius:10px;">
<a href="${hrefForHtml}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:22px;color:#ffffff !important;text-decoration:none;font-weight:700;border-radius:10px;">Reset Password</a>
</td></tr></table>`;

    const contents =
      logoHtml +
      "<h2>Reset your " +
      brandedAppName +
      " password</h2>" +
      "<p>If you requested a password reset, click the button below to choose a new password.</p>" +
      "<p style=\"margin-top: 0; color: rgba(17,24,39,0.72);\">If you did not request this, you can safely ignore this email.</p>" +
      "<p style=\"margin-bottom: 0; color: rgba(17,24,39,0.72);\">(This link is valid for 10 minutes.)</p>" +
      bulletButton;
    return EmailHelper.sendTemplatedEmail(Environment.supportEmail, email, brandedAppName, webRoot, brandedAppName + " Password Reset", contents, "ChurchEmailTemplate.html");
  }
}
