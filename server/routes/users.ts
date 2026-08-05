import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
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

const users = new Router({ prefix: "/_app/api/users" });

users.use(bodyParser());

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

users.get("/", async (ctx) => {
  const page = toPositiveInteger(ctx.query.page, 1);
  const pageSize = Math.min(toPositiveInteger(ctx.query.pageSize, 10), 50);
  const search = getQueryString(ctx.query.search);

  const result = await ctx.portalData.query<PortalUserRecord>({
    collection: "users",
    fields: USER_FIELDS,
    filter: getUsersSearchFilter(search),
    page,
    pageSize,
    sort: ["-createdAt"],
  });

  ctx.body = normalizeListResult(result, { page, pageSize });
});

users.get("/metadata", async (ctx) => {
  ctx.body = await ctx.portalData.metadata<PortalUserMetadataResponse>({
    collection: "users",
  });
});

users.get("/:id", async (ctx) => {
  const id = getParam(ctx.params, "id");
  if (!id) ctx.throw(400, "User id is required");

  ctx.body = await ctx.portalData.get<PortalUserRecord>({
    collection: "users",
    fields: USER_FIELDS,
    filterByTk: id,
  });
});

users.post("/", async (ctx) => {
  const values = readMutationBody(ctx.request.body);
  if (!values.username && !values.email && !values.nickname) {
    ctx.throw(400, "Username, email, or nickname is required");
  }

  ctx.body = await ctx.portalData.create<PortalUserRecord>({
    collection: "users",
    values: toMutationValues(values),
  });
});

users.put("/:id", async (ctx) => {
  const id = getParam(ctx.params, "id");
  if (!id) ctx.throw(400, "User id is required");

  const values = readMutationBody(ctx.request.body);
  delete values.password;

  if (!values.username && !values.email && !values.nickname) {
    ctx.throw(400, "Nothing to update");
  }

  ctx.body = await ctx.portalData.update<PortalUserRecord>({
    collection: "users",
    filterByTk: id,
    values: toMutationValues(values),
  });
});

users.delete("/:id", async (ctx) => {
  const id = getParam(ctx.params, "id");
  if (!id) ctx.throw(400, "User id is required");

  ctx.body = await ctx.portalData.destroy({
    collection: "users",
    filterByTk: id,
  });
});

export const usersRouter = new Router();

usersRouter.use(users.routes(), users.allowedMethods());
