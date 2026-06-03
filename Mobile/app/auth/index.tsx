import { Redirect } from "expo-router";

/**
 * `/auth` has no screens without a child segment; open stack used to leave a blank view.
 * Send bare `/auth` (and index redirects) to login.
 */
export default function AuthIndex() {
  return <Redirect href="/auth/login" />;
}
