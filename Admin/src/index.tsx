import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import { EnvironmentHelper } from "./helpers";

import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://0fa8dbad4eea6ffc6b2ffc157c43cff2@o4510432524107776.ingest.us.sentry.io/4510432531251200",
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true
});


EnvironmentHelper.init().then(() => {
  const root = createRoot(document.getElementById("root"));
  root.render(<App />);
  serviceWorker.unregister();
}).catch((err) => {
  console.error("EnvironmentHelper.init failed", err);
  const rootEl = document.getElementById("root");
  if (rootEl) {
    createRoot(rootEl).render(
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1>Unable to start Admin</h1>
        <p>Configuration failed to load. Check the browser console and restart the dev server.</p>
      </div>
    );
  }
});
