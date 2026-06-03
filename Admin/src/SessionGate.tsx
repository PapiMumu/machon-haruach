import React from "react";
import { useCookies } from "react-cookie";
import { Box, CircularProgress, Typography } from "@mui/material";
import { ApiHelper } from "@machonharuach/helpers";
import UserContext from "./UserContext";
import { restoreSessionFromJwt } from "./helpers/sessionRestore";

interface Props {
  children: React.ReactNode;
}

/**
 * On full page reload, rehydrate session from the jwt cookie before auth routing runs.
 * Avoids flashing the Sign In page when the user is still logged in.
 */
export const SessionGate: React.FC<Props> = ({ children }) => {
  const context = React.useContext(UserContext);
  const [cookies, , removeCookie] = useCookies(["jwt", "lastChurchId"]);
  const [ready, setReady] = React.useState(
    () => (ApiHelper.isAuthenticated && !!context?.user) || !cookies.jwt
  );

  React.useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (!cancelled) setReady(true);
    };

    if (ApiHelper.isAuthenticated && context?.user) {
      finish();
      return;
    }

    const jwt = cookies.jwt;
    if (!jwt) {
      finish();
      return;
    }

    (async () => {
      if (!context) {
        finish();
        return;
      }
      const ok = await restoreSessionFromJwt(jwt, cookies.lastChurchId, context);
      if (!ok) {
        removeCookie("jwt", { path: "/" });
        ApiHelper.clearPermissions();
      }
      finish();
    })();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  if (!ready) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" flexDirection="column" gap={2}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};
