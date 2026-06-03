/**
 * Patches @churchapps/apphelper-login dist bundle:
 * 1) Sends props.appName on POST /users/login (Membership API exempts admin app from user subscription gate).
 * 2) Clears "Welcome back" / pending auto-login as soon as login succeeds (avoids stuck splash if redirect hangs).
 * 3) Surfaces errors for JWT session refresh failures (402, etc.), not only email/password login.
 * 4) Softer, staff-oriented copy for SUBSCRIPTION_INACTIVE / TRIAL_EXPIRED when appName is GNW Admin; member-style copy otherwise.
 * 5) Removes node_modules/.vite after patching — Vite can otherwise keep a pre-bundled snapshot of this package
 *    that ignores edits under node_modules (login payload would stay email+password only).
 */
const fs = require("fs");
const path = require("path");

function resolveLoginPagePath() {
  const candidates = [
    path.join(__dirname, "..", "node_modules", "@machonharuach", "apphelper-login", "dist", "LoginPage.js"),
    path.join(__dirname, "..", "node_modules", "@churchapps", "apphelper-login", "dist", "LoginPage.js"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

const loginPagePath = resolveLoginPagePath();

const markerFailure = "getLoginFailureUserMessage";
const markerPayload = "__loginPayload";
const markerJwtElse = "directMsgJwt";
const markerLoginExistsHint = "self-hosted server";
const markerSuccessClear = "setPendingAutoLogin(false);\n        setWelcomeBackName(\"\");\n        userJwtBackup";

const insertion = `    const getLoginFailureUserMessage = (e) => {
        const raw = (e && e.message) ? String(e.message) : "";
        let firstError = "";
        try {
            const j = JSON.parse(raw);
            if (j && Array.isArray(j.errors) && j.errors.length > 0)
                firstError = String(j.errors[0]);
        }
        catch { }
        if (!firstError) {
            if (raw.includes("SUBSCRIPTION_INACTIVE"))
                firstError = "SUBSCRIPTION_INACTIVE";
            else if (raw.includes("TRIAL_EXPIRED"))
                firstError = "TRIAL_EXPIRED";
            else if (raw.includes("No permissions"))
                firstError = "No permissions";
        }
        const appLabel = (props.appName || "").trim().toLowerCase();
        const isGnwAdmin = appLabel === "gnw admin" || appLabel === "machon haruach admin" || appLabel.includes("admin");
        if (firstError === "SUBSCRIPTION_INACTIVE") {
            if (isGnwAdmin)
                return "Membership still has this account marked inactive (mobile subscription rules). A technical administrator should deploy the latest Membership API with the GNW Admin exemption, run npm install in B1Admin so appName is sent, or update the user record.";
            return "Your subscription is not active. Renew your plan from your church's billing settings, or contact support.";
        }
        if (firstError === "TRIAL_EXPIRED") {
            if (isGnwAdmin)
                return "Membership reports this trial has ended (mobile rules). A technical administrator can update the user record or confirm the GNW Admin exemption is deployed.";
            return "Your trial has ended. Subscribe to continue, or contact support.";
        }
        if (firstError === "No permissions")
            return "This account does not have permission to use this app. Ask a church administrator to assign you an admin role.";
        return null;
    };
`;

const oldCatchInner = `            if (!data.jwt)
                handleLoginErrors([e.toString()], data.email);`;

const newCatchInner = `            if (!data.jwt) {
                const directMsg = getLoginFailureUserMessage(e);
                if (directMsg)
                    setErrors([directMsg]);
                else
                    handleLoginErrors([e.toString()], data.email);
            }
            else {
                const directMsgJwt = getLoginFailureUserMessage(e);
                if (directMsgJwt)
                    setErrors([directMsgJwt]);
                else
                    setErrors(["Your session could not be restored. Please sign in again."]);
            }`;

const oldCatchInnerPatchedNoJwtElse = `            if (!data.jwt) {
                const directMsg = getLoginFailureUserMessage(e);
                if (directMsg)
                    setErrors([directMsg]);
                else
                    handleLoginErrors([e.toString()], data.email);
            }
            setIsSubmitting(false);`;

const newCatchInnerPatchedNoJwtElse = `            if (!data.jwt) {
                const directMsg = getLoginFailureUserMessage(e);
                if (directMsg)
                    setErrors([directMsg]);
                else
                    handleLoginErrors([e.toString()], data.email);
            }
            else {
                const directMsgJwt = getLoginFailureUserMessage(e);
                if (directMsgJwt)
                    setErrors([directMsgJwt]);
                else
                    setErrors(["Your session could not be restored. Please sign in again."]);
            }
            setIsSubmitting(false);`;

const oldLoginStart = `    const login = async (data) => {
        setErrors([]);
        setIsSubmitting(true);
        try {
            const resp = await ApiHelper.postAnonymous("/users/login", data, "MembershipApi");`;

const newLoginStart = `    const login = async (data) => {
        setErrors([]);
        setIsSubmitting(true);
        const __loginPayload = Object.assign({}, data);
        if (props.appName)
            __loginPayload.appName = props.appName;
        try {
            const resp = await ApiHelper.postAnonymous("/users/login", __loginPayload, "MembershipApi");`;

const oldHandleLoginSuccessHead = `    const handleLoginSuccess = async (resp) => {
        userJwtBackup = resp.user.jwt;`;

const newHandleLoginSuccessHead = `    const handleLoginSuccess = async (resp) => {
        setPendingAutoLogin(false);
        setWelcomeBackName("");
        userJwtBackup = resp.user.jwt;`;

function patchSelectChurchRegister() {
  const candidates = [
    path.join(__dirname, "..", "node_modules", "@machonharuach", "apphelper-login", "dist", "components", "SelectChurchRegister.js"),
    path.join(__dirname, "..", "node_modules", "@churchapps", "apphelper-login", "dist", "components", "SelectChurchRegister.js"),
  ];
  const bad = 'import { ErrorMessages, InputBox } from "../..";';
  const good = 'import { ErrorMessages, InputBox } from "@machonharuach/apphelper";';
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    let s = fs.readFileSync(p, "utf8");
    if (s.includes(bad)) {
      s = s.replace(bad, good);
      fs.writeFileSync(p, s, "utf8");
      console.log("patch-apphelper-login: fixed SelectChurchRegister InputBox import");
    }
    return;
  }
}

function resolveUserMenuPath() {
  const candidates = [
    path.join(__dirname, "..", "node_modules", "@machonharuach", "apphelper", "dist", "components", "wrapper", "UserMenu.js"),
    path.join(__dirname, "..", "node_modules", "@churchapps", "apphelper", "dist", "components", "wrapper", "UserMenu.js"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

const userMenuMarker = "Spirit Embassy admin: single church";

function patchUserMenu() {
  const userMenuPath = resolveUserMenuPath();
  if (!fs.existsSync(userMenuPath)) {
    console.warn("patch-apphelper-login: UserMenu.js not found, skip");
    return false;
  }
  let s = fs.readFileSync(userMenuPath, "utf8");
  if (s.includes(userMenuMarker)) return false;

  let changed = false;

  const oldCookies = 'import { useCookies, CookiesProvider } from "react-cookie";';
  const newCookies = 'import { CookiesProvider } from "react-cookie";';
  if (s.includes(oldCookies)) {
    s = s.replace(oldCookies, newCookies);
    changed = true;
  }

  const oldUseCookies = '    const [, , removeCookie] = useCookies(["lastChurchId"]);';
  const newUseCookies = `    // ${oldUseCookies.trim()}`;
  if (s.includes(oldUseCookies)) {
    s = s.replace(oldUseCookies, newUseCookies);
    changed = true;
  }

  const oldHandleSwitch = `    const handleSwitchChurch = () => {
        removeCookie("lastChurchId", { path: "/" });
        setTabIndex(2);
    };`;
  const newHandleSwitch = `    // const handleSwitchChurch = () => {
    //     removeCookie("lastChurchId", { path: "/" });
    //     setTabIndex(2);
    // };`;
  if (s.includes(oldHandleSwitch)) {
    s = s.replace(oldHandleSwitch, newHandleSwitch);
    changed = true;
  }

  const oldSwitchBlock = `        result.push(_jsx(NavItem, { url: logoutUrl, label: getLabel("wrapper.logout", "Logout"), icon: "logout", onNavigate: props.onNavigate }, "/logout"));
        result.push(_jsx("div", { style: { borderTop: "1px solid #CCC", paddingTop: 2, paddingBottom: 2 } }, "divider"));
        result.push(_jsx(NavItem, { label: getLabel("wrapper.switchApp", "Switch App"), icon: "apps", onClick: () => { setTabIndex(1); } }, "Switch App"));
        result.push(_jsx(NavItem, { label: getLabel("wrapper.switchChurch", "Switch Church"), icon: "church", onClick: handleSwitchChurch }, "Switch Church"));`;
  const newSwitchBlock = `        result.push(_jsx(NavItem, { url: logoutUrl, label: getLabel("wrapper.logout", "Logout"), icon: "logout", onNavigate: props.onNavigate }, "/logout"));
        // ${userMenuMarker} / single app — hide switchers for now
        // result.push(_jsx("div", { style: { borderTop: "1px solid #CCC", paddingTop: 2, paddingBottom: 2 } }, "divider"));
        // result.push(_jsx(NavItem, { label: getLabel("wrapper.switchApp", "Switch App"), icon: "apps", onClick: () => { setTabIndex(1); } }, "Switch App"));
        // result.push(_jsx(NavItem, { label: getLabel("wrapper.switchChurch", "Switch Church"), icon: "church", onClick: handleSwitchChurch }, "Switch Church"));`;
  if (s.includes(oldSwitchBlock)) {
    s = s.replace(oldSwitchBlock, newSwitchBlock);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(userMenuPath, s, "utf8");
    console.log("patch-apphelper-login: hid Switch App / Switch Church in UserMenu");
  }
  return changed;
}

function clearViteDepsCache() {
  const viteCacheDir = path.join(__dirname, "..", "node_modules", ".vite");
  if (fs.existsSync(viteCacheDir)) {
    fs.rmSync(viteCacheDir, { recursive: true, force: true });
    console.log(
      "patch-apphelper-login: removed node_modules/.vite so the dev server does not use stale pre-bundled apphelper packages."
    );
  }
}

function main() {
  patchSelectChurchRegister();
  patchUserMenu();
  if (!fs.existsSync(loginPagePath)) {
    console.warn("patch-apphelper-login: LoginPage.js not found, skip");
    process.exit(0);
  }
  let s = fs.readFileSync(loginPagePath, "utf8");
  let changed = false;

  if (!s.includes(markerPayload) && s.includes(oldLoginStart)) {
    s = s.replace(oldLoginStart, newLoginStart);
    changed = true;
  }

  if (!s.includes(markerFailure)) {
    if (!s.includes(oldCatchInner)) {
      console.warn("patch-apphelper-login: expected login catch inner block not found; skip failure messages patch.");
    } else {
      const anchor = `    };
    const login = async (data) => {`;
      if (!s.includes(anchor)) {
        console.warn("patch-apphelper-login: anchor not found; skip failure messages patch.");
      } else {
        s = s.replace(anchor, `    };
${insertion}    const login = async (data) => {`);
        s = s.replace(oldCatchInner, newCatchInner);
        changed = true;
      }
    }
  } else if (!s.includes(markerJwtElse) && s.includes(oldCatchInnerPatchedNoJwtElse)) {
    s = s.replace(oldCatchInnerPatchedNoJwtElse, newCatchInnerPatchedNoJwtElse);
    changed = true;
  }

  if (!s.includes(markerSuccessClear) && s.includes(oldHandleLoginSuccessHead)) {
    s = s.replace(oldHandleLoginSuccessHead, newHandleLoginSuccessHead);
    changed = true;
  }

  const legacyFailureReturns = `        if (firstError === "SUBSCRIPTION_INACTIVE")
            return "Your subscription is not active. Renew your plan from your church's billing settings, or contact support.";
        if (firstError === "TRIAL_EXPIRED")
            return "Your trial has ended. Subscribe to continue, or contact support.";`;
  const upgradedFailureReturns = `        const appLabel = (props.appName || "").trim().toLowerCase();
        const isGnwAdmin = appLabel === "gnw admin" || appLabel === "machon haruach admin" || appLabel.includes("admin");
        if (firstError === "SUBSCRIPTION_INACTIVE") {
            if (isGnwAdmin)
                return "Membership still has this account marked inactive (mobile subscription rules). A technical administrator should deploy the latest Membership API with the GNW Admin exemption, run npm install in B1Admin so appName is sent, or update the user record.";
            return "Your subscription is not active. Renew your plan from your church's billing settings, or contact support.";
        }
        if (firstError === "TRIAL_EXPIRED") {
            if (isGnwAdmin)
                return "Membership reports this trial has ended (mobile rules). A technical administrator can update the user record or confirm the GNW Admin exemption is deployed.";
            return "Your trial has ended. Subscribe to continue, or contact support.";
        }`;
  if (s.includes(markerFailure) && s.includes(legacyFailureReturns)) {
    s = s.replace(legacyFailureReturns, upgradedFailureReturns);
    changed = true;
  }

  const oldExistsInvalid = `            if (resp.exists) {
                setErrors([Locale.label("login.validate.invalid")]);
            }`;
  const newExistsInvalid = `            if (resp.exists) {
                setErrors([
                    Locale.label("login.validate.invalid"),
                    "This email is registered on the membership server. The password may be wrong, or the account may need a password reset on your self-hosted database (not ChurchApps cloud)."
                ]);
            }`;
  if (!s.includes(markerLoginExistsHint) && s.includes(oldExistsInvalid)) {
    s = s.replace(oldExistsInvalid, newExistsInvalid);
    changed = true;
  }

  const oldCheckEmailCatch = `        catch {
            setErrors([Locale.label("login.validate.invalid")]);
        }`;
  const newCheckEmailCatch = `        catch (e) {
            const msg = (e && e.message) ? String(e.message) : "";
            if (/502|503|504|Internal server error|NetworkError|Failed to fetch/i.test(msg))
                setErrors(["Cannot reach the membership API. Confirm REACT_APP_MEMBERSHIP_API in Admin .env and that the staging API is running."]);
            else
                setErrors([Locale.label("login.validate.invalid")]);
        }`;
  if (!s.includes("Cannot reach the membership API") && s.includes(oldCheckEmailCatch)) {
    s = s.replace(oldCheckEmailCatch, newCheckEmailCatch);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(loginPagePath, s, "utf8");
    console.log("patch-apphelper-login: applied");
  }

  clearViteDepsCache();
}

main();
