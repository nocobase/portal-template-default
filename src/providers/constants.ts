const rawApiUrl =
  import.meta.env.NOCOBASE_API_URL ?? "http://127.0.0.1:13000/api";

const getDefaultProxyTarget = (apiUrl?: string) => {
  if (!apiUrl || apiUrl.startsWith("/")) return undefined;

  try {
    return new URL(apiUrl).origin;
  } catch {
    return undefined;
  }
};

const proxyTarget = import.meta.env.DEV
  ? getDefaultProxyTarget(rawApiUrl)
  : undefined;

const toProxyRelativeUrl = (url: string, target?: string) => {
  if (!target || url.startsWith("/")) return url;

  try {
    const parsedUrl = new URL(url);
    const parsedTarget = new URL(target);

    if (parsedUrl.origin === parsedTarget.origin) {
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }
  } catch {
    return url;
  }

  return url;
};

export const API_URL = toProxyRelativeUrl(rawApiUrl, proxyTarget);
export const API_ORIGIN = getDefaultProxyTarget(rawApiUrl);
export const NOCOBASE_TOKEN_KEY = "nocobase-auth-token";
export const NOCOBASE_AUTHENTICATOR =
  import.meta.env.NOCOBASE_AUTHENTICATOR ?? "basic";
