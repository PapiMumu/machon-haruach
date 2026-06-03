import type { TextStyle } from "react-native";

/** Section and card titles (matches My Giving / Help headings). */
export const givingSectionHeading: TextStyle = {
  fontSize: 16,
  lineHeight: 24,
  fontWeight: "700"
};

/** Modal and sheet titles (same scale as section headings). */
export const givingModalTitle: TextStyle = {
  fontSize: 16,
  lineHeight: 24,
  fontWeight: "700"
};

/** Primary list row / fund line emphasis. */
export const givingListRowTitle: TextStyle = {
  fontSize: 15,
  lineHeight: 20,
  fontWeight: "600"
};

/** Right-aligned amounts on list rows. */
export const givingAmountEmphasis: TextStyle = {
  fontSize: 15,
  lineHeight: 20,
  fontWeight: "700"
};

/** Standard secondary body copy. */
export const givingBody: TextStyle = {
  fontSize: 14,
  lineHeight: 20
};

/** Hints, timeline labels, fine print. */
export const givingCaption: TextStyle = {
  fontSize: 12,
  lineHeight: 18
};

/** Form field labels (Add Payment Method, etc.). */
export const givingFormLabel: TextStyle = {
  fontSize: 14,
  lineHeight: 20,
  fontWeight: "600"
};
