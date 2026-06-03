import { ApiHelper } from "@machonharuach/helpers";
import { UserHelper } from "@machonharuach/apphelper";
import type { LoginUserChurchInterface } from "@machonharuach/helpers";

/** True when the user has Domain Admin (full access). */
function hasDomainAdminAccess(): boolean {
  const membership = ApiHelper.getConfig("MembershipApi");
  return (membership?.permissions || []).some(
    (p) => p.contentType === "Domain" && p.action === "Admin"
  );
}

/**
 * True when the signed-in user has at least one admin permission from an assigned role
 * (not merely a userChurch link with empty APIs).
 */
export function userHasAssignedAdminRole(userChurch?: LoginUserChurchInterface | null): boolean {
  if (!ApiHelper.isAuthenticated) return false;
  if (hasDomainAdminAccess()) return true;

  const uc = userChurch ?? UserHelper.currentUserChurch;
  const apis = uc?.apis || [];
  for (const api of apis) {
    if (api.keyName === "ReportingApi") continue;
    if ((api.permissions?.length || 0) > 0) return true;
  }

  // Fallback: any API config with role permissions (after setupApiHelper).
  for (const config of ApiHelper.apiConfigs || []) {
    if (config.keyName === "ReportingApi") continue;
    if ((config.permissions?.length || 0) > 0) return true;
  }

  return false;
}
