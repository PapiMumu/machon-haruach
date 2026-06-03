"use client";

import { UserProvider } from "@/context/UserContext";
import { UserHelper } from "@machonharuach/apphelper";
import type { ErrorAppDataInterface, ErrorLogInterface } from "@machonharuach/helpers";
import React, { useEffect } from "react";
import { ErrorHelper } from "@machonharuach/apphelper";
import { ErrorMessages } from "@machonharuach/apphelper";
import { EnvironmentHelper } from "@/helpers";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CookieProviderWrapper } from "@/components/CookieProviderWrapper";
import GoogleAnalytics from "@/components/GoogleAnalytics";



if (typeof window !== "undefined") EnvironmentHelper.init();

function ClientLayout({ children }: { children: React.ReactNode }) {
  const [errors, setErrors] = React.useState([]);
  const [localeInit, setLocaleInit] = React.useState(false);
  const location = (typeof (window) === "undefined") ? null : window.location;

  useEffect(() => {
    EnvironmentHelper.initLocale().then(() => setLocaleInit(true));
    // Error handling configuration
    ErrorHelper.init(getErrorAppData, customErrorHandler);
  }, []);


  const getErrorAppData = () => {
    const result: ErrorAppDataInterface = {
      churchId: UserHelper.currentUserChurch?.church?.id || "",
      userId: UserHelper.user?.id || "",
      originUrl: location?.toString(),
      application: "B1"
    };
    return result;
  };

  const customErrorHandler = (error: ErrorLogInterface) => {
    switch (error.errorType) {
      case "401": setErrors(["Access denied when loading " + error.message]); break;
      case "500": setErrors(["Server error when loading " + error.message]); break;
    }
  };


  const mdTheme = createTheme({
    palette: {
      primary: { main: "#2F3465", contrastText: "#ffffff" },
      secondary: { main: "#444444" }
    },
    components: {
      MuiTextField: {
        defaultProps: { margin: "normal" },
        styleOverrides: { root: { "& .MuiOutlinedInput-root": { backgroundColor: "rgba(255, 255, 255, 0.8)" } } }
      },
      MuiFormControl: { defaultProps: { margin: "normal" } },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 6
          }
        }
      }
    },
    typography: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' },
    shape: { borderRadius: 6 }
  });

  return (
    <CookieProviderWrapper>
      <GoogleAnalytics />
      <ThemeProvider theme={mdTheme}>
        <UserProvider>
          <ErrorMessages errors={errors} />
          <>{children}</>
        </UserProvider>
      </ThemeProvider>
    </CookieProviderWrapper>
  );
}
export default ClientLayout;
