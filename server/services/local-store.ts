import fs from "node:fs";
import path from "node:path";
import SQLite from "better-sqlite3";
import { createCache, type Cache } from "cache-manager";
import { Kysely, SqliteDialect, type Generated } from "kysely";
import type {
  LocalCachedNotesResponse,
  LocalNoteRecord,
  LocalNoteDeleteResponse,
} from "../../shared/local-data.js";
import type { ServerRuntimeContext } from "../runtime.js";
import {
  registerLoggedDisposer,
  type PortalLoggers,
} from "./logger.js";

interface LocalDatabase {
  notes: LocalNoteTable;
}

interface LocalNoteTable {
  id: Generated<number>;
  portal_id: string;
  title: string;
  body: string | null;
  created_at: string;
}

interface LocalRuntimeStoreOptions {
  loggers?: PortalLoggers;
  runtime?: ServerRuntimeContext;
}

const NOTES_CACHE_KEY = "notes:list";
const NOTE_COLUMNS = [
  "id",
  "portal_id as portalId",
  "title",
  "body",
  "created_at as createdAt",
] as const;

const getRuntimePortalId = (runtime?: ServerRuntimeContext) =>
  runtime ? `${runtime.appName}:${runtime.portalName}` : "standalone:main";

const getRuntimeVersion = (runtime?: ServerRuntimeContext) =>
  runtime?.scope?.version ?? 1;

const getRuntimeBasePath = (runtime?: ServerRuntimeContext) =>
  runtime?.basePath || "/";

const getSqliteFilename = (runtime?: ServerRuntimeContext) => {
  const dataDir = runtime?.scope?.dataDir;
  if (!dataDir) return ":memory:";

  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "portal-local.sqlite");
};

const cacheKey = (runtime?: ServerRuntimeContext, key = NOTES_CACHE_KEY) =>
  `${getRuntimePortalId(runtime)}:v${getRuntimeVersion(runtime)}:${key}`;

export class LocalRuntimeStore {
  readonly portalId: string;
  readonly portalVersion: number;
  readonly basePath: string;

  private readonly cache: Cache;
  private readonly db: Kysely<LocalDatabase>;
  private disposed = false;
  private readonly ready: Promise<void>;

  constructor(private readonly options: LocalRuntimeStoreOptions = {}) {
    const sqlite = new SQLite(getSqliteFilename(options.runtime));

    this.portalId = getRuntimePortalId(options.runtime);
    this.portalVersion = getRuntimeVersion(options.runtime);
    this.basePath = getRuntimeBasePath(options.runtime);
    this.cache = createCache({
      ttl: 30_000,
      cacheId: `portal:${this.portalId}:v${this.portalVersion}`,
    });
    this.db = new Kysely<LocalDatabase>({
      dialect: new SqliteDialect({
        database: sqlite,
      }),
    });
    this.ready = this.bootstrapDatabase();

    registerLoggedDisposer(
      options.runtime?.scope,
      options.loggers,
      "local cache-manager and kysely sqlite store",
      async () => {
        await this.dispose();
      },
    );
  }

  async getCacheValue(key: string) {
    const namespacedKey = cacheKey(this.options.runtime, key);
    const value = await this.cache.get<unknown>(namespacedKey);
    const ttl = await this.cache.ttl(namespacedKey);

    return {
      key,
      value: value ?? null,
      hit: value !== undefined,
      expiresAtEpochMs: ttl ?? null,
    };
  }

  async setCacheValue(key: string, value: unknown, ttlMs?: number) {
    await this.cache.set(cacheKey(this.options.runtime, key), value, ttlMs);

    return {
      key,
      value,
      ttlMs,
    };
  }

  async deleteCacheValue(key: string) {
    await this.cache.del(cacheKey(this.options.runtime, key));

    return {
      deleted: true,
      key,
    };
  }

  async clearCache() {
    await this.cache.clear();

    return {
      cleared: true,
    };
  }

  async listNotes(): Promise<LocalNoteRecord[]> {
    await this.ready;

    return this.db
      .selectFrom("notes")
      .select(NOTE_COLUMNS)
      .orderBy("id", "asc")
      .execute();
  }

  async listCachedNotes(): Promise<LocalCachedNotesResponse> {
    const key = cacheKey(this.options.runtime, NOTES_CACHE_KEY);
    const startedAt = Date.now();
    const cachedNotes = await this.cache.get<LocalNoteRecord[]>(key);

    if (cachedNotes !== undefined) {
      return {
        portalId: this.portalId,
        notes: cachedNotes,
        cache: {
          key: NOTES_CACHE_KEY,
          durationMs: Date.now() - startedAt,
          expiresAtEpochMs: (await this.cache.ttl(key)) ?? null,
          source: "cache-manager",
        },
      };
    }

    await sleep(75, this.options.runtime?.signal);
    const notes = await this.listNotes();
    await this.cache.set(key, notes, 10_000);

    return {
      portalId: this.portalId,
      notes,
      cache: {
        key: NOTES_CACHE_KEY,
        durationMs: Date.now() - startedAt,
        expiresAtEpochMs: (await this.cache.ttl(key)) ?? null,
        source: "sqlite",
      },
    };
  }

  async createNote(input: { title: string; body: string | null }) {
    await this.ready;

    const note = await this.db
      .insertInto("notes")
      .values({
        portal_id: this.portalId,
        title: input.title,
        body: input.body,
        created_at: new Date().toISOString(),
      })
      .returning(NOTE_COLUMNS)
      .executeTakeFirstOrThrow();

    await this.cache.del(cacheKey(this.options.runtime, NOTES_CACHE_KEY));

    return note;
  }

  async getNote(id: number) {
    await this.ready;

    return this.db
      .selectFrom("notes")
      .select(NOTE_COLUMNS)
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async deleteNote(id: number): Promise<LocalNoteDeleteResponse["deleted"] | undefined> {
    await this.ready;

    const deleted = await this.db
      .deleteFrom("notes")
      .where("id", "=", id)
      .returning(["id", "portal_id as portalId", "title"])
      .executeTakeFirst();

    if (deleted) {
      await this.cache.del(cacheKey(this.options.runtime, NOTES_CACHE_KEY));
    }

    return deleted;
  }

  async dispose() {
    if (this.disposed) return;

    this.disposed = true;
    await this.ready.catch(() => undefined);
    await this.db.destroy();
    await this.cache.clear();
    await this.cache.disconnect();
  }

  private async bootstrapDatabase() {
    await this.db.schema
      .createTable("notes")
      .ifNotExists()
      .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
      .addColumn("portal_id", "text", (column) => column.notNull())
      .addColumn("title", "text", (column) => column.notNull())
      .addColumn("body", "text")
      .addColumn("created_at", "text", (column) => column.notNull())
      .execute();

    const existing = await this.db
      .selectFrom("notes")
      .select((builder) => builder.fn.count<number>("id").as("count"))
      .executeTakeFirst();

    if (Number(existing?.count ?? 0) > 0) return;

    await this.db
      .insertInto("notes")
      .values([
        {
          portal_id: this.portalId,
          title: "First sqlite note",
          body: "This row lives in the Portal BFF and is queried through Kysely.",
          created_at: new Date().toISOString(),
        },
        {
          portal_id: this.portalId,
          title: "Cleanup demo",
          body: "When the Portal is destroyed, the Kysely instance and cache-manager cache are disposed through the Portal scope.",
          created_at: new Date().toISOString(),
        },
      ])
      .execute();
  }
}

export const parseTtlMs = (value: string | undefined): number | undefined => {
  if (!value) return undefined;

  const ttl = Number(value);
  return Number.isInteger(ttl) && ttl > 0 ? ttl : undefined;
};

export const parsePositiveInteger = (value: string): number | undefined => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

export const parseNoteInput = (input: unknown) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;

  const record = input as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (!title) return undefined;

  if (
    record.body !== undefined &&
    record.body !== null &&
    typeof record.body !== "string"
  ) {
    return undefined;
  }

  return {
    title,
    body: typeof record.body === "string" ? record.body : null,
  };
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}
