import React from "react";
import { createRoot } from "react-dom/client";
import { captureAuthenticationCallback } from "@nocobase/portal-sdk/auth";

import "./locales";
import { portalI18nReady } from "./providers/i18n/runtime";
import App from "./App";

async function bootstrap() {
  captureAuthenticationCallback();
  try {
    await portalI18nReady;
  } catch (error) {
    console.warn("Unable to initialize Portal translations", error);
  }

  const container = document.getElementById("root") as HTMLElement;
  const root = createRoot(container);

  // root.render(
  //   <React.StrictMode>
  //     <App />
  //   </React.StrictMode>
  // );

  root.render(<App />);
}

void bootstrap();
