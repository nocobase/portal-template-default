import React from "react";
import { createRoot } from "react-dom/client";

import "./locales";
import App from "./App";
import { captureAuthenticationCallback } from "./providers/auth-callback";

captureAuthenticationCallback();

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

// root.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );

root.render(<App />);
