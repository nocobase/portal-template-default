export interface PortalUserRecord {
  id: number | string;
  username?: string | null;
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PortalUsersListResponse {
  rows: PortalUserRecord[];
  count?: number;
  page: number;
  pageSize: number;
  totalPage?: number;
}

export interface PortalUserMutationRequest {
  username?: string;
  nickname?: string;
  email?: string;
  password?: string;
}

export interface PortalUserMetadataResponse {
  name?: string;
  fields?: unknown[];
  options?: Record<string, unknown>;
}
