import { controller, httpDelete, httpGet, httpPost } from "inversify-express-utils";
import express from "express";
import bcrypt from "bcryptjs";
import { body, oneOf, validationResult } from "express-validator";
import { LoginRequest, User, ResetPasswordRequest, LoadCreateUserRequest, RegisterUserRequest, Church, EmailPassword, NewPasswordRequest, LoginUserChurch, Person, ActivateSubscriptionRequest } from "../models/index.js";
import { AuthenticatedUser } from "../auth/index.js";
import { MembershipBaseController } from "./MembershipBaseController.js";
import { EmailHelper, UserHelper, UserChurchHelper, UniqueIdHelper, Environment, Permissions, AuditLogHelper } from "../helpers/index.js";
import { v4 } from "uuid";
import { ChurchHelper } from "../helpers/index.js";
import { ArrayHelper } from "@machonharuach/apihelper";
import dayjs from "dayjs";

const emailPasswordValidation = [
  body("email").isEmail().trim().normalizeEmail({ gmail_remove_dots: false }).withMessage("enter a valid email address"),
  body("password").isLength({ min: 6 }).withMessage("must be at least 6 chars long")
];

const loadOrCreateValidation = [
  oneOf([
    [
      body("userEmail").exists().isEmail().withMessage("enter a valid email address").trim().normalizeEmail({ gmail_remove_dots: false }),
      body("firstName").exists().withMessage("enter first name").not().isEmpty().trim().escape(),
      body("lastName").exists().withMessage("enter last name").not().isEmpty().trim().escape()
    ],
    body("userId").exists().withMessage("enter userId").isString()
  ])
];

const registerValidation = [
  oneOf([
    [
      body("email").exists().isEmail().withMessage("enter a valid email address").trim().normalizeEmail({ gmail_remove_dots: false }),
      body("firstName").exists().withMessage("enter first name").not().isEmpty().trim().escape(),
      body("lastName").exists().withMessage("enter last name").not().isEmpty().trim().escape()
    ]
  ])
];

const setDisplayNameValidation = [
  body("userId").optional().isString(),
  body("firstName").exists().withMessage("enter first name").not().isEmpty().trim().escape(),
  body("lastName").exists().withMessage("enter last name").not().isEmpty().trim().escape()
];

const updateEmailValidation = [body("userId").optional().isString(), body("email").isEmail().trim().normalizeEmail({ gmail_remove_dots: false }).withMessage("enter a valid email address")];

@controller("/membership/users")
export class UserController extends MembershipBaseController {
  private readonly trialLengthDays = 7;

  /**
   * Member/mobile apps enforce user-level trial/subscription on login.
   * Church admin web skips that gate when `appName` matches an entry in
   * MEMBERSHIP_LOGIN_SUBSCRIPTION_EXEMPT_APP_NAMES (comma-separated; compared case-insensitively).
   * - Unset or blank env → defaults to "Machon HaRuach Admin" (Admin).
   * - Set to "__none__" to enforce subscription for every client (no exemptions).
   */
  /** Match POST /checkEmail normalization so login and checkEmail agree on the same user row. */
  private normalizeLoginEmail(raw: string): string {
    return (raw || "").trim().toLowerCase();
  }

  /** Lightweight DB check — use GET /membership/users/db-ping when login returns 502. */
  @httpGet("/db-ping")
  public async dbPing(req: express.Request, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const hasEnv = Boolean((process.env.MEMBERSHIP_CONNECTION_STRING || "").trim());
      if (!hasEnv) {
        return this.json({ ok: false, error: "MEMBERSHIP_CONNECTION_STRING is not set on Lambda" }, 503);
      }
      try {
        const user = await this.repos.user.loadByEmail("___db_ping_probe___@invalid.local");
        void user;
        return this.json({ ok: true, database: "reachable" }, 200);
      } catch (e: unknown) {
        const err = e as { code?: string; errno?: number; message?: string };
        return this.json({
          ok: false,
          error: err?.message || String(e),
          code: err?.code,
          errno: err?.errno,
          hint: "Check VPC security groups (Lambda sg → RDS), RDS host in SSM /staging/membershipApi/connectionString, and that the DB is running."
        }, 503);
      }
    });
  }

  private loginAppNameSkipsUserSubscriptionGate(appName: string | undefined): boolean {
    const name = (appName || "").trim().toLowerCase();
    if (!name) return false;
    const envRaw = process.env.MEMBERSHIP_LOGIN_SUBSCRIPTION_EXEMPT_APP_NAMES;
    let csv: string;
    if (envRaw === undefined || String(envRaw).trim() === "") {
      csv = "Machon HaRuach Admin";
    } else if (String(envRaw).trim().toLowerCase() === "__none__") {
      csv = "";
    } else {
      csv = String(envRaw);
    }
    const list = csv
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return list.includes(name);
  }

  private resolveAccess(user: User): {
    allowed: boolean;
    accessStatus: "active" | "trialing" | "inactive";
    denialCode?: "TRIAL_EXPIRED" | "SUBSCRIPTION_INACTIVE";
  } {
    const subscriptionStatus = String(user.subscriptionStatus || "active").toLowerCase();
    const now = dayjs();

    if (subscriptionStatus === "trialing") {
      if (user.trialEndsAt && dayjs(user.trialEndsAt).isBefore(now)) {
        return { allowed: false, accessStatus: "inactive", denialCode: "TRIAL_EXPIRED" };
      }
      return { allowed: true, accessStatus: "trialing" };
    }

    if (subscriptionStatus === "canceled" || subscriptionStatus === "past_due" || subscriptionStatus === "inactive") {
      if (user.subscriptionEndsAt && dayjs(user.subscriptionEndsAt).isAfter(now)) {
        return { allowed: true, accessStatus: "active" };
      }
      return { allowed: false, accessStatus: "inactive", denialCode: "SUBSCRIPTION_INACTIVE" };
    }

    return { allowed: true, accessStatus: "active" };
  }

  @httpPost("/login")
  public async login(req: express.Request<{}, {}, LoginRequest>, res: express.Response): Promise<any> {
    // Ensure repositories are hydrated for anonymous access routes
    return this.actionWrapperAnon(req, res, async () => {
      try {
        const bodyAny = req.body as any;
        const email = this.normalizeLoginEmail((bodyAny?.email || bodyAny?.userEmail || "") as string);
        const password = ((bodyAny?.password || "") as string).trim();
        const jwt = ((bodyAny?.jwt || "") as string);
        const authGuid = ((bodyAny?.authGuid || "") as string);
        const appName = (bodyAny?.appName || "") as string;
        console.log("login attempt", { hasJwt: jwt !== "", hasAuthGuid: authGuid !== "", email: email ? "[provided]" : "[missing]", appName: appName ? "[provided]" : "[missing]" });

        let user: User = null;
        if (jwt !== "") {
          user = await AuthenticatedUser.loadUserByJwt(jwt, this.repos);
        } else if (authGuid !== "") {
          user = await this.repos.user.loadByAuthGuid(authGuid);
          if (user !== null) {
            // user.authGuid = "";
            // await this.repos.user.save(user);
          }
        } else {
          // Some clients send userEmail instead of email.
          if (email === "") {
            return this.denyAccess(["Login failed"]);
          }

          user = await this.repos.user.loadByEmail(email);
          if (user !== null) {
            if (!bcrypt.compareSync(password, user.password?.toString() || "")) user = null;
          }
        }

        if (user === null) {
          console.log("login failed (user null)", { email: email ? "[provided]" : "[missing]" });
          const ip = AuditLogHelper.getClientIp(req);
          const failEmail = email || authGuid || (jwt ? "(jwt)" : "(unknown)");
          AuditLogHelper.logLogin(this.repos, "", "", false, ip, { email: failEmail, reason: "Invalid Credentials" });
          return this.denyAccess(["Login failed"]);
        } else {
          const access = this.loginAppNameSkipsUserSubscriptionGate(appName) ? { allowed: true as const, accessStatus: "active" as const } : this.resolveAccess(user);
          if (!access.allowed) {
            if (access.denialCode === "TRIAL_EXPIRED" && user.subscriptionStatus !== "inactive") {
              user.subscriptionStatus = "inactive";
              await this.repos.user.save(user);
            }
            return this.json({
              user: null,
              userChurches: [],
              errors: [access.denialCode],
              accessStatus: access.accessStatus,
              subscriptionStatus: user.subscriptionStatus || "inactive",
              trialEndsAt: user.trialEndsAt || null,
              subscriptionEndsAt: user.subscriptionEndsAt || null
            }, 402);
          }

          if (user.email) {
            await UserChurchHelper.syncDirectoryLinksForUser(user.id, user.email);
          }
          const userChurches = await this.getUserChurches(user.id);

          const churchesOnly: Church[] = [];
          userChurches.forEach((uc) => churchesOnly.push(uc.church));
          await ChurchHelper.appendLogos(churchesOnly);
          userChurches.forEach((uc) => {
            const foundChurch = ArrayHelper.getOne(churchesOnly, "id", uc.church.id);
            uc.church.settings = foundChurch?.settings || [];
          });

          const result = await AuthenticatedUser.login(userChurches, user);
          if (result === null) return this.denyAccess(["No permissions"]);
          else {
            user.lastLogin = new Date();
            this.repos.user.save(user);
            const ip = AuditLogHelper.getClientIp(req);
            userChurches.forEach((uc) => {
              AuditLogHelper.logLogin(this.repos, uc.church.id, user.id, true, ip, { email: user.email });
            });
            return this.json(result, 200);
          }
        }
      } catch (e) {
        if (Environment.currentEnvironment === "dev") {
          throw e;
        }
        return this.error([e.toString()]);
      }
    });
  }

  @httpPost("/activateSubscription", ...emailPasswordValidation)
  public async activateSubscription(req: express.Request<{}, {}, ActivateSubscriptionRequest>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const email = String(req.body.email || "").trim();
      const password = String(req.body.password || "");
      const user = await this.repos.user.loadByEmail(email);
      if (!user || !bcrypt.compareSync(password, user.password?.toString() || "")) {
        return this.denyAccess(["Login failed"]);
      }

      user.subscriptionStatus = "active";
      user.subscriptionEndsAt = dayjs().add(30, "day").toDate();
      await this.repos.user.save(user);

      const userChurches = await this.getUserChurches(user.id);
      const churchesOnly: Church[] = [];
      userChurches.forEach((uc) => churchesOnly.push(uc.church));
      await ChurchHelper.appendLogos(churchesOnly);
      userChurches.forEach((uc) => {
        const foundChurch = ArrayHelper.getOne(churchesOnly, "id", uc.church.id);
        uc.church.settings = foundChurch?.settings || [];
      });

      const result = await AuthenticatedUser.login(userChurches, user);
      if (result === null) return this.denyAccess(["No permissions"]);
      return this.json(result, 200);
    });
  }

  private async getUserChurches(id: string): Promise<LoginUserChurch[]> {
    // Load user churches via Roles
    const roleUserChurches = await this.repos.rolePermission.loadForUser(id, true); // Set to true so churches[0] is always a real church.  Not sre why it was false before.  If we need to change this make it a param on the login request

    UserHelper.replaceDomainAdminPermissions(roleUserChurches);
    UserHelper.addAllReportingPermissions(roleUserChurches);

    // Load churches via userChurches relationships
    const userChurches: LoginUserChurch[] = await this.repos.church.loadForUser(id);

    userChurches.forEach((uc) => {
      if (!ArrayHelper.getOne(roleUserChurches, "church.id", uc.church.id)) roleUserChurches.push(uc);
    });

    const peopleIds: string[] = [];
    roleUserChurches.forEach((uc) => {
      if (uc.person.id) peopleIds.push(uc.person.id);
    });

    const allPeople = peopleIds.length > 0 ? await this.repos.person.loadByIdsOnly(peopleIds) : [];
    const allGroups = peopleIds.length > 0 ? await this.repos.groupMember.loadForPeople(peopleIds) : [];
    roleUserChurches.forEach((uc) => {
      const person = ArrayHelper.getOne(allPeople as any[], "id", uc.person.id);
      if (person) uc.person.membershipStatus = person.membershipStatus;
      const groups = ArrayHelper.getAll(allGroups as any[], "personId", uc.person.id);
      uc.groups = [];
      // PASS groupId TO ID FIELD. OR CREATE NEW groupId FIELD.
      groups.forEach((g) => uc.groups.push({ id: g.groupId, tags: g.tags, name: g.name, leader: g.leader }));
    });

    return roleUserChurches;
  }

  @httpPost("/verifyCredentials", ...emailPasswordValidation)
  public async verifyCredentials(req: express.Request<{}, {}, EmailPassword>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const user = await this.repos.user.loadByEmail(req.body.email);
        if (user === null) {
          return this.json({}, 200);
        }

        const passwordMatched = bcrypt.compareSync(req.body.password, user.password);
        if (!passwordMatched) {
          return this.denyAccess(["Incorrect password"]);
        }
        const userChurches = await this.repos.rolePermission.loadForUser(user.id, false);
        const churchNames = userChurches.map((uc) => uc.church.name);

        return this.json({ churches: churchNames }, 200);
      } catch (e) {
        if (Environment.currentEnvironment === "dev") {
          throw e;
        }
        this.logger.error(e);
        return this.error([e.toString()]);
      }
    });
  }

  private async grantAdminAccess(userChurches: LoginUserChurch[], churchId: string) {
    let universalChurch = null;
    userChurches.forEach((uc) => {
      if (uc.church.id === "") universalChurch = uc;
    });

    if (universalChurch !== null) {
      let selectedChurch = null;
      userChurches.forEach((uc) => {
        if (uc.church.id === churchId) selectedChurch = uc;
      });
      if (selectedChurch === null) {
        selectedChurch = await this.repos.rolePermission.loadForChurch(churchId, universalChurch);
        userChurches.push(selectedChurch);
      }
    }
  }

  @httpPost("/loadOrCreate", ...loadOrCreateValidation)
  public async loadOrCreate(req: express.Request<{}, {}, LoadCreateUserRequest>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (_au) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { userId, userEmail, firstName, lastName } = req.body;
      let user: User;
      let isNewUser = false;

      if (userId) user = await this.repos.user.load(userId);
      else user = await this.repos.user.loadByEmail(userEmail);

      if (!user) {
        isNewUser = true;
        const timestamp = Date.now();
        user = { email: userEmail, firstName, lastName };
        user.registrationDate = new Date();
        user.lastLogin = user.registrationDate;
        user.subscriptionStatus = "trialing";
        user.trialEndsAt = dayjs(user.registrationDate).add(this.trialLengthDays, "day").toDate();
        const tempPassword = UniqueIdHelper.shortId();
        user.password = bcrypt.hashSync(tempPassword, 10);
        user.authGuid = v4();
        user = await this.repos.user.save(user);
        await UserHelper.sendWelcomeEmail(user.email, `/login?auth=${user.authGuid}&timestamp=${timestamp}`, null, null);
        // Create userChurch records for matching people in groups
        await UserChurchHelper.createForNewUser(user.id, user.email);
      }
      user.password = null;
      (user as any).isNewUser = isNewUser;
      return this.json(user, 200);
    });
  }

  @httpPost("/register", ...registerValidation)
  public async register(req: express.Request<{}, {}, RegisterUserRequest>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const register: RegisterUserRequest = req.body;
      let user: User = await this.repos.user.loadByEmail(register.email);

      if (user) return res.status(400).json({ errors: ["user already exists"] });
      else {
        const regStart = Date.now();
        const tempPassword = UniqueIdHelper.shortId();
        user = { email: register.email, firstName: register.firstName, lastName: register.lastName };
        user.authGuid = v4();
        user.registrationDate = new Date();
        user.subscriptionStatus = "trialing";
        user.trialEndsAt = dayjs(user.registrationDate).add(this.trialLengthDays, "day").toDate();
        user.password = bcrypt.hashSync(tempPassword, 10);
        console.log("Register: bcrypt", Date.now() - regStart, "ms");

        let stepStart = Date.now();
        const userCount = await this.repos.user.loadCount();
        user = await this.repos.user.save(user);
        console.log("Register: save user", Date.now() - stepStart, "ms");

        // Create userChurch records for matching people in groups
        stepStart = Date.now();
        await UserChurchHelper.createForNewUser(user.id, user.email);
        console.log("Register: createForNewUser", Date.now() - stepStart, "ms");

        // Link pre-selected church from People record match (even if person isn't in a group)
        if (register.churchId) {
          stepStart = Date.now();
          const existingUC = await this.repos.userChurch.loadByUserId(user.id, register.churchId);
          if (!existingUC) {
            const matchingPeople = await this.repos.person.searchEmail(register.churchId, user.email);
            const exactMatch = matchingPeople.find((p: Person) => p.contactInfo?.email?.toLowerCase() === user.email.toLowerCase());
            if (exactMatch) {
              await this.repos.userChurch.save({ userId: user.id, churchId: register.churchId, personId: exactMatch.id });
            } else {
              // Ensure new registrants remain associated to the selected church even when no Person record exists yet.
              // This prevents the account from "disappearing" in church-scoped admin views that depend on userChurches.
              await this.repos.userChurch.save({ userId: user.id, churchId: register.churchId, personId: null });
            }
          }
          console.log("Register: link churchId", Date.now() - stepStart, "ms");
        }

        // Add first user to server admins group
        if (userCount === 0) {
          this.repos.role.loadAll().then((roles) => {
            this.repos.roleMember.save({ roleId: roles[0].id, userId: user.id, addedBy: user.id });
          });
        }

        // Send welcome/notification emails after user has been persisted.
        // Email delivery issues should not invalidate successful registration.
        try {
          const emailStart = Date.now();
          const timestamp = Date.now();
          const emailPromises: Promise<any>[] = [];
          emailPromises.push(
            UserHelper.sendWelcomeEmail(
              register.email,
              `/login?auth=${user.authGuid}&timestamp=${timestamp}`,
              register.appName,
              register.appUrl,
              register.mobilePasswordResetBase,
              register.mobileAndroidPackage,
              register.resetHandoffApiBase
            )
          );

          if (Environment.emailOnRegistration) {
            const emailBody = "Name: " + register.firstName + " " + register.lastName + "<br/>Email: " + register.email + "<br/>App: " + register.appName;
            emailPromises.push(EmailHelper.sendTemplatedEmail(Environment.supportEmail, Environment.supportEmail, register.appName, register.appUrl, "New User Registration", emailBody));
          }
          await Promise.all(emailPromises);
          console.log("Register: emails", Date.now() - emailStart, "ms");
        } catch (err) {
          this.logger.error(err);
        }

        console.log("Register: total", Date.now() - regStart, "ms");
      }
      user.password = null;
      return this.json(user, 200);
    });
  }

  @httpPost("/setPasswordGuid")
  public async setPasswordGuid(req: express.Request<{}, {}, NewPasswordRequest>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      try {
        const user = await this.repos.user.loadByAuthGuid(req.body.authGuid);
        if (user !== null) {
          user.authGuid = "";
          const hashedPass = bcrypt.hashSync(req.body.newPassword, 10);
          user.password = hashedPass;
          await this.repos.user.save(user);
          const ip = AuditLogHelper.getClientIp(req);
          AuditLogHelper.log(this.repos, "", user.id, "security", "password_changed", "user", user.id, { email: user.email, method: "authGuid" }, ip);
          return { success: true };
        } else return { success: false };
      } catch (e) {
        if (Environment.currentEnvironment === "dev") {
          throw e;
        }
        this.logger.error(e);
        return this.error([e.toString()]);
      }
    });
  }

  @httpPost("/forgot", body("userEmail").exists().trim().normalizeEmail({ gmail_remove_dots: false }).withMessage("enter a valid email address"))
  public async forgotPassword(req: express.Request<{}, {}, ResetPasswordRequest>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const user = await this.repos.user.loadByEmail(req.body.userEmail);
        if (user === null) return this.json({ emailed: false }, 200);
        else {
          user.authGuid = v4();
          const promises = [] as Promise<any>[];
          const timestamp = Date.now();
          promises.push(this.repos.user.save(user));
          promises.push(
            UserHelper.sendForgotEmail(
              user.email,
              `/login?auth=${user.authGuid}&timestamp=${timestamp}`,
              req.body.appName,
              req.body.appUrl,
              req.body.mobilePasswordResetBase,
              req.body.mobileAndroidPackage,
              req.body.resetHandoffApiBase
            )
          );
          await Promise.all(promises);
          const ip = AuditLogHelper.getClientIp(req);
          AuditLogHelper.log(this.repos, "", user.id, "security", "password_reset", "user", user.id, { email: user.email }, ip);
          return this.json({ emailed: true }, 200);
        }
      } catch (e) {
        if (Environment.currentEnvironment === "dev") {
          throw e;
        }
        this.logger.error(e);
        return this.error([e.toString()]);
      }
    });
  }

  /**
   * Public https page so password-reset emails can use a normal https:// link (clickable in Gmail, including spam).
   * Redirects into the Android app via intent://; shows a tap-to-open fallback.
   */
  @httpGet("/reset-in-app")
  public async resetInAppHandoff(req: express.Request, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const authGuid = String(req.query.authGuid || "").trim();
      const emailQ = String(req.query.email || "").trim().toLowerCase();
      const timestamp = String(req.query.timestamp || "").trim();
      const ts = parseInt(timestamp, 10);
      const now = Date.now();
      const maxAge = 12 * 60 * 1000;

      const sendErr = (status: number, title: string, message: string) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.status(status).send(UserController.resetHandoffErrorHtml(title, message));
      };

      if (!authGuid || !timestamp || Number.isNaN(ts) || now - ts > maxAge || ts > now + 3 * 60 * 1000) {
        return sendErr(400, "Link expired", "Request a new password reset from the app.");
      }

      const user = await this.repos.user.loadByAuthGuid(authGuid);
      if (!user || (emailQ && String(user.email || "").toLowerCase() !== emailQ)) {
        return sendErr(400, "Invalid link", "Request a new password reset from the app.");
      }

      const pkg = String(req.query.pkg || "org.machonharuach.mobile").replace(/[^a-z0-9._]/gi, "") || "org.machonharuach.mobile";
      const scheme = "machonharuach";
      const q = `authGuid=${encodeURIComponent(authGuid)}&email=${encodeURIComponent(user.email || emailQ)}`;
      const intentUrl = `intent://auth/set-password?${q}#Intent;scheme=${scheme};package=${pkg};end`;
      const appDeepLink = `${scheme}://auth/set-password?${q}`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(UserController.resetHandoffLaunchHtml(intentUrl, appDeepLink));
    });
  }

  private static escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  private static resetHandoffErrorHtml(title: string, message: string): string {
    const t = UserController.escapeHtml(title);
    const m = UserController.escapeHtml(message);
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t}</title>
<style>body{font-family:system-ui,sans-serif;background:#0f1118;color:#e5e7eb;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center}p{max-width:380px;line-height:1.5}</style>
</head><body><div><h1 style="font-size:1.25rem">${t}</h1><p>${m}</p></div></body></html>`;
  }

  private static escapeHtmlAttr(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  private static resetHandoffLaunchHtml(intentUrl: string, appDeepLink: string): string {
    const hrefIntent = UserController.escapeHtmlAttr(intentUrl);
    const hrefDeep = UserController.escapeHtmlAttr(appDeepLink);
    const intentJs = JSON.stringify(intentUrl);
    const deepJs = JSON.stringify(appDeepLink);
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Open app</title>
<style>body{font-family:system-ui,sans-serif;background:#0f1118;color:#e5e7eb;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center}
a.btn{display:inline-block;margin-top:20px;padding:14px 28px;background:#fff;color:#0f1118;border-radius:999px;font-weight:700;text-decoration:none}
p{opacity:.9;line-height:1.5;max-width:360px;margin:0 auto}</style></head><body>
<p>Opening the app to finish resetting your password…</p>
<a class="btn" href="${hrefIntent}">Open app</a>
<p style="margin-top:16px;font-size:14px;opacity:.75">If nothing happens, try: <a style="color:#93c5fd" href="${hrefDeep}">open in app</a></p>
<script>setTimeout(function(){try{window.location.href=${intentJs};}catch(e){window.location.href=${deepJs};}},300);</script>
</body></html>`;
  }

  @httpPost("/checkEmail", body("email").isEmail().trim().normalizeEmail({ gmail_remove_dots: false }))
  public async checkEmail(req: express.Request<{}, {}, { email: string }>, res: express.Response): Promise<any> {
    return this.actionWrapperAnon(req, res, async () => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const email = req.body.email;
      const user = await this.repos.user.loadByEmail(email);

      if (user) {
        return this.json({ exists: true, peopleMatches: [] }, 200);
      }

      const churches = await this.repos.church.loadAll();
      const matches: Array<{ firstName: string; lastName: string; churchId: string; churchName: string }> = [];

      for (const church of churches) {
        const matchingPeople = await this.repos.person.searchEmail(church.id, email);
        const exactMatches = matchingPeople.filter((p: Person) => p.contactInfo?.email?.toLowerCase() === email.toLowerCase());
        for (const person of exactMatches) {
          matches.push({
            firstName: person.name?.first || "",
            lastName: person.name?.last || "",
            churchId: church.id,
            churchName: church.name
          });
        }
      }

      return this.json({ exists: false, peopleMatches: matches }, 200);
    });
  }

  @httpPost("/setDisplayName", ...setDisplayNameValidation)
  public async setDisplayName(req: express.Request<{}, {}, { firstName: string; lastName: string; userId?: string }>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let user = await this.repos.user.load(req.body.userId || au.id);
      if (user !== null) {
        user.firstName = req.body.firstName;
        user.lastName = req.body.lastName;
        user = await this.repos.user.save(user);
      }
      user.password = null;
      return this.json(user, 200);
    });
  }

  @httpGet("/billingStatus")
  public async billingStatus(req: express.Request, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const user = await this.repos.user.load(au.id);
      if (!user) return this.json({ accessStatus: "inactive", subscriptionStatus: "inactive" }, 200);
      const access = this.resolveAccess(user);
      return this.json({
        accessStatus: access.accessStatus,
        subscriptionStatus: user.subscriptionStatus ?? null,
        trialEndsAt: user.trialEndsAt || null,
        subscriptionEndsAt: user.subscriptionEndsAt || null
      }, 200);
    });
  }

  @httpPost("/updateEmail", ...updateEmailValidation)
  public async updateEmail(req: express.Request<{}, {}, { email: string; userId?: string }>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const workingUserId = req.body.userId || au.id;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let user = await this.repos.user.load(workingUserId);
      if (user !== null) {
        const oldEmail = user.email;
        const existingUser = await this.repos.user.loadByEmail(req.body.email);
        if (existingUser === null || existingUser.id === workingUserId) {
          user.email = req.body.email;
          user = await this.repos.user.save(user);
          const ip = AuditLogHelper.getClientIp(req);
          AuditLogHelper.log(this.repos, au.churchId, au.id, "security", "email_changed", "user", workingUserId, { oldEmail, newEmail: req.body.email }, ip);
        } else return this.denyAccess(["Access denied"]);
      }

      user.password = null;
      return this.json(user, 200);
    });
  }

  @httpPost("/updateOptedOut")
  public async updateOptedOut(req: express.Request<{}, {}, { personId: string; optedOut: boolean }>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async () => {
      await this.repos.person.updateOptedOut(req.body.personId, req.body.optedOut);
      return this.json({}, 200);
    });
  }

  @httpPost("/updatePassword", body("newPassword").isLength({ min: 6 }).withMessage("must be at least 6 chars long"))
  public async updatePassword(req: express.Request<{}, {}, { newPassword: string }>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let user = await this.repos.user.load(au.id);
      if (user !== null) {
        const hashedPass = bcrypt.hashSync(req.body.newPassword, 10);
        user.password = hashedPass;
        user = await this.repos.user.save(user);
        const ip = AuditLogHelper.getClientIp(req);
        AuditLogHelper.log(this.repos, au.churchId, au.id, "security", "password_changed", "user", au.id, { email: user.email, method: "updatePassword" }, ip);
      }
      user.password = null;
      return this.json(user, 200);
    });
  }

  @httpGet("/search")
  public async search(req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      if (!au.checkAccess(Permissions.server.admin)) return this.json({}, 401);

      const term = req.query.term ? req.query.term.toString() : "";
      if (!term || term.trim().length < 2) {
        return this.json([], 200);
      }

      const users = await this.repos.user.search(term.trim());
      users.forEach((user) => {
        user.password = null;
        user.authGuid = null;
      });

      return this.json(users, 200);
    });
  }

  @httpPost("/sendInviteEmail")
  public async sendInviteEmail(req: express.Request<{}, {}, { email: string; personName: string; contextName: string; churchName: string }>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (_au) => {
      const { email, personName, contextName, churchName } = req.body;
      if (!email || !contextName) return res.status(400).json({ errors: ["email and contextName are required"] });

      let loginLink = "/";
      let isExistingUser = false;
      const user = await this.repos.user.loadByEmail(email);
      if (user) {
        isExistingUser = true;
        user.authGuid = v4();
        loginLink = `/login?auth=${user.authGuid}`;
        await Promise.all([
          this.repos.user.save(user),
          UserHelper.sendInviteEmail(email, personName || "", contextName, churchName || "", loginLink, isExistingUser)
        ]);
      } else {
        await UserHelper.sendInviteEmail(email, personName || "", contextName, churchName || "", loginLink, isExistingUser);
      }

      return this.json({ success: true }, 200);
    });
  }

  @httpDelete("/")
  public async Delete(req: express.Request<{}, {}, null>, res: express.Response): Promise<any> {
    return this.actionWrapper(req, res, async (au) => {
      await this.repos.user.delete(au.id);
      await this.repos.userChurch.delete(au.id);
      await this.repos.roleMember.deleteUser(au.id);
      return this.json({});
    });
  }
}
