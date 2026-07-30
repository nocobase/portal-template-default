/// <reference types="vite/client" />

interface Window {
  NOCOBASE_PORTAL_BASE?: string;
  NOCOBASE_API_URL?: string;
  __nocobase_api_client_storage_prefix__?: string;
  __nocobase_api_client_storage_type__?: string;
  __nocobase_api_client_share_token__?: boolean | string;
}

interface ImportMetaEnv {
  readonly API_CLIENT_STORAGE_PREFIX?: string;
  readonly API_CLIENT_STORAGE_TYPE?: string;
  readonly API_CLIENT_SHARE_TOKEN?: string;
}
