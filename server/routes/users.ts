import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createPortalDataClient } from "../middleware/portal-data.js";
import type {
  PortalUserMetadataResponse,
  PortalUserMutationRequest,
  PortalUserRecord,
  PortalUsersListResponse,
} from "../../shared/users.js";

const USER_FIELDS = [
  "id",
  "username",
  "nickname",
  "email",
  "phone",
  "createdAt",
  "updatedAt",
];

export const usersRouter = new Hono();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getParam = (params: object, name: string) => {
  const value = (params as Record<string, unknown>)[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const getQueryString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const toPositiveInteger = (value: unknown, fallback: number) => {
  const numberValue = Number(value ?? fallback);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : fallback;
};

const readMutationBody = (body: unknown): PortalUserMutationRequest => {
  if (!isRecord(body)) return {};

  const output: PortalUserMutationRequest = {};
  for (const key of ["username", "nickname", "email", "password"] as const) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) {
      output[key] = value.trim();
    }
  }

  return output;
};

const toMutationValues = (body: PortalUserMutationRequest) => {
  const values: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      values[key] = value;
    }
  }

  return values;
};

const getUsersSearchFilter = (search?: string) => {
  if (!search) return undefined;

  return {
    $or: [
      { username: { $includes: search } },
      { nickname: { $includes: search } },
      { email: { $includes: search } },
    ],
  };
};

const normalizeListResult = (
  result: unknown,
  fallback: { page: number; pageSize: number },
): PortalUsersListResponse => {
  const record = isRecord(result) ? result : {};
  const nestedData = isRecord(record.data) ? record.data : undefined;
  const source = nestedData ?? record;
  const rows = Array.isArray(source.rows)
    ? (source.rows as PortalUserRecord[])
    : Array.isArray(source.data)
      ? (source.data as PortalUserRecord[])
      : [];

  return {
    count: typeof source.count === "number" ? source.count : rows.length,
    page: toPositiveInteger(source.page, fallback.page),
    pageSize: toPositiveInteger(source.pageSize, fallback.pageSize),
    rows,
    totalPage:
      typeof source.totalPage === "number"
        ? source.totalPage
        : Math.max(1, Math.ceil((typeof source.count === "number" ? source.count : rows.length) / fallback.pageSize)),
  };
};

usersRouter.get("/", async (context) => {
  const page = toPositiveInteger(context.req.query("page"), 1);
  const pageSize = Math.min(toPositiveInteger(context.req.query("pageSize"), 10), 50);
  const search = getQueryString(context.req.query("search"));
  const portalData = createPortalDataClient(context);

  const result = await portalData.query<PortalUserRecord>({
    collection: "users",
    fields: USER_FIELDS,
    filter: getUsersSearchFilter(search),
    page,
    pageSize,
    sort: ["-createdAt"],
  });

  return context.json(normalizeListResult(result, { page, pageSize }));
});

usersRouter.get("/metadata", async (context) => {
  const portalData = createPortalDataClient(context);

  return context.json(await portalData.metadata<PortalUserMetadataResponse>({
    collection: "users",
  }));
});

usersRouter.get("/:id", async (context) => {
  const id = getParam({ id: context.req.param("id") }, "id");
  if (!id) throw new HTTPException(400, { message: "User id is required" });
  const portalData = createPortalDataClient(context);

  return context.json(await portalData.get<PortalUserRecord>({
    collection: "users",
    fields: USER_FIELDS,
    filterByTk: id,
  }));
});

usersRouter.post("/", async (context) => {
  const values = readMutationBody(await context.req.json().catch(() => undefined));
  if (!values.username && !values.email && !values.nickname) {
    throw new HTTPException(400, {
      message: "Username, email, or nickname is required",
    });
  }
  const portalData = createPortalDataClient(context);

  return context.json(await portalData.create<PortalUserRecord>({
    collection: "users",
    values: toMutationValues(values),
  }));
});

usersRouter.put("/:id", async (context) => {
  const id = getParam({ id: context.req.param("id") }, "id");
  if (!id) throw new HTTPException(400, { message: "User id is required" });

  const values = readMutationBody(await context.req.json().catch(() => undefined));
  delete values.password;

  if (!values.username && !values.email && !values.nickname) {
    throw new HTTPException(400, { message: "Nothing to update" });
  }
  const portalData = createPortalDataClient(context);

  return context.json(await portalData.update<PortalUserRecord>({
    collection: "users",
    filterByTk: id,
    values: toMutationValues(values),
  }));
});

usersRouter.delete("/:id", async (context) => {
  const id = getParam({ id: context.req.param("id") }, "id");
  if (!id) throw new HTTPException(400, { message: "User id is required" });
  const portalData = createPortalDataClient(context);

  return context.json(await portalData.destroy({
    collection: "users",
    filterByTk: id,
  }));
});
