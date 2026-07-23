import type {
  NocoBaseAclActionParams,
  NocoBaseAclRoleData,
  NocoBaseAclSnapshot,
  NocoBaseCanParams,
  NocoBaseResourceAcl,
} from "./types";
import ignore from "ignore";
import { getRecordActionPermission } from "./record-permissions";

const REFINE_ACTION_MAP: Record<string, string> = {
  list: "list",
  show: "get",
  create: "create",
  edit: "update",
  delete: "destroy",
  clone: "create",
};

const getResourceAcl = (params?: NocoBaseCanParams["params"]) =>
  params?.resource?.meta?.acl as NocoBaseResourceAcl | undefined;

export const mapRefineAction = (action: string) =>
  REFINE_ACTION_MAP[action] ?? action;

export const getAclDataForDataSource = (
  snapshot: NocoBaseAclSnapshot,
  dataSourceKey = "main"
): NocoBaseAclRoleData => {
  const dataSourceAcl = snapshot.meta.dataSources?.[dataSourceKey];
  return dataSourceAcl
    ? {
        ...snapshot.data,
        ...dataSourceAcl,
        snippets: snapshot.data.snippets,
        actionAlias: snapshot.data.actionAlias,
        allowAll: snapshot.data.allowAll,
      }
    : snapshot.data;
};

export const resolveActionPermission = ({
  snapshot,
  resource,
  action,
  dataSourceKey = "main",
}: {
  snapshot: NocoBaseAclSnapshot;
  resource: string;
  action: string;
  dataSourceKey?: string;
}): NocoBaseAclActionParams | null => {
  const data = getAclDataForDataSource(snapshot, dataSourceKey);
  if (data.allowAll) return {};

  const canonicalAction = data.actionAlias?.[action] ?? action;
  if (data.resources?.includes(resource)) {
    return (
      data.actions?.[`${resource}:${canonicalAction}`] ??
      data.actions?.[`${resource}:${action}`] ??
      null
    );
  }

  const strategyAllowed = data.strategy?.actions?.some(
    (item) => item.split(":")[0] === canonicalAction
  );
  return strategyAllowed ? {} : null;
};

const matchesSnippet = (snippets: string[], target: string) =>
  !target || target === "*" || ignore().add(snippets).ignores(target);

export const canAccessWithSnapshot = (
  snapshot: NocoBaseAclSnapshot,
  { resource, action, params }: NocoBaseCanParams
) => {
  if (snapshot.status !== "ready") return false;

  const resourceAcl = getResourceAcl(params);
  if (resourceAcl === false || resourceAcl?.type === "authenticated") {
    return true;
  }

  if (resourceAcl?.type === "snippet") {
    return (
      snapshot.data.allowAll ||
      matchesSnippet(snapshot.data.snippets ?? [], resourceAcl.name)
    );
  }

  if (resourceAcl?.type === "route") {
    return (
      snapshot.data.allowAll ||
      (snapshot.data.allowMenuItemIds ?? [])
        .map(String)
        .includes(String(resourceAcl.routeId))
    );
  }

  const targetResource =
    resourceAcl?.type === "collection" && resourceAcl.resource
      ? resourceAcl.resource
      : resource;
  if (!targetResource) return true;

  const dataSourceKey =
    (resourceAcl?.type === "collection" && resourceAcl.dataSourceKey) ||
    (typeof params?.dataSourceKey === "string"
      ? params.dataSourceKey
      : "main");
  const mappedAction =
    (resourceAcl?.type === "collection" && resourceAcl.actionMap?.[action]) ||
    mapRefineAction(action);
  const permission = resolveActionPermission({
    snapshot,
    resource: targetResource,
    action: mappedAction,
    dataSourceKey,
  });
  if (!permission) return false;

  if (params?.id !== undefined) {
    const recordPermission = getRecordActionPermission({
      dataSourceKey,
      resource: targetResource,
      action: mappedAction,
      id: params.id,
      actionAlias: getAclDataForDataSource(snapshot, dataSourceKey).actionAlias,
    });
    if (recordPermission !== undefined) return recordPermission;
  }

  if (typeof params?.field === "string") {
    const fields = [
      ...(permission.fields ?? []),
      ...(permission.whitelist ?? []),
      ...(permission.appends ?? []),
    ];
    if (!fields.length) return true;
    return fields.includes(params.field);
  }

  return true;
};
