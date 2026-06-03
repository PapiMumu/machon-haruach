import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { UserHelper, Permissions, ApiHelper } from "@machonharuach/apphelper";
import UserContext from "./UserContext";
import { LoginPage } from "@machonharuach/apphelper-login";
import { LoginHeroPanel } from "./components/LoginHeroPanel";

export const Login: React.FC = () => {
  const [errors] = React.useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const context = React.useContext(UserContext);
  const [cookies, , removeCookie] = useCookies(["jwt"]);

  const search = new URLSearchParams(window.location.search);
  const forceLogin = search.get("forceLogin") === "1";
  const forceLoginCleared = React.useRef(false);

  React.useEffect(() => {
    if (forceLogin && !forceLoginCleared.current) {
      forceLoginCleared.current = true;
      removeCookie("jwt", { path: "/" });
      if (context) {
        context.setUser(null);
        context.setUserChurch(null);
        context.setUserChurches(null);
      }
    }
  }, [forceLogin, context, removeCookie]);

  const defaultRedirect = UserHelper.checkAccess(Permissions.membershipApi.people.view) ? "/people" : "/";
  const fromLocation = location.state?.from;
  const fromUrl = fromLocation ? (fromLocation.pathname + (fromLocation.search || "")) : null;
  const returnUrl = search.get("returnUrl") || fromUrl || defaultRedirect;

  const handleRedirect = (url: string) => {
    navigate(url);
  };

  React.useEffect(() => {
    if (!forceLogin && ApiHelper.isAuthenticated && context?.user) {
      navigate(returnUrl, { replace: true });
    }
  }, [forceLogin, context?.user, returnUrl, navigate]);

  let jwt = forceLogin ? "" : (search.get("jwt") || cookies.jwt);
  let auth = search.get("auth");
  if (!jwt) jwt = "";
  if (!auth) auth = "";

  return (
    <div className="splash-login-page">
      <style>{`
        /* Goodnews World splash layout (#splash) */
        .splash-login-page .MuiFab-root[aria-label="Support"] {
          display: none !important;
        }
        .splash-login-page {
          font-family: var(--font-family-sans);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
          background-color: #1a1a1a;
          background-image: url("/images/harare-hippodrome.jpg");
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          padding: 16px;
          box-sizing: border-box;
        }
        .splash-login-content {
          position: relative;
          display: grid;
          grid-template-columns: 10fr 8fr;
          align-items: center;
          background-color: #000000;
          padding: 24px;
          border-radius: 16px;
          gap: 32px;
          width: 100%;
          max-width: 1000px;
          max-height: calc(100vh - 32px);
          min-height: 0;
          box-sizing: border-box;
          overflow: hidden;
        }
        .splash-login-form-panel {
          position: relative;
          margin: 12px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          grid-column: 2 / 3;
          grid-row: 1 / 2;
          border-left: 4px solid var(--c1, #2f3465);
          padding-left: 24px;
          min-width: 0;
        }
        .splash-login-form-panel > div {
          width: 100%;
        }
        @media (max-width: 992px) {
          .splash-login-page {
            align-items: center;
            padding: 12px;
            overflow-y: auto;
          }
          .splash-login-content {
            margin: 0;
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
            gap: 0;
            min-width: 380px;
            width: 90vw;
            max-width: 90vw;
            padding: 0;
            min-height: auto;
          }
          .splash-login-form-panel {
            display: block;
            grid-column: 1 / 2;
            grid-row: 2 / 3;
            width: 100%;
            border-left: none;
            border-top: 4px solid var(--c1, #2f3465);
            padding: 32px 24px 24px;
            margin: 0;
          }
        }

        .splash-login-page #login-logo {
          display: none !important;
        }
        .splash-login-page #login-card,
        .splash-login-page .MuiCard-root:has(#firstName),
        .splash-login-page .MuiCard-root:has(#new-password),
        .splash-login-page .MuiCard-root:has(#forgot-email),
        .splash-login-page .MuiCard-root:has(button[type="button"]):not(:has(form)) {
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          background: transparent !important;
          max-width: 100% !important;
        }
        .splash-login-page #login-content,
        .splash-login-page .MuiCard-root:has(#firstName) .MuiCardContent-root,
        .splash-login-page .MuiCard-root:has(#new-password) .MuiCardContent-root,
        .splash-login-page .MuiCard-root:has(#forgot-email) .MuiCardContent-root,
        .splash-login-page .MuiCard-root:has(button[type="button"]):not(:has(form)) .MuiCardContent-root {
          padding: 8px 0 !important;
        }
        .splash-login-page #login-title {
          color: transparent !important;
          position: relative;
          letter-spacing: -0.01em;
          margin-bottom: 4px !important;
          min-height: 28px;
        }
        .splash-login-page #login-title + p.MuiTypography-root {
          margin-bottom: 14px !important;
          min-height: 36px;
          line-height: 1.35;
        }
        .splash-login-page #login-form {
          gap: 12px !important;
        }
        .splash-login-page #login-form > div {
          gap: 6px !important;
        }
        /* Dark outlined fields — matches Admin #app-main-content (e.g. Edit Video) */
        .splash-login-page .MuiFormControl-root {
          margin-top: 8px !important;
          margin-bottom: 4px !important;
        }
        .splash-login-page .MuiOutlinedInput-root {
          background-color: #181d26 !important;
          border-radius: 10px !important;
          min-height: 48px;
          transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .splash-login-page .MuiOutlinedInput-root fieldset {
          border-color: rgba(148, 163, 184, 0.34) !important;
        }
        .splash-login-page .MuiOutlinedInput-root:hover fieldset {
          border-color: rgba(203, 213, 225, 0.44) !important;
        }
        .splash-login-page .MuiOutlinedInput-root.Mui-focused fieldset {
          border-color: rgba(229, 231, 235, 0.45) !important;
          border-width: 1px !important;
        }
        .splash-login-page .MuiOutlinedInput-root.Mui-focused {
          box-shadow: 0 0 0 4px rgba(47, 52, 101, 0.14);
        }
        .splash-login-page .MuiOutlinedInput-input,
        .splash-login-page .MuiOutlinedInput-root input {
          color: #f5f7fa !important;
          font-size: var(--font-size-regular, 16px) !important;
          padding: 12px 14px !important;
        }
        .splash-login-page .MuiInputLabel-root {
          color: #9ca3af !important;
          font-size: var(--font-size-regular, 16px) !important;
        }
        .splash-login-page .MuiInputLabel-asterisk {
          display: none !important;
        }
        .splash-login-page .MuiInputLabel-root.Mui-focused {
          color: #e5e7eb !important;
        }
        .splash-login-page .MuiInputLabel-root.MuiInputLabel-shrink {
          color: #c5ccd6 !important;
          font-size: var(--font-size-small, 14px) !important;
          /* Match card/panel behind the field so the label sits on the border, not on input fill */
          background-color: #000000 !important;
          padding: 0 4px !important;
        }
        .splash-login-page .MuiCard-root label {
          color: #c5ccd6 !important;
          font-size: var(--font-size-small, 14px) !important;
          font-weight: var(--font-weight-medium, 500);
        }
        .splash-login-page #login-links {
          gap: 4px !important;
          margin-top: 2px;
        }
        .splash-login-page #login-title::after {
          content: "Sign In";
          color: #ffffff;
          position: absolute;
          inset: 0;
          font-family: var(--font-family-sans);
          font-size: var(--font-size-h4, 22px);
          font-weight: var(--font-weight-semibold, 600);
          line-height: var(--line-height-tight, 1.1);
        }
        .splash-login-page #login-title + p {
          color: transparent !important;
          position: relative;
        }
        .splash-login-page #login-title + p::after {
          content: "Enter your email and password to access your account";
          color: #9ca3af;
          position: absolute;
          inset: 0;
          font-family: var(--font-family-sans);
          font-size: var(--font-size-small, 14px);
          line-height: var(--line-height-normal, 1.5);
        }
        .splash-login-page .MuiCard-root h1,
        .splash-login-page .MuiCard-root h2 {
          color: #ffffff !important;
        }
        .splash-login-page .MuiCard-root p {
          color: #9ca3af;
        }
        .splash-login-page .MuiIconButton-root[aria-label="toggle password visibility"],
        .splash-login-page #password-visibility-toggle {
          display: none !important;
        }
        .splash-login-page #login-submit-button {
          background: linear-gradient(135deg, #2f3465 0%, #4b5288 100%) !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 18px rgba(47, 52, 101, 0.3);
          min-height: 48px !important;
          height: 48px !important;
          padding: 0 16px !important;
          font-size: var(--font-size-regular, 16px) !important;
          font-weight: var(--font-weight-medium, 500) !important;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .splash-login-page .MuiCard-root button[type="submit"] {
          min-height: 48px !important;
          height: 48px !important;
          padding: 0 16px !important;
          font-size: var(--font-size-regular, 16px) !important;
          font-weight: var(--font-weight-medium, 500) !important;
        }
        .splash-login-page #login-submit-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(47, 52, 101, 0.34);
          filter: brightness(1.02);
        }
        .splash-login-page #login-submit-button:active {
          transform: translateY(0);
        }
        .splash-login-page #forgot-password-link,
        .splash-login-page #register-link {
          color: #93c5fd !important;
          transition: color 0.2s ease;
        }
        .splash-login-page #forgot-password-link:hover,
        .splash-login-page #register-link:hover {
          color: #bfdbfe !important;
        }
        .splash-login-page .MuiAlert-root {
          color: inherit;
        }
        .splash-login-page #login-links > div:last-child {
          font-size: 0 !important;
        }
        .splash-login-page #register-link {
          font-size: var(--font-size-small, 14px) !important;
        }
        .splash-login-page .MuiCard-root:has(#firstName) img[src="/images/logo-login.png"],
        .splash-login-page .MuiCard-root:has(#new-password) img[src="/images/logo-login.png"],
        .splash-login-page .MuiCard-root:has(button[type="button"]):not(:has(form)) img[src="/images/logo-login.png"],
        .splash-login-page .MuiCard-root:has(#forgot-email) img {
          display: none !important;
        }
        .splash-login-page .MuiCard-root:has(#firstName) button[type="submit"],
        .splash-login-page .MuiCard-root:has(#new-password) button[type="submit"],
        .splash-login-page .MuiCard-root:has(#forgot-email) button[type="submit"] {
          background: linear-gradient(135deg, #2f3465 0%, #4b5288 100%) !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 24px rgba(47, 52, 101, 0.3);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .splash-login-page .MuiCard-root:has(#firstName) button[type="submit"]:hover,
        .splash-login-page .MuiCard-root:has(#new-password) button[type="submit"]:hover,
        .splash-login-page .MuiCard-root:has(#forgot-email) button[type="submit"]:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(47, 52, 101, 0.34);
          filter: brightness(1.02);
        }
        .splash-login-page .MuiCard-root:has(#firstName) button[type="submit"]:active,
        .splash-login-page .MuiCard-root:has(#new-password) button[type="submit"]:active,
        .splash-login-page .MuiCard-root:has(#forgot-email) button[type="submit"]:active {
          transform: translateY(0);
        }
        .splash-login-page .MuiCard-root:has(#firstName) h1 + p {
          color: transparent !important;
          position: relative;
        }
        .splash-login-page .MuiCard-root:has(#firstName) h1 + p::after {
          content: "Create a new account to access your account";
          color: #9ca3af;
          position: absolute;
          inset: 0;
        }
        @media (max-width: 992px) {
          .splash-login-form-panel {
            padding: 28px 20px 20px;
          }
          .splash-login-page #login-content,
          .splash-login-page .MuiCard-root:has(#firstName) .MuiCardContent-root,
          .splash-login-page .MuiCard-root:has(#new-password) .MuiCardContent-root,
          .splash-login-page .MuiCard-root:has(#forgot-email) .MuiCardContent-root,
          .splash-login-page .MuiCard-root:has(button[type="button"]):not(:has(form)) .MuiCardContent-root {
            padding: 4px 0 !important;
          }
        }
      `}</style>
      <div className="splash-login-content">
        <LoginHeroPanel />
        <div className="splash-login-form-panel">
          <LoginPage
            auth={auth}
            context={context}
            jwt={jwt}
            appName="Machon HaRuach Admin"
            appUrl={window.location.href}
            callbackErrors={errors}
            returnUrl={returnUrl}
            handleRedirect={handleRedirect}
            defaultEmail={process.env.REACT_APP_STAGE === "demo" ? "demo@machonharuach.org" : undefined}
            defaultPassword={process.env.REACT_APP_STAGE === "demo" ? "password" : undefined}
            showFooter={false}
            showSupport={false}
            floatingLabels
            defaultChurchId={process.env.REACT_APP_DEFAULT_CHURCH_ID}
            lockToSingleChurch={(process.env.REACT_APP_LOCK_CHURCH_ID || "").toLowerCase() === "true"}
            containerStyle={{
              minHeight: "auto",
              backgroundColor: "transparent",
              padding: 0,
              width: "100%",
            }}
          />
        </div>
      </div>
    </div>
  );
};
