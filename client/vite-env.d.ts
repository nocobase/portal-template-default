/// <reference types="vite/client" />

declare const __PORTAL_TEMPLATE_NAME__: string;
declare const __PORTAL_TEMPLATE_VERSION__: string;

interface Window {
  __NOCOBASE_PORTAL_ENV__?: Record<string, string | undefined>;
}

interface ImportMetaEnv {
  readonly NOCOBASE_APP_NAME?: string;
  readonly NOCOBASE_PORTAL_NAME?: string;
  readonly API_CLIENT_STORAGE_PREFIX?: string;
  readonly API_CLIENT_STORAGE_TYPE?: string;
  readonly API_CLIENT_SHARE_TOKEN?: string;
}
