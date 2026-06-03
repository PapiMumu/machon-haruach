import {
  ApiHelper,
  ArrayHelper,
  type LoginResponseInterface,
  type LoginUserChurchInterface,
  type PersonInterface,
  type UserContextInterface
} from "@machonharuach/helpers";
import { UserHelper } from "@machonharuach/apphelper";

const APP_NAME = "Machon HaRuach Admin";

const normalizeChurchText = (s: string) => (s || "").toLowerCase().trim();

/** Match LoginPage church auto-select (Spirit Embassy / env default). */
export function resolveAutoChurchId(
  userChurches: LoginUserChurchInterface[],
  defaultChurchId?: string
): string | null {
  const preferredId = (defaultChurchId || process.env.REACT_APP_DEFAULT_CHURCH_ID || "").trim();
  if (preferredId) return preferredId;
  if (!userChurches?.length) return null;

  const byName = userChurches.find((uc) => normalizeChurchText(uc?.church?.name).includes("spirit embassy"));
  if (byName?.church?.id) return byName.church.id;

  const bySubdomain = userChurches.find((uc) => normalizeChurchText(uc?.church?.subDomain).includes("spirit"));
  if (bySubdomain?.church?.id) return bySubdomain.church.id;

  if (userChurches.length === 1) return userChurches[0].church.id;
  return null;
}

/**
 * Restore Admin session from the user JWT cookie (same flow as login page auto-login).
 */
export async function restoreSessionFromJwt(
  jwt: string,
  lastChurchId: string | undefined,
  context: UserContextInterface
): Promise<boolean> {
  try {
    const resp: LoginResponseInterface = await ApiHelper.postAnonymous(
      "/users/login",
      { jwt, appName: APP_NAME },
      "MembershipApi"
    );
    if (!resp?.user?.jwt) return false;

    let userJwt = resp.user.jwt;
    (resp.userChurches || []).forEach((uc) => {
      if (!uc.apis) uc.apis = [];
    });
    UserHelper.user = resp.user;
    UserHelper.userChurches = resp.userChurches || [];
    ApiHelper.setDefaultPermissions(userJwt);

    const lockToSingleChurch = (process.env.REACT_APP_LOCK_CHURCH_ID || "").toLowerCase() === "true";
    const defaultChurchId = (process.env.REACT_APP_DEFAULT_CHURCH_ID || "").trim();

    let churchId = resolveAutoChurchId(UserHelper.userChurches, defaultChurchId);
    if (!churchId && lastChurchId && ArrayHelper.getOne(UserHelper.userChurches, "church.id", lastChurchId)) {
      churchId = lastChurchId;
    }
    if (!churchId && UserHelper.userChurches.length > 0) {
      churchId = UserHelper.userChurches[0].church?.id;
    }
    if (!churchId) return false;

    if (lockToSingleChurch) {
      const chosen =
        ArrayHelper.getOne(UserHelper.userChurches, "church.id", churchId) || UserHelper.userChurches[0];
      if (chosen) UserHelper.userChurches = [chosen];
    }

    if (!ArrayHelper.getOne(UserHelper.userChurches, "church.id", churchId)) {
      const userChurch: LoginUserChurchInterface = await ApiHelper.post(
        "/churches/select",
        { churchId },
        "MembershipApi"
      );
      UserHelper.setupApiHelper(userChurch);
      await ApiHelper.get("/people/claim/" + churchId, "MembershipApi");

      const relogin: LoginResponseInterface = await ApiHelper.postAnonymous(
        "/users/login",
        { jwt: userJwt, appName: APP_NAME },
        "MembershipApi"
      );
      userJwt = relogin.user.jwt;
      UserHelper.user = relogin.user;
      UserHelper.userChurches = relogin.userChurches || UserHelper.userChurches;
      ApiHelper.setDefaultPermissions(userJwt);
    }

    await UserHelper.selectChurch(context, churchId);
    if (!UserHelper.currentUserChurch) return false;

    context.setUser(UserHelper.user);
    context.setUserChurches(UserHelper.userChurches);
    context.setUserChurch(UserHelper.currentUserChurch);

    let person: PersonInterface;
    try {
      const personId = UserHelper.currentUserChurch.person?.id;
      person = personId
        ? await ApiHelper.get(`/people/${personId}`, "MembershipApi")
        : await ApiHelper.get("/people/claim/" + UserHelper.currentUserChurch.church.id, "MembershipApi");
    } catch {
      person = await ApiHelper.get("/people/claim/" + UserHelper.currentUserChurch.church.id, "MembershipApi");
    }
    if (person) {
      UserHelper.person = person;
      context.setPerson(person);
    }

    return ApiHelper.isAuthenticated;
  } catch (e) {
    console.warn("Session restore failed", e);
    ApiHelper.clearPermissions();
    return false;
  }
}
