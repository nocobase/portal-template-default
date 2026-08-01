import { clearAcl } from "../acl/index.js";
import { nocobaseClient } from "../client/index.js";

export function captureAuthenticationCallback() {
  if (typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");
  const authenticator = url.searchParams.get("authenticator");

  if (!token) return false;

  nocobaseClient.setToken(token);
  nocobaseClient.setAuthenticator(authenticator);
  nocobaseClient.setRole(null);
  clearAcl();

  url.searchParams.delete("token");
  url.searchParams.delete("authenticator");
  window.history.replaceState(window.history.state, "", url);
  return true;
}
