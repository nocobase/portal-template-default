interface ImportMetaEnv {
  readonly BASE_URL?: string;
  readonly DEV?: boolean;
  readonly NOCOBASE_APP_NAME?: string;
  readonly NOCOBASE_API_URL?: string;
  readonly NOCOBASE_API_TOKEN?: string;
  readonly NOCOBASE_AUTHENTICATOR?: string;
  readonly NOCOBASE_PORTAL_NAME?: string;
  readonly NOCOBASE_WS_URL?: string;
  readonly API_CLIENT_STORAGE_PREFIX?: string;
  readonly API_CLIENT_STORAGE_TYPE?: string;
  readonly API_CLIENT_SHARE_TOKEN?: string;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}

interface Window {
  __NOCOBASE_PORTAL_ENV__?: Record<string, string | undefined>;
}
