import { getRuntimeApiUrl } from "@nocobase/portal-sdk/runtime";

const getApiBasePath = () => {
  const apiUrl = getRuntimeApiUrl() || "/api";

  try {
    const parsedUrl = new URL(
      apiUrl,
      typeof window === "undefined" ? "http://localhost" : window.location.origin
    );
    return `${parsedUrl.pathname.replace(/\/+$/, "")}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return apiUrl.replace(/\/+$/, "") || "/api";
  }
};

export const portalApiPath = (path = "/") => {
  const normalizedPath = path.replace(/^\/+/, "");
  const prefix = `${getApiBasePath()}/_portal`;
  return normalizedPath ? `${prefix}/${normalizedPath}` : prefix;
};
