/** Matches Goodnews World / RockNextGen (RockWeb/Themes/RockNextGen/Styles/theme.css). */
export const INTER_FONT_STACK =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

export const GOODNEWS_FONT_SIZES = {
  xsmall: "12px",
  small: "14px",
  regular: "16px",
  h1: "44px",
  h2: "36px",
  h3: "28px",
  h4: "22px",
  h5: "18px",
  h6: "16px",
} as const;

export const goodnewsMuiTypography = {
  fontFamily: INTER_FONT_STACK,
  fontSize: 16,
  htmlFontSize: 14,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  h1: { fontSize: GOODNEWS_FONT_SIZES.h1, fontWeight: 600, lineHeight: 1.1 },
  h2: { fontSize: GOODNEWS_FONT_SIZES.h2, fontWeight: 600, lineHeight: 1.1 },
  h3: { fontSize: GOODNEWS_FONT_SIZES.h3, fontWeight: 600, lineHeight: 1.1 },
  h4: { fontSize: GOODNEWS_FONT_SIZES.h4, fontWeight: 600, lineHeight: 1.1 },
  h5: { fontSize: GOODNEWS_FONT_SIZES.h5, fontWeight: 600, lineHeight: 1.1 },
  h6: { fontSize: GOODNEWS_FONT_SIZES.h6, fontWeight: 600, lineHeight: 1.1 },
  body1: { fontSize: GOODNEWS_FONT_SIZES.regular, fontWeight: 400, lineHeight: 1.5 },
  body2: { fontSize: GOODNEWS_FONT_SIZES.small, fontWeight: 400, lineHeight: 1.5 },
  button: { fontSize: GOODNEWS_FONT_SIZES.regular, fontWeight: 500, lineHeight: 1.5, textTransform: "none" as const },
  caption: { fontSize: GOODNEWS_FONT_SIZES.xsmall, fontWeight: 400, lineHeight: 1.5 },
  subtitle1: { fontSize: GOODNEWS_FONT_SIZES.regular, fontWeight: 400, lineHeight: 1.5 },
  subtitle2: { fontSize: GOODNEWS_FONT_SIZES.small, fontWeight: 500, lineHeight: 1.5 },
};
