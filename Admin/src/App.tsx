import React, { useMemo } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ControlPanel } from "./ControlPanel";
import { UserProvider } from "./UserContext";
import { ThemeContextProvider, useThemeMode } from "./ThemeContext";
import { CookiesProvider } from "react-cookie";
import { createTheme, CssBaseline, ThemeProvider, type PaletteMode } from "@mui/material";
import { goodnewsMuiTypography, INTER_FONT_STACK } from "./helpers/typography";
import "@machonharuach/apphelper-markdown/dist/components/markdownEditor/editor.css";
//TODO export the css from apphelper
import { EnvironmentHelper } from "./helpers";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";

declare module "@mui/material/styles" {
  interface Palette {
    InputBox: {
      headerText: string;
    };
  }
  interface PaletteOptions {
    InputBox?: {
      headerText?: string;
    };
  }
}

const BRAND_PRIMARY = "#E5E7EB";
const BRAND_PRIMARY_DARK = "#D1D5DB";
const DARK_BG_MAIN = "#0B0D12";
const DARK_BG_SUB = "#12151C";
const DARK_BG_CARD = "#181D26";
const DARK_BG_HEADER = "#10141B";
const DARK_BORDER = "rgba(255,255,255,0.14)";
const DARK_TEXT_PRIMARY = "#F5F7FA";
const DARK_TEXT_SECONDARY = "#C5CCD6";

const createMdTheme = (_mode: PaletteMode) =>
  createTheme({
    palette: {
      mode: "dark",
      primary: { main: BRAND_PRIMARY, dark: BRAND_PRIMARY_DARK, contrastText: "#0B0D12" },
      secondary: { main: "#D1D5DB", contrastText: "#0B0D12" },
      text: {
        primary: DARK_TEXT_PRIMARY,
        secondary: DARK_TEXT_SECONDARY,
        disabled: "rgba(245,247,250,0.55)"
      },
      divider: DARK_BORDER,
      action: {
        hover: "rgba(255,255,255,0.06)",
        selected: "rgba(255,255,255,0.12)",
        disabled: "rgba(255,255,255,0.35)",
        disabledBackground: "rgba(255,255,255,0.1)"
      },
      InputBox: { headerText: "#E5E7EB" },
      background: {
        default: DARK_BG_MAIN,
        paper: DARK_BG_SUB
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root": {
            "--bg-main": DARK_BG_MAIN,
            "--bg-sub": DARK_BG_SUB,
            "--bg-card": DARK_BG_CARD,
            "--bg-header": DARK_BG_HEADER,
            "--border-main": DARK_BORDER,
            "--text-main": DARK_TEXT_PRIMARY,
            "--text-muted": DARK_TEXT_SECONDARY,
            "--c1": BRAND_PRIMARY,
            "--c1l2": BRAND_PRIMARY_DARK,
            "--c1d3": "#AEB5C0",
            "--c1-rgb": "229, 231, 235"
          },
          body: {
            fontFamily: INTER_FONT_STACK,
            fontSize: "16px",
            lineHeight: 1.5,
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            backgroundColor: DARK_BG_MAIN,
            color: DARK_TEXT_PRIMARY
          },
          html: {
            fontSize: "14px"
          },
          "#banner": {
            backgroundColor: DARK_BG_SUB + " !important",
            borderBottom: `1px solid ${DARK_BORDER}`
          }
        }
      },
      MuiInputBase: {
        styleOverrides: {
          input: {
            fontSize: "16px",
            lineHeight: 1.5
          }
        }
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: "14px"
          }
        }
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            fontSize: "14px"
          }
        }
      },
      MuiTextField: {
        defaultProps: { margin: "normal" },
        styleOverrides: {
          root: {
            marginTop: 16,
            marginBottom: 8,
            "& .MuiOutlinedInput-root": {
              backgroundColor: DARK_BG_CARD,
              fontSize: "16px",
              "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.28)" }
            }
          }
        }
      },
      MuiFormControl: {
        defaultProps: { margin: "normal" },
        styleOverrides: {
          root: {
            marginTop: 16,
            marginBottom: 8
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: DARK_BG_SUB,
            color: DARK_TEXT_PRIMARY
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            letterSpacing: "0.01em",
            borderRadius: 10,
            minHeight: 38,
            paddingLeft: 14,
            paddingRight: 14,
            "& .MuiButton-startIcon, & .MuiButton-endIcon": {
              marginTop: 0,
              marginBottom: 0
            },
            "& .MuiSvgIcon-root": { fontSize: 18 }
          },
          containedPrimary: {
            backgroundColor: BRAND_PRIMARY,
            color: "#0B0D12",
            boxShadow: "0 8px 20px rgba(0,0,0,0.22)",
            "&:hover": { backgroundColor: "#F5F7FA" }
          },
          outlinedPrimary: {
            color: BRAND_PRIMARY,
            borderColor: "rgba(229,231,235,0.45)",
            "&:hover": {
              borderColor: BRAND_PRIMARY,
              backgroundColor: "rgba(255,255,255,0.08)"
            }
          }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: DARK_TEXT_SECONDARY,
            "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" }
          }
        }
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            color: "#F8FAFC",
            background: "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 100%)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 8px 18px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
            fontWeight: 500,
            letterSpacing: "0.02em"
          },
          img: {
            objectFit: "cover",
            filter: "contrast(1.03) saturate(1.04)"
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundImage: "none",
            backgroundColor: DARK_BG_CARD,
            border: `1px solid ${DARK_BORDER}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.45)"
          }
        }
      },
      MuiTab: {
        styleOverrides: {
          root: {
            color: DARK_TEXT_SECONDARY,
            "&.Mui-selected": { color: DARK_TEXT_PRIMARY }
          }
        }
      }
    },
    typography: goodnewsMuiTypography,
    shape: { borderRadius: 8 }
  });

const ThemedApp: React.FC = () => {
  const { mode } = useThemeMode();
  const theme = useMemo(() => createMdTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <CookiesProvider defaultSetOptions={{ path: "/" }}>
          <UserProvider>
            <Router>
              <Routes>
                <Route path="/*" element={<ControlPanel />} />
              </Routes>
            </Router>
          </UserProvider>
        </CookiesProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

const App: React.FC = () => (
  <>
    {EnvironmentHelper.Common.GoogleAnalyticsTag && (
      <>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${EnvironmentHelper.Common.GoogleAnalyticsTag}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${EnvironmentHelper.Common.GoogleAnalyticsTag}', {
              page_path: window.location.pathname,
            });
          `
          }}
        />
      </>
    )}

    <ThemeContextProvider>
      <ThemedApp />
    </ThemeContextProvider>
  </>
);
export default App;
