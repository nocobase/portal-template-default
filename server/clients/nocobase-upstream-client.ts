export class NocoBaseUpstreamHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown
  ) {
    super(message);
    this.name = "NocoBaseUpstreamHttpError";
  }
}

export interface NocoBaseUpstreamClientOptions {
  target?: string;
  context: ServerRequestContext;
}

export interface ServerRequestContext {
  getHeader(name: string): string | undefined;
  setHeader(name: string, value: string): void;
}

export interface NocoBaseUpstreamRequestOptions {
  body?: unknown;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | null | undefined>;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const FORWARDED_HEADERS = [
  "authorization",
  "cookie",
  "x-csrf-token",
  "x-role",
  "x-portal",
  "x-locale",
  "x-timezone",
  "x-authenticator",
  "x-with-acl-meta",
  "x-request-id",
  "user-agent",
];

const parseCookies = (cookieHeader?: string) => {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const item of cookieHeader.split(";")) {
    const [name, ...valueParts] = item.trim().split("=");
    if (!name || !valueParts.length) continue;

    const rawValue = valueParts.join("=");
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }
  }

  return cookies;
};

const getCsrfTokenFromCookies = (context: ServerRequestContext) => {
  const cookies = parseCookies(context.getHeader("cookie"));
  const portalName = context.getHeader("x-portal") || "main";
  return cookies[`nb_csrf_token_${portalName}`] ?? cookies.nb_csrf_token_main;
};

const getRequestOrigin = (context: ServerRequestContext) => {
  const origin = context.getHeader("origin");
  if (origin) {
    try {
      return new URL(origin);
    } catch {
      return undefined;
    }
  }

  const referer = context.getHeader("referer");
  if (referer) {
    try {
      return new URL(referer);
    } catch {
      return undefined;
    }
  }

  return undefined;
};

const unwrapPayload = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return payload;
  const meta = (payload as { meta?: unknown }).meta;
  const data = (payload as { data?: unknown }).data;
  if (Array.isArray(data)) {
    return {
      ...(meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {}),
      rows: data,
    };
  }
  return data ?? payload;
};

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as {
    error?: unknown;
    message?: unknown;
    errors?: unknown;
  };

  if (typeof record.message === "string") return record.message;
  if (typeof record.error === "string") return record.error;
  if (Array.isArray(record.errors)) {
    const firstError = record.errors[0];
    if (
      firstError &&
      typeof firstError === "object" &&
      typeof (firstError as { message?: unknown }).message === "string"
    ) {
      return (firstError as { message: string }).message;
    }
  }

  return fallback;
};

export class NocoBaseUpstreamClient {
  constructor(private readonly options: NocoBaseUpstreamClientOptions) {}

  async request<T>(
    endpoint: string,
    { body, method = body === undefined ? "GET" : "POST", query }: NocoBaseUpstreamRequestOptions = {}
  ): Promise<T> {
    const target = this.options.target;
    if (!target) {
      throw new NocoBaseUpstreamHttpError(
        "NOCOBASE_API_PROXY_TARGET is not configured",
        502,
        undefined
      );
    }

    const response = await fetch(this.buildUrl(target, endpoint, query), {
      method,
      headers: this.buildHeaders(method, body),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    this.forwardRenewedToken(response);
    const payload = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw new NocoBaseUpstreamHttpError(
        getErrorMessage(payload, `NocoBase request failed (${response.status})`),
        response.status,
        payload
      );
    }

    return unwrapPayload(payload) as T;
  }

  private buildUrl(
    targetUrl: string,
    endpoint: string,
    query?: NocoBaseUpstreamRequestOptions["query"]
  ) {
    const target = new URL(targetUrl);
    const basePath = target.pathname.replace(/\/+$/, "");
    const endpointPath = endpoint.replace(/^\/+/, "");
    target.pathname = `${basePath}/${endpointPath}`.replace(/\/{2,}/g, "/");
    target.search = "";

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null) continue;
      target.searchParams.set(key, String(value));
    }

    return target;
  }

  private buildHeaders(method: string, body: unknown) {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    };

    for (const name of FORWARDED_HEADERS) {
      const value = this.options.context.getHeader(name);
      if (value) headers[name] = value;
    }

    const requestOrigin = getRequestOrigin(this.options.context);
    if (requestOrigin) {
      headers["x-forwarded-host"] = requestOrigin.host;
      headers["x-forwarded-proto"] = requestOrigin.protocol.replace(/:$/, "");
    }

    if (!SAFE_METHODS.has(method) && !headers["x-csrf-token"]) {
      const csrfToken = getCsrfTokenFromCookies(this.options.context);
      if (csrfToken) headers["x-csrf-token"] = csrfToken;
    }

    return headers;
  }

  private forwardRenewedToken(response: Response) {
    const renewedToken = response.headers.get("x-new-token");
    if (renewedToken) {
      this.options.context.setHeader("x-new-token", renewedToken);
    }
  }
}
