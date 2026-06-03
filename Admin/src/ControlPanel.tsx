import React from "react";
import UserContext from "./UserContext";

import { ApiHelper, ErrorMessages } from "@machonharuach/apphelper";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Login } from "./Login";
import { OAuthCallback } from "./oauth/OAuthCallback";

import { Authenticated } from "./Authenticated";
import { Logout } from "./Logout";
import { SessionGate } from "./SessionGate";
import { PendingRoleAccess } from "./components/PendingRoleAccess";
import { userHasAssignedAdminRole } from "./helpers/adminRoleAccess";
import { type ErrorLogInterface, type ErrrorAppDataInterface } from "@machonharuach/helpers";
import { AnalyticsHelper } from "./helpers";
import { UserHelper, ErrorHelper } from "@machonharuach/apphelper";
import { Pingback } from "./Pingback";

export const ControlPanel = () => {
  const [errors] = React.useState([]);

  const location = typeof window === "undefined" ? null : window.location;
  AnalyticsHelper.init();
  React.useEffect(() => {
    AnalyticsHelper.logPageView();
  }, [location]);

  const getErrorAppData = () => {
    const result: ErrrorAppDataInterface = {
      churchId: UserHelper.currentUserChurch?.church?.id || "",
      userId: UserHelper.user?.id || "",
      originUrl: location?.toString(),
      application: "Admin"
    };
    return result;
  };

  const customErrorHandler = (error: ErrorLogInterface) => {
    //disabled for now.  This causes infinite loops when the error happens on useEffect page loads.

    /*
    switch (error.errorType) {
      case "401": setErrors(["Access denied when loading " + error.message]); break;
      case "500": setErrors(["Server error when loading " + error.message]); break;
    }*/
  };

  ErrorHelper.init(getErrorAppData, customErrorHandler);

  const user = React.useContext(UserContext).user; //to force rerender on login
  return (
    <>
      <ErrorMessages errors={errors} />
      <Routes>
        <Route path="/pingback" element={<Pingback />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route
          path="/*"
          element={
            <SessionGate>
              <RequireAuth>
                <RequireAssignedRole>
                  <Authenticated />
                </RequireAssignedRole>
              </RequireAuth>
            </SessionGate>
          }
        />
      </Routes>
    </>
  );
};

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();
  if (!ApiHelper.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

/** Block admin UI until an administrator assigns the user to a role with permissions. */
const RequireAssignedRole = ({ children }: { children: JSX.Element }) => {
  const context = React.useContext(UserContext);
  if (!userHasAssignedAdminRole(context?.userChurch)) {
    return <PendingRoleAccess />;
  }
  return children;
};
