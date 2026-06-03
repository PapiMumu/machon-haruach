"use client";

import * as React from "react";
import { ErrorMessages, FloatingSupport, Loading } from "..";
import { LoginResponseInterface, UserContextInterface, ChurchInterface, UserInterface, LoginUserChurchInterface, PersonInterface, CheckEmailResponseInterface } from "@machonharuach/helpers";
import { ApiHelper, ArrayHelper, UserHelper, CommonEnvironmentHelper } from "@machonharuach/helpers";
import { AnalyticsHelper, Locale } from "./helpers";
import { useCookies, CookiesProvider } from "react-cookie";
import { Register } from "./components/Register";
import { SelectChurchModal } from "./components/SelectChurchModal";
import { Forgot } from "./components/Forgot";
import { Alert, PaperProps } from "@mui/material";
import { Login } from "./components/Login";
import { LoginSetPassword } from "./components/LoginSetPassword";
import ga4 from "react-ga4";

interface Props {
	context: UserContextInterface,
	jwt: string,
	auth: string,
	keyName?: string,
	logo?: string,
	appName?: string,
	appUrl?: string,
	returnUrl?: string,
	userRegisteredCallback?: (user: UserInterface) => Promise<void>;
	churchRegisteredCallback?: (church: ChurchInterface) => Promise<void>;
	callbackErrors?: string[];
	showLogo?: boolean;
	showFooter?: boolean;
	showSupport?: boolean;
	loginContainerCssProps?: PaperProps;
	defaultEmail?: string;
	defaultPassword?: string;
	containerStyle?: React.CSSProperties;
	floatingLabels?: boolean;
	/** When set, auto-select this church after login instead of showing the picker modal. */
	defaultChurchId?: string;
	/** Restrict the session to a single church (used with defaultChurchId). */
	lockToSingleChurch?: boolean;
	handleRedirect?: (url: string, user?: UserInterface, person?: PersonInterface, userChurch?: LoginUserChurchInterface, userChurches?: LoginUserChurchInterface[]) => void; // Function to handle redirects from parent component
}

const COOKIE_MAX_AGE = 180 * 24 * 60 * 60; // 180 days in seconds (matches user JWT expiry)

const normalizeChurchText = (s: string) => (s || "").toLowerCase().trim();

/** Resolve Spirit Embassy / default church without showing the picker when possible. */
function resolveAutoChurchId(
  userChurches: LoginUserChurchInterface[],
  defaultChurchId?: string
): string | null {
  const preferredId = (defaultChurchId || "").trim();
  if (preferredId) return preferredId;

  if (!userChurches?.length) return null;

  const byName = userChurches.find((uc) => normalizeChurchText(uc?.church?.name).includes("spirit embassy"));
  if (byName?.church?.id) return byName.church.id;

  const bySubdomain = userChurches.find((uc) => normalizeChurchText(uc?.church?.subDomain).includes("spirit"));
  if (bySubdomain?.church?.id) return bySubdomain.church.id;

  if (userChurches.length === 1) return userChurches[0].church.id;
  return null;
}

const LoginPageContent: React.FC<Props> = ({ showLogo = true, loginContainerCssProps, ...props }) => {
  const [welcomeBackName, setWelcomeBackName] = React.useState("");
  const [pendingAutoLogin, setPendingAutoLogin] = React.useState(false);
  const [errors, setErrors] = React.useState([]);
  const [cookies, setCookie] = useCookies(["jwt", "name", "email", "lastChurchId"]);
  const [showForgot, setShowForgot] = React.useState(false);
  const [showRegister, setShowRegister] = React.useState(false);
  const [showSelectModal, setShowSelectModal] = React.useState(false);
  const [loginResponse, setLoginResponse] = React.useState<LoginResponseInterface>(null);
  const [userJwt, setUserJwt] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [registrationData, setRegistrationData] = React.useState<{
    email: string; firstName?: string; lastName?: string;
    churchId?: string; churchName?: string;
  } | null>(null);
  const [verifiedAuth, setVerifiedAuth] = React.useState<string>("");
  const [verifiedEmail, setVerifiedEmail] = React.useState<string>("");

  const loginFormRef = React.useRef(null);
  const location = typeof window !== "undefined" && window.location;
  let selectedChurchId = "";
  let registeredChurch: ChurchInterface = null;
  let userJwtBackup = ""; //use state copy for storing between page updates.  This copy for instant availability.

  const cleanAppUrl = () => {
    if (!props.appUrl) return null;
    else {
      const index = props.appUrl.indexOf("/", 9);
      if (index === -1) return props.appUrl;
      else return props.appUrl.substring(0, index);
    }
  };

  React.useEffect(() => {
    if (props.callbackErrors?.length > 0) {
      setErrors(props.callbackErrors);
    }
  }, [props.callbackErrors]);

  const performLogout = () => {
    // Clear all authentication cookies
    setCookie("jwt", "", { path: "/", maxAge: 0 });
    setCookie("name", "", { path: "/", maxAge: 0 });
    setCookie("email", "", { path: "/", maxAge: 0 });
    setCookie("lastChurchId", "", { path: "/", maxAge: 0 });
    // Clear any JWT in the ApiHelper
    ApiHelper.clearPermissions();
    // Clear user context
    props.context.setUser(null);
    props.context.setUserChurches([]);
    props.context.setUserChurch(null);
    props.context.setPerson(null);
    // Show a logout success message
    setErrors(["You have been successfully logged out."]);

    // Handle redirect after logout
    const search = new URLSearchParams(location?.search);
    const returnUrl = search.get("returnUrl") || props.returnUrl || "/";

    // Use handleRedirect if available, otherwise use window.location
    if (props.handleRedirect) {
      props.handleRedirect(returnUrl);
    } else if (typeof window !== "undefined") {
      window.location.href = returnUrl;
    }
  };

  const init = () => {
    const search = new URLSearchParams(location?.search);
    const action = search.get("action");
    if (action === "logout") performLogout();
    else if (action === "forgot") setShowForgot(true);
    else if (action === "register") setShowRegister(true);
    else {
      if (!props.auth && props.jwt) {
        setWelcomeBackName(cookies.name);
        login({ jwt: props.jwt });
        setPendingAutoLogin(true);
      } else {
        setPendingAutoLogin(false);
      }
    }
  };

  const handleLoginSuccess = async (resp: LoginResponseInterface) => {
    setPendingAutoLogin(false);
    setWelcomeBackName("");
    userJwtBackup = resp.user.jwt;
    setUserJwt(userJwtBackup);
    ApiHelper.setDefaultPermissions(resp.user.jwt);
    setLoginResponse(resp);
    (resp.userChurches || []).forEach(uc => { if (!uc.apis) uc.apis = []; });
    UserHelper.userChurches = resp.userChurches || [];

    setCookie("name", `${resp.user.firstName} ${resp.user.lastName}`, { path: "/", maxAge: COOKIE_MAX_AGE });
    setCookie("email", resp.user.email, { path: "/", maxAge: COOKIE_MAX_AGE });
    UserHelper.user = resp.user;

    // JWT church selection is handled by the server response, no client-side decoding needed

    const search = new URLSearchParams(location?.search);
    const churchIdInParams = search.get("churchId");

    const autoChurchId = resolveAutoChurchId(resp.userChurches || [], props.defaultChurchId);

    if (props.keyName) selectChurchByKeyName();
    else if (churchIdInParams) selectChurch(churchIdInParams);
    else if (autoChurchId) {
      if (props.lockToSingleChurch) {
        const chosen =
          ArrayHelper.getOne(resp.userChurches, "church.id", autoChurchId) || resp.userChurches?.[0];
        if (chosen) {
          UserHelper.userChurches = [chosen];
          setLoginResponse({ ...resp, userChurches: [chosen] });
        }
      }
      if (ArrayHelper.getOne(resp.userChurches, "church.id", autoChurchId)) {
        selectedChurchId = autoChurchId;
        selectChurchById();
      } else {
        selectChurch(autoChurchId);
      }
    } else if (cookies.lastChurchId && ArrayHelper.getOne(resp.userChurches, "church.id", cookies.lastChurchId)) {
      selectedChurchId = cookies.lastChurchId;
      selectChurchById();
    } else setShowSelectModal(true);
  };

  const selectChurchById = async () => {
    await UserHelper.selectChurch(props.context, selectedChurchId, undefined);

    setCookie("lastChurchId", selectedChurchId, { path: "/", maxAge: COOKIE_MAX_AGE });

    if (registeredChurch) {
      AnalyticsHelper.logEvent("Church", "Register", UserHelper.currentUserChurch.church.name);
      try {
        if (CommonEnvironmentHelper.GoogleAnalyticsTag && typeof (window) !== "undefined") {
          ga4.gtag("event", "conversion", { send_to: "AW-427967381/Ba2qCLrXgJoYEJWHicwB" });
        }
      } catch { }
    } else AnalyticsHelper.logEvent("Church", "Select", UserHelper.currentUserChurch.church.name);

    if (props.churchRegisteredCallback && registeredChurch) {
      await props.churchRegisteredCallback(registeredChurch);
      registeredChurch = null;
      login({ jwt: userJwt || userJwtBackup });
    } else await continueLoginProcess();
  };

  const selectChurchByKeyName = async () => {
    if (!ArrayHelper.getOne(UserHelper.userChurches, "church.subDomain", props.keyName)) {
      const userChurch: LoginUserChurchInterface = await ApiHelper.post("/churches/select", { subDomain: props.keyName }, "MembershipApi");
      UserHelper.setupApiHelper(userChurch);
      setCookie("lastChurchId", userChurch.church.id, { path: "/", maxAge: COOKIE_MAX_AGE });
      //create/claim the person record and relogin
      await ApiHelper.get("/people/claim/" + userChurch.church.id, "MembershipApi");
      login({ jwt: userJwt || userJwtBackup });
      return;
    }
    await UserHelper.selectChurch(props.context, undefined, props.keyName);
    const selectedChurch = ArrayHelper.getOne(UserHelper.userChurches, "church.subDomain", props.keyName);
    if (selectedChurch) setCookie("lastChurchId", selectedChurch.church.id, { path: "/", maxAge: COOKIE_MAX_AGE });
    await continueLoginProcess();
    return;
  };

  async function continueLoginProcess() {
    if (UserHelper.currentUserChurch) {
      // Store the user JWT (180-day) for session persistence, not the API JWT (2-day)
      setCookie("jwt", userJwt || userJwtBackup, { path: "/", maxAge: COOKIE_MAX_AGE });
      try {
        if (UserHelper.currentUserChurch.church.id) ApiHelper.patch(`/userChurch/${UserHelper.user.id}`, { churchId: UserHelper.currentUserChurch.church.id, appName: props.appName, lastAccessed: new Date() }, "MembershipApi");
      } catch (e) {
        console.log("Could not update user church accessed date");
      }
    }

    props.context.setUser(UserHelper.user);
    props.context.setUserChurches(UserHelper.userChurches);
    props.context.setUserChurch(UserHelper.currentUserChurch);

    // Get or claim person before proceeding
    let person;
    try {
      person = await ApiHelper.get(`/people/${UserHelper.currentUserChurch.person?.id}`, "MembershipApi");
      if (person) props.context.setPerson(person);
    } catch {
      person = await ApiHelper.get("/people/claim/" + UserHelper.currentUserChurch.church.id, "MembershipApi");
      props.context.setPerson(person);
    }

    // Handle redirect with actual data
    const search = new URLSearchParams(location?.search);
    const returnUrl = search.get("returnUrl") || props.returnUrl || "/";
    if (returnUrl && typeof window !== "undefined") {
      // Use handleRedirect function if available, otherwise fallback to window.location
      if (props.handleRedirect) {
        props.handleRedirect(returnUrl, UserHelper.user, person, UserHelper.currentUserChurch, UserHelper.userChurches);
      } else {
        window.location.href = returnUrl;
      }
    }
  }

  async function selectChurch(churchId: string) {
    try {
      setErrors([]);
      selectedChurchId = churchId;
      setCookie("lastChurchId", churchId, { path: "/", maxAge: COOKIE_MAX_AGE });
      if (!ArrayHelper.getOne(UserHelper.userChurches, "church.id", churchId)) {
        const userChurch: LoginUserChurchInterface = await ApiHelper.post("/churches/select", { churchId: churchId }, "MembershipApi");
        UserHelper.setupApiHelper(userChurch);

        //create/claim the person record and relogin
        await ApiHelper.get("/people/claim/" + churchId, "MembershipApi");
        login({ jwt: userJwt || userJwtBackup });
        return;
      }
      UserHelper.selectChurch(props.context, churchId, null).then(() => { continueLoginProcess(); });
    } catch (err) {
      console.log("Error in selecting church: ", err);
      setErrors([Locale.label("login.validate.selectingChurch")]);
      loginFormRef?.current?.setSubmitting(false);
    }

  }

  const getLoginFailureUserMessage = (e: unknown): string | null => {
    const raw = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "";
    let firstError = "";
    try {
      const j = JSON.parse(raw) as { errors?: string[] };
      if (j?.errors?.length) firstError = String(j.errors[0]);
    } catch { /* not JSON */ }
    if (!firstError) {
      if (raw.includes("SUBSCRIPTION_INACTIVE")) firstError = "SUBSCRIPTION_INACTIVE";
      else if (raw.includes("TRIAL_EXPIRED")) firstError = "TRIAL_EXPIRED";
      else if (raw.includes("No permissions")) firstError = "No permissions";
    }
    const appLabel = (props.appName || "").trim().toLowerCase();
    const isAdminApp =
      appLabel === "gnw admin" ||
      appLabel === "machon haruach admin" ||
      appLabel.includes("admin");
    if (firstError === "SUBSCRIPTION_INACTIVE") {
      if (isAdminApp) {
        return "Membership still has this account marked inactive (mobile subscription rules). A technical administrator should deploy the latest Membership API with the admin app exemption, run npm install in Admin so appName is sent on login, or update the user record.";
      }
      return "Your subscription is not active. Renew your plan from your church's billing settings, or contact support.";
    }
    if (firstError === "TRIAL_EXPIRED") {
      if (isAdminApp) {
        return "Membership reports this trial has ended (mobile rules). A technical administrator can update the user record or confirm the admin app exemption is deployed.";
      }
      return "Your trial has ended. Subscribe to continue, or contact support.";
    }
    if (firstError === "No permissions") {
      return "This account does not have permission to use this app. Ask a church administrator to assign you an admin role.";
    }
    return null;
  };

  const handleLoginErrors = async (errors: string[], loginEmail?: string) => {
    setWelcomeBackName("");

    if (!loginEmail) {
      setErrors([Locale.label("login.validate.invalid")]);
      return;
    }

    try {
      const resp: CheckEmailResponseInterface = await ApiHelper.postAnonymous("/users/checkEmail", { email: loginEmail }, "MembershipApi");

      if (resp.exists) {
        setErrors([
          Locale.label("login.validate.invalid"),
          "This email is registered on the membership server. The password may be wrong, or the account may need a password reset on your self-hosted database (not ChurchApps cloud)."
        ]);
      } else {
        const regData: { email: string; firstName?: string; lastName?: string; churchId?: string; churchName?: string } = { email: loginEmail };
        if (resp.peopleMatches.length === 1) {
          const match = resp.peopleMatches[0];
          regData.firstName = match.firstName;
          regData.lastName = match.lastName;
          regData.churchId = match.churchId;
          regData.churchName = match.churchName;
        } else if (resp.peopleMatches.length > 1) {
          const match = resp.peopleMatches[0];
          regData.firstName = match.firstName;
          regData.lastName = match.lastName;
        }
        setRegistrationData(regData);
        setShowRegister(true);
        setErrors([Locale.label("login.noAccountFound")]);
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "";
      if (/502|503|504|Internal server error|NetworkError|Failed to fetch/i.test(msg)) {
        setErrors(["Cannot reach the membership API. Confirm REACT_APP_MEMBERSHIP_API in Admin .env and that the staging API is running."]);
      } else {
        setErrors([Locale.label("login.validate.invalid")]);
      }
    }
  };

  const login = async (data: any) => {
    setErrors([]);
    setIsSubmitting(true);
    const loginPayload = { ...data };
    if (props.appName) loginPayload.appName = props.appName;
    try {
      const resp: LoginResponseInterface = await ApiHelper.postAnonymous("/users/login", loginPayload, "MembershipApi");
      setIsSubmitting(false);
      handleLoginSuccess(resp);
    } catch (e: unknown) {
      setPendingAutoLogin(false);
      setWelcomeBackName("");
      const directMsg = getLoginFailureUserMessage(e);
      if (!data.jwt) {
        if (directMsg) setErrors([directMsg]);
        else handleLoginErrors([String(e)], data.email);
      } else if (directMsg) {
        setErrors([directMsg]);
      } else {
        setErrors(["Your session could not be restored. Please sign in again."]);
      }
      setIsSubmitting(false);
    }
  };

  const getWelcomeBack = () => {
    if (welcomeBackName !== "") {
      const label = Locale.label("login.welcomeName") || "Welcome back, <b>{}</b>!";
      const parts = label.split("{}");
      const before = parts[0].replace(/<b>/g, "").replace(/<\/b>/g, "");
      const after = (parts[1] || "").replace(/<b>/g, "").replace(/<\/b>/g, "");
      return (
				<>
					<Alert severity="info">
						{before}<b>{welcomeBackName}</b>{after}
					</Alert>
					<Loading />
				</>
      );
    }
  };
  const getCheckEmail = () => { if (new URLSearchParams(location?.search).get("checkEmail") === "1") return <Alert severity="info">{Locale.label("login.registerThankYou")}</Alert>; };
  const handleRegisterCallback = () => { setShowForgot(false); setShowRegister(true); };
  const handleLoginCallback = () => { setShowForgot(false); setShowRegister(false); setRegistrationData(null); setVerifiedAuth(""); };
  const handleChurchRegistered = (church: ChurchInterface) => { registeredChurch = church; setShowRegister(false); };
  const handleCodeVerified = (authGuid: string, email?: string) => { setVerifiedAuth(authGuid); if (email) setVerifiedEmail(email); setShowForgot(false); setShowRegister(false); };

  const getInputBox = () => {
    if (verifiedAuth) return (<LoginSetPassword setErrors={setErrors} setShowForgot={setShowForgot} isSubmitting={isSubmitting} auth={verifiedAuth} email={verifiedEmail} login={login} appName={props.appName} appUrl={cleanAppUrl()} />);
    if (showRegister) {
      return (

			<Register updateErrors={setErrors} appName={props.appName} appUrl={cleanAppUrl()} loginCallback={handleLoginCallback} userRegisteredCallback={props.userRegisteredCallback} onVerified={handleCodeVerified} defaultEmail={registrationData?.email} defaultFirstName={registrationData?.firstName} defaultLastName={registrationData?.lastName} defaultChurchId={registrationData?.churchId} defaultChurchName={registrationData?.churchName} />

      );
    } else if (showForgot) return (<Forgot registerCallback={handleRegisterCallback} loginCallback={handleLoginCallback} onVerified={handleCodeVerified} />);
    else if (props.auth) return (<LoginSetPassword setErrors={setErrors} setShowForgot={setShowForgot} isSubmitting={isSubmitting} auth={props.auth} login={login} appName={props.appName} appUrl={cleanAppUrl()} />);
    else return <Login setShowRegister={setShowRegister} setShowForgot={setShowForgot} setErrors={setErrors} isSubmitting={isSubmitting} login={login} mainContainerCssProps={loginContainerCssProps} defaultEmail={props.defaultEmail} defaultPassword={props.defaultPassword} showFooter={props.showFooter} floatingLabels={props.floatingLabels} onRegisterClick={(email) => { setRegistrationData({ email }); }} />;
  };

	React.useEffect(init, []); //eslint-disable-line

  const defaultContainerStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    position: "relative",
  };

  return (
		<div style={{ ...defaultContainerStyle, ...props.containerStyle }}>
			<ErrorMessages errors={errors} />
			{getWelcomeBack()}
			{getCheckEmail()}
			{!pendingAutoLogin && getInputBox()}
			{!props.defaultChurchId && (
				<SelectChurchModal show={showSelectModal} userChurches={loginResponse?.userChurches} selectChurch={selectChurch} registeredChurchCallback={handleChurchRegistered} errors={errors} appName={props.appName} handleRedirect={props.handleRedirect} />
			)}
			{props.showSupport !== false && <FloatingSupport appName={props.appName} />}
		</div>
  );

};

export const LoginPage: React.FC<Props> = (props) => {
  // Always wrap with CookiesProvider to ensure context is available
  return (
		<CookiesProvider defaultSetOptions={{ path: "/" }}>
			<LoginPageContent {...props} />
		</CookiesProvider>
  );
};
