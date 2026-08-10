import { getNocoBaseAppName, readClientEnv } from "../runtime/config.ts";

export type AuthStorageType = "localStorage" | "sessionStorage" | "memory";
export type AuthSessionField = "token" | "auth" | "role" | "locale";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type AuthSessionListener = (
  field: AuthSessionField,
  value?: string
) => void;

export type AuthSessionOptions = {
  appName?: string;
  storagePrefix?: string;
  storageType?: AuthStorageType;
  shareToken?: boolean;
  storage?: StorageLike;
};

export type AuthSessionStorageKeyOptions = Pick<
  AuthSessionOptions,
  "appName" | "shareToken" | "storagePrefix"
>;

const DEFAULT_STORAGE_PREFIX = "NOCOBASE_";
const DEFAULT_STORAGE_TYPE: AuthStorageType = "localStorage";
const memoryStorage = new Map<string, string>();

const memoryStorageAdapter: StorageLike = {
  getItem: (key) => memoryStorage.get(key) ?? null,
  setItem: (key, value) => memoryStorage.set(key, value),
  removeItem: (key) => memoryStorage.delete(key),
};

const normalizeStorageType = (value?: string): AuthStorageType => {
  if (value === "sessionStorage" || value === "memory") return value;
  return DEFAULT_STORAGE_TYPE;
};

const parseBoolean = (value?: string) =>
  typeof value === "string" && /^true$/i.test(value);

const getStorage = (type: AuthStorageType): StorageLike => {
  if (typeof window === "undefined" || type === "memory") {
    return memoryStorageAdapter;
  }
  return type === "sessionStorage" ? window.sessionStorage : window.localStorage;
};

const getCookie = (name: string) => {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  const value = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length);
  if (value === undefined) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const resolveAuthSessionStorageKey = (
  {
    appName = "main",
    shareToken = false,
    storagePrefix = DEFAULT_STORAGE_PREFIX,
  }: AuthSessionStorageKeyOptions,
  field: AuthSessionField
) => {
  const sharedSubAppToken =
    field === "token" && appName !== "main" && shareToken;
  const appPrefix =
    appName === "main" || sharedSubAppToken
      ? storagePrefix
      : `${storagePrefix}${appName.toUpperCase()}_`;
  return `${appPrefix}${field}`.toUpperCase();
};

export class AuthSession {
  readonly appName: string;
  readonly storagePrefix: string;
  readonly storageType: AuthStorageType;
  readonly shareToken: boolean;
  private readonly storage: StorageLike;
  private readonly listeners = new Set<AuthSessionListener>();

  constructor(options: AuthSessionOptions = {}) {
    this.appName = options.appName ?? getNocoBaseAppName();
    this.storagePrefix =
      options.storagePrefix ||
      readClientEnv("API_CLIENT_STORAGE_PREFIX") ||
      DEFAULT_STORAGE_PREFIX;
    this.storageType =
      options.storageType ??
      normalizeStorageType(readClientEnv("API_CLIENT_STORAGE_TYPE"));
    this.shareToken =
      options.shareToken ?? parseBoolean(readClientEnv("API_CLIENT_SHARE_TOKEN"));
    this.storage = options.storage ?? getStorage(this.storageType);
  }

  getStorageKey(field: AuthSessionField) {
    return resolveAuthSessionStorageKey(this, field);
  }

  get(field: AuthSessionField) {
    return this.storage.getItem(this.getStorageKey(field)) || undefined;
  }

  set(field: AuthSessionField, value?: string | null) {
    const key = this.getStorageKey(field);
    const previous = this.get(field);
    if (value) this.storage.setItem(key, value);
    else this.storage.removeItem(key);
    const next = this.get(field);
    if (next !== previous) {
      this.listeners.forEach((listener) => listener(field, next));
    }
  }

  subscribe(listener: AuthSessionListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clearAuthentication() {
    this.set("token", null);
    this.set("auth", null);
    this.set("role", null);
  }

  getCookie(type: "role" | "csrfToken") {
    const prefix = type === "role" ? "nb_role" : "nb_csrf_token";
    return getCookie(`${prefix}_${this.appName}`);
  }
}

export const authSession = new AuthSession();
