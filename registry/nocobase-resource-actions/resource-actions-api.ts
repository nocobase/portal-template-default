import { nocobaseClient } from "@nocobase/portal-sdk/client";

import type {
  ResourceActionField,
  ResourceKey,
  ResourceUpdateTarget,
  ResourceValues,
} from "./types";

const dataSourceHeaders = (dataSourceKey?: string) =>
  dataSourceKey ? { "X-Data-Source": dataSourceKey } : undefined;

const serializeResourceKey = (key: ResourceKey) =>
  typeof key === "object" ? JSON.stringify(key) : key;

function hasFilterCondition(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasFilterCondition);
  }
  if (value && typeof value === "object") {
    return Object.values(value).some(hasFilterCondition);
  }
  return value !== undefined;
}

export function createUpdateBody(
  target: ResourceUpdateTarget,
  values: ResourceValues
) {
  if (target.type === "selected") {
    if (!target.keys.length) {
      throw new Error("NO_SELECTED_RECORDS");
    }
    return {
      filterByTk: target.keys,
      values,
    };
  }
  if (target.type === "filter") {
    if (!hasFilterCondition(target.filter)) {
      throw new Error("EMPTY_FILTER");
    }
    return { filter: target.filter, values };
  }
  return { values, forceUpdate: true };
}

export async function updateResourceRecords({
  collectionName,
  dataSourceKey,
  target,
  values,
}: {
  collectionName: string;
  dataSourceKey?: string;
  target: ResourceUpdateTarget;
  values: ResourceValues;
}) {
  return nocobaseClient.action(collectionName, "update", {
    method: "POST",
    body: createUpdateBody(target, values),
    headers: dataSourceHeaders(dataSourceKey),
    unwrap: "data",
  });
}

export async function getDuplicateTemplate({
  collectionName,
  dataSourceKey,
  recordKey,
  fields,
}: {
  collectionName: string;
  dataSourceKey?: string;
  recordKey: ResourceKey;
  fields: ResourceActionField[];
}) {
  return nocobaseClient.action<ResourceValues>(collectionName, "get", {
    query: {
      filterByTk: serializeResourceKey(recordKey),
      "fields[]": fields.map((field) => field.name),
      isTemplate: true,
    },
    headers: dataSourceHeaders(dataSourceKey),
    unwrap: "data",
  });
}

export async function createDuplicateRecord({
  collectionName,
  dataSourceKey,
  values,
}: {
  collectionName: string;
  dataSourceKey?: string;
  values: ResourceValues;
}) {
  return nocobaseClient.action(collectionName, "create", {
    method: "POST",
    body: values,
    headers: dataSourceHeaders(dataSourceKey),
    unwrap: "data",
  });
}
