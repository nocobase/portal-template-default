import type { BaseKey, IResourceItem } from "@refinedev/core";

export type NocoBaseRoleMode =
  | "default"
  | "allow-use-union"
  | "only-use-union";

export type NocoBaseRole = {
  name: string;
  title?: string;
};

export type NocoBaseAclActionParams = Record<string, unknown> & {
  fields?: string[];
  whitelist?: string[];
  appends?: string[];
};

export type NocoBaseAclRoleData = {
  snippets?: string[];
  role?: string;
  roleMode?: NocoBaseRoleMode;
  resources?: string[];
  actions?: Record<string, NocoBaseAclActionParams>;
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

export type NocoBaseAclMeta = {
  dataSources?: Record<string, Partial<NocoBaseAclRoleData>>;
};

export type NocoBaseAclResponse = {
  data?: NocoBaseAclRoleData;
  meta?: NocoBaseAclMeta;
};

export type NocoBaseAclSnapshot = {
  status: "idle" | "loading" | "ready" | "error";
  identity?: string;
  data: NocoBaseAclRoleData;
  meta: NocoBaseAclMeta;
  error?: Error;
  version: number;
};

export type NocoBaseResourceAcl =
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

export type NocoBaseCanParams = {
  resource?: string;
  action: string;
  params?: {
    id?: BaseKey;
    field?: string;
    dataSourceKey?: string;
    resource?: IResourceItem;
    [key: string]: unknown;
  };
};

export type NocoBaseIdentity = {
  id: number | string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  avatar?: string;
  roles: NocoBaseRole[];
};
