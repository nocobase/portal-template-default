import type { BaseKey, IResourceItem } from "@refinedev/core";

export type RoleMode =
  | "default"
  | "allow-use-union"
  | "only-use-union";

export type Role = {
  name: string;
  title?: string;
};

export type AclActionParams = Record<string, unknown> & {
  fields?: string[];
  whitelist?: string[];
  appends?: string[];
};

export type AclRoleData = {
  snippets?: string[];
  role?: string;
  roleMode?: RoleMode;
  resources?: string[];
  actions?: Record<string, AclActionParams>;
  actionAlias?: Record<string, string>;
  strategy?: {
    actions?: string[];
  };
  allowAll?: boolean;
  allowConfigure?: boolean;
  availableActions?: string[];
  allowMenuItemIds?: Array<string | number>;
  allowAnonymous?: boolean;
  uiButtonSchemasBlacklist?: string[];
};

export type AclMeta = {
  dataSources?: Record<string, Partial<AclRoleData>>;
};

export type AclResponse = {
  data?: AclRoleData;
  meta?: AclMeta;
};

export type AclSnapshot = {
  status: "idle" | "loading" | "ready" | "error";
  identity?: string;
  data: AclRoleData;
  meta: AclMeta;
  error?: Error;
  version: number;
};

export type ResourceAcl =
  | false
  | {
      type: "authenticated";
    }
  | {
      type: "collection";
      resource?: string;
      dataSourceKey?: string;
      actionMap?: Record<string, string>;
    }
  | {
      type: "snippet";
      name: string;
    }
  | {
      type: "route";
      routeId: string | number;
    };

export type AclCanParams = {
  resource?: string;
  action: string;
  params?: {
    id?: BaseKey;
    field?: string;
    dataSourceKey?: string;
    meta?: Record<string, unknown>;
    resource?: IResourceItem;
    [key: string]: unknown;
  };
};

export type AclIdentity = {
  id: number | string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  avatar?: string;
  roles: Role[];
};
