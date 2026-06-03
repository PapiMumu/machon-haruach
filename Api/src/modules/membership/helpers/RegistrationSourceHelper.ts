const ADMIN_APP_NAMES = ["gnw admin", "machon haruach admin", "admin", "b1admin"];

export type RegistrationSource = "mobile" | "admin";

export class RegistrationSourceHelper {
  private static isAdminApp(appName: string | null | undefined): boolean {
    if (!appName) return false;
    const normalized = appName.trim().toLowerCase();
    return ADMIN_APP_NAMES.includes(normalized) || normalized.includes("admin");
  }

  public static resolve(_membershipStatus: string | null | undefined, hasUserAccount: boolean, firstAccessApp: string | null | undefined): RegistrationSource {
    if (!hasUserAccount) return "admin";
    if (this.isAdminApp(firstAccessApp)) return "admin";
    return "mobile";
  }
}
