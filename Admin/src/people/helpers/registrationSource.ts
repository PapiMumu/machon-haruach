import { type PersonInterface } from "@machonharuach/helpers";

export type RegistrationSource = "mobile" | "admin";

const ADMIN_APP_NAMES = ["gnw admin", "machon haruach admin", "admin", "b1admin"];

function isAdminApp(appName: string | null | undefined): boolean {
  if (!appName) return false;
  const normalized = appName.trim().toLowerCase();
  return ADMIN_APP_NAMES.includes(normalized) || normalized.includes("admin");
}

/**
 * Classify where a person was registered.
 * - No linked app login → Admin (directory record added in admin)
 * - Linked login with admin app first access → Admin (staff)
 * - Linked login otherwise → Mobile (mobile app registration / use)
 */
export function getPersonRegistrationSource(
  _person: PersonInterface,
  hasUserAccount: boolean,
  firstAccessApp?: string | null
): RegistrationSource {
  if (!hasUserAccount) return "admin";
  if (isAdminApp(firstAccessApp)) return "admin";
  return "mobile";
}
