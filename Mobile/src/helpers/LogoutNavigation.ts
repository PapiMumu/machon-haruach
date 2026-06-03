import { router } from "expo-router";
import { store as expoRouterStore } from "expo-router/build/global-state/router-store";

const GET_STARTED_HREF = "/get-started";

/**
 * After sign-out, `router.replace` / `dismissTo` from inside the drawer often never leaves `(drawer)`
 * (Expo maps `REPLACE` → `JUMP_TO` on the drawer). Resetting the **root** navigation state from the
 * linking config matches cold-start navigation to Get Started.
 */
export function resetNavigationToGetStarted(): void {
  try {
    expoRouterStore.assertIsReady();
    const nextState = expoRouterStore.getStateForHref(GET_STARTED_HREF);
    if (nextState && Array.isArray(nextState.routes) && nextState.routes.length > 0) {
      expoRouterStore.navigationRef.resetRoot(nextState);
      return;
    }
    console.warn("[LogoutNavigation] getStateForHref returned empty; falling back to dismissTo");
  } catch (e) {
    console.warn("[LogoutNavigation] resetRoot failed", e);
  }
  try {
    router.dismissTo(GET_STARTED_HREF);
  } catch {
    router.replace(GET_STARTED_HREF);
  }
}
