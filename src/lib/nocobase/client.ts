import {
  API_ORIGIN,
  API_URL,
  NOCOBASE_AUTHENTICATOR,
  NOCOBASE_TOKEN_KEY,
} from "@/providers/constants";
import { getNocoBaseErrorMessage, NocoBaseHttpError } from "./error";

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
  token?: string;
  includeAuthenticator?: boolean;
  accept?: "json" | "stream";
  unwrap?: "data" | "deep-data" | "none";
};

const getClientLocale = () =>
  typeof navigator === "undefined" ? undefined : navigator.language;

const getClientTimezone = () => {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
  const minutes = String(absoluteMinutes % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
};

const unwrapPayload = (payload: unknown, mode: RequestOptions["unwrap"]) => {
  if (mode === "none") return payload;
  if (!payload || typeof payload !== "object") return payload;
  const data = (payload as { data?: unknown }).data;
  if (mode === "deep-data" && data && typeof data === "object") {
    return (data as { data?: unknown }).data ?? data;
  }
  return data ?? payload;
};

export class NocoBaseClient {
  private readonly apiOrigin?: string;

  constructor(
    private readonly apiUrl = API_URL,
    apiOrigin = getUrlOrigin(apiUrl) ?? API_ORIGIN
  ) {
    this.apiOrigin = apiOrigin;
  }

  getApiUrl() {
    return this.apiUrl;
  }

  resolveUrl(value: string) {
    if (!value || /^[a-z][a-z\d+.-]*:/i.test(value)) return value;
    const base =
      this.apiOrigin ??
      (typeof window === "undefined" ? undefined : window.location.origin);
    if (!base) return value;
    try {
      return new URL(value, `${base.replace(/\/$/, "")}/`).toString();
    } catch {
      return value;
    }
  }

  getToken() {
    return (
      (typeof localStorage === "undefined"
        ? undefined
        : localStorage.getItem(NOCOBASE_TOKEN_KEY) ?? undefined) ??
      import.meta.env.NOCOBASE_API_TOKEN
    );
  }

  setToken(token?: string | null) {
    if (typeof localStorage === "undefined") return;
    if (token) localStorage.setItem(NOCOBASE_TOKEN_KEY, token);
    else localStorage.removeItem(NOCOBASE_TOKEN_KEY);
  }

  buildUrl(endpoint: string, query?: Record<string, QueryValue>) {
    const base = `${this.apiUrl.replace(/\/$/, "")}/${endpoint.replace(
      /^\//,
      ""
    )}`;
    const url = /^https?:\/\//.test(base)
      ? new URL(base)
      : new URL(base, window.location.origin);

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
      } else if (value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
    return url;
  }

  getHeaders({
    token = this.getToken(),
    includeAuthenticator = false,
    accept = "json",
    body,
  }: Pick<
    RequestOptions,
    "token" | "includeAuthenticator" | "accept" | "body"
  > = {}) {
    const locale = getClientLocale();
    const formData =
      typeof FormData !== "undefined" && body instanceof FormData;
    return {
      Accept: accept === "stream" ? "text/event-stream" : "application/json",
      ...(body !== undefined && !formData
        ? { "Content-Type": "application/json" }
        : {}),
      ...(accept === "stream"
        ? { "Cache-Control": "no-cache", Pragma: "no-cache" }
        : {}),
      ...(includeAuthenticator
        ? { "X-Authenticator": NOCOBASE_AUTHENTICATOR }
        : {}),
      ...(locale ? { "X-Locale": locale } : {}),
      "X-Timezone": getClientTimezone(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const method =
      options.method ?? (options.body === undefined ? "GET" : "POST");
    const response = await fetch(this.buildUrl(endpoint, options.query), {
      method,
      headers: this.getHeaders({ ...options, body: options.body }),
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body),
      signal: options.signal,
    });
    this.captureRenewedToken(response);
    const payload = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new NocoBaseHttpError({
        status: response.status,
        payload,
        message: getNocoBaseErrorMessage(
          payload,
          `NocoBase request failed (${response.status})`
        ),
      });
    }
    return unwrapPayload(payload, options.unwrap ?? "data") as T;
  }

  action<T>(
    resource: string,
    action: string,
    options: Omit<RequestOptions, "accept"> = {}
  ) {
    const method =
      options.method ?? (["get", "list"].includes(action) ? "GET" : "POST");
    return this.request<T>(`${resource}:${action}`, { ...options, method });
  }

  async stream(
    endpoint: string,
    options: Omit<RequestOptions, "accept" | "unwrap"> = {}
  ) {
    const response = await fetch(this.buildUrl(endpoint, options.query), {
      method: options.method ?? "POST",
      headers: this.getHeaders({
        ...options,
        accept: "stream",
        body: options.body,
      }),
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
    this.captureRenewedToken(response);
    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => undefined);
      throw new NocoBaseHttpError({
        status: response.status,
        payload,
        message: getNocoBaseErrorMessage(
          payload,
          `NocoBase stream failed (${response.status})`
        ),
      });
    }
    return response.body;
  }

  private captureRenewedToken(response: Response) {
    const token = response.headers.get("x-new-token");
    if (token) this.setToken(token);
  }
}

const getUrlOrigin = (value: string) => {
  if (!/^https?:\/\//i.test(value)) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
};

export const nocobaseClient = new NocoBaseClient();
