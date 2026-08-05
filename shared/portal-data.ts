export type PortalDataAction =
  | "capabilities"
  | "metadata"
  | "query"
  | "get"
  | "create"
  | "update"
  | "destroy"
  | "aggregate";

export interface PortalDataBaseInput {
  collection?: string;
  resource?: string;
  filter?: Record<string, unknown>;
  filterByTk?: unknown;
  fields?: string[];
  appends?: string[];
  except?: string[];
  sort?: string[];
  page?: number | string;
  pageSize?: number | string;
  paginate?: boolean | string;
  targetCollection?: string;
}

export type PortalDataQueryInput = PortalDataBaseInput;

export type PortalDataGetInput = PortalDataBaseInput;

export interface PortalDataCreateInput extends PortalDataBaseInput {
  values?: Record<string, unknown>;
  whitelist?: string[];
  blacklist?: string[];
  updateAssociationValues?: string[];
}

export interface PortalDataUpdateInput extends PortalDataCreateInput {
  forceUpdate?: boolean;
}

export type PortalDataDestroyInput = PortalDataBaseInput;

export interface PortalDataAggregateInput extends PortalDataBaseInput {
  measures?: unknown[];
  dimensions?: unknown[];
  orders?: unknown[];
  having?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  timezone?: string;
}

export interface PortalDataMetadataInput {
  collection?: string;
  resource?: string;
}

export interface PortalDataQueryResult<Row = unknown> {
  rows: Row[];
  count?: number;
  page?: number;
  pageSize?: number;
  totalPage?: number;
  hasNext?: boolean;
}

export interface PortalDataDeleteResult {
  success: true;
}

export interface PortalDataCapabilities {
  data: {
    actions: Array<Exclude<PortalDataAction, "capabilities" | "metadata">>;
    rawSql: false;
    permissionAware: true;
  };
}
