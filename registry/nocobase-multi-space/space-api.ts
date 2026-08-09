import { nocobaseClient } from "@nocobase/portal-sdk/client";

import type { SpaceRecord, SpaceUser } from "./types";

export const SPACES_KEY = "x-spaces";
export const SPACES_VIEW_KEY = "x-spaces-view";

function rows(payload: any): any[] {
  const value = payload?.data?.data ?? payload?.data ?? payload ?? [];
  return Array.isArray(value) ? value : [];
}

function normalizeSpaces(payload: unknown): SpaceRecord[] {
  return rows(payload).flatMap((value) => {
    if (
      typeof value !== "object" ||
      value === null ||
      typeof value.name !== "string" ||
      !value.name.trim()
    ) {
      return [];
    }
    return [{ ...value, name: value.name.trim() } as SpaceRecord];
  });
}

function requiredSpaceName(space: string | undefined) {
  const name = space?.trim();
  if (!name) throw new Error("A space must be selected first.");
  return name;
}

function spaceUsersEndpoint(
  space: string | undefined,
  action: "list" | "add" | "remove"
) {
  const name = requiredSpaceName(space);
  return `spaces/${encodeURIComponent(name)}/users:${action}`;
}

export async function getMySpaces() {
  const payload = await nocobaseClient.action<any>("spaces", "my", {
    method: "GET",
    unwrap: "none",
  });
  const data = payload?.data?.data ?? payload?.data ?? payload ?? {};
  return {
    spaces: normalizeSpaces(data.spaces),
    defaultSpaceName:
      typeof data.defaultSpaceName === "string"
        ? data.defaultSpaceName
        : undefined,
    viewableSpaceNames: Array.isArray(data.viewableSpaceNames)
      ? data.viewableSpaceNames.filter(
          (value: unknown): value is string =>
            typeof value === "string" && Boolean(value.trim())
        )
      : [],
  };
}

export async function setDefaultSpace(
  defaultSpaceName: string,
  viewableSpaceNames = [defaultSpaceName]
) {
  const name = requiredSpaceName(defaultSpaceName);
  return nocobaseClient.action("spaces", "setDefaultSpace", {
    method: "POST",
    body: { defaultSpaceName: name, viewableSpaceNames },
  });
}

export async function listSpaces(): Promise<SpaceRecord[]> {
  const payload = await nocobaseClient.action<any>("spaces", "listOfConfig", {
    method: "GET",
    query: { showAnonymous: true, pageSize: 200 },
    unwrap: "none",
  });
  return normalizeSpaces(payload);
}

export async function createSpace(values: Partial<SpaceRecord>) {
  return nocobaseClient.action("spaces", "create", {
    method: "POST",
    body: values,
  });
}

export async function updateSpace(
  name: string,
  values: Partial<SpaceRecord>
) {
  return nocobaseClient.action("spaces", "update", {
    method: "POST",
    query: { filterByTk: requiredSpaceName(name) },
    body: values,
  });
}

export async function destroySpace(name: string) {
  return nocobaseClient.action("spaces", "destroy", {
    method: "POST",
    query: { filterByTk: requiredSpaceName(name) },
  });
}

export async function listSpaceUsers(
  space: string | undefined
): Promise<SpaceUser[]> {
  if (!space?.trim()) return [];
  const payload = await nocobaseClient.request<any>(
    spaceUsersEndpoint(space, "list"),
    {
      method: "GET",
      query: { pageSize: 200, appends: ["roles"] },
      unwrap: "none",
    }
  );
  return rows(payload) as SpaceUser[];
}

export async function addSpaceUsers(
  space: string | undefined,
  userIds: Array<string | number>
) {
  return nocobaseClient.request(spaceUsersEndpoint(space, "add"), {
    method: "POST",
    body: userIds,
  });
}

export async function removeSpaceUsers(
  space: string | undefined,
  userIds: Array<string | number>
) {
  return nocobaseClient.request(spaceUsersEndpoint(space, "remove"), {
    method: "POST",
    body: userIds,
  });
}
