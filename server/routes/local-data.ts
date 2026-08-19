import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type {
  LocalCacheClearResponse,
  LocalCacheDeleteResponse,
  LocalCacheReadResponse,
  LocalCacheWriteResponse,
  LocalCachedNotesResponse,
  LocalNoteDeleteResponse,
  LocalNoteMutationRequest,
  LocalNoteResponse,
  LocalNotesListResponse,
} from "../../shared/local-data.js";
import {
  LocalRuntimeStore,
  parseNoteInput,
  parsePositiveInteger,
  parseTtlMs,
} from "../services/local-store.js";

type LocalDataEnv = {
  Variables: {
    localStore: LocalRuntimeStore;
  };
};

const readCacheValue = (input: unknown) => {
  if (input && typeof input === "object" && "value" in input) {
    return (input as { value?: unknown }).value;
  }

  return input;
};

export const createLocalDataRouter = (localStore: LocalRuntimeStore) => {
  const router = new Hono<LocalDataEnv>();

  router.use("*", async (ctx, next) => {
    ctx.set("localStore", localStore);
    await next();
  });

  router.get("/cache-manager/:key", async (ctx) => {
    return ctx.json(
      (await ctx
        .get("localStore")
        .getCacheValue(ctx.req.param("key"))) satisfies LocalCacheReadResponse,
    );
  });

  router.put("/cache-manager/:key", async (ctx) => {
    const input = await ctx.req.json().catch(() => null);
    const ttlMs = parseTtlMs(ctx.req.query("ttlMs"));

    return ctx.json(
      (await ctx.get("localStore").setCacheValue(
        ctx.req.param("key"),
        readCacheValue(input),
        ttlMs,
      )) satisfies LocalCacheWriteResponse,
    );
  });

  router.delete("/cache-manager/:key", async (ctx) => {
    return ctx.json(
      (await ctx
        .get("localStore")
        .deleteCacheValue(ctx.req.param("key"))) satisfies LocalCacheDeleteResponse,
    );
  });

  router.post("/cache-manager/clear", async (ctx) => {
    return ctx.json(
      (await ctx.get("localStore").clearCache()) satisfies LocalCacheClearResponse,
    );
  });

  router.get("/notes", async (ctx) => {
    const store = ctx.get("localStore");

    return ctx.json({
      portalId: store.portalId,
      notes: await store.listNotes(),
    } satisfies LocalNotesListResponse);
  });

  router.get("/notes/cached", async (ctx) => {
    return ctx.json(
      (await ctx.get("localStore").listCachedNotes()) satisfies LocalCachedNotesResponse,
    );
  });

  router.post("/notes", async (ctx) => {
    const input = parseNoteInput(
      (await ctx.req.json().catch(() => undefined)) satisfies
        | Partial<LocalNoteMutationRequest>
        | undefined,
    );

    if (!input) {
      throw new HTTPException(400, {
        message:
          "Expected JSON body with a non-empty string title and optional string body",
      });
    }

    return ctx.json(
      { note: await ctx.get("localStore").createNote(input) } satisfies LocalNoteResponse,
      201,
    );
  });

  router.get("/notes/:id", async (ctx) => {
    const id = parsePositiveInteger(ctx.req.param("id"));
    if (!id) throw new HTTPException(400, { message: "Note id must be a positive integer" });

    const note = await ctx.get("localStore").getNote(id);
    if (!note) throw new HTTPException(404, { message: `Note ${id} was not found` });

    return ctx.json({ note } satisfies LocalNoteResponse);
  });

  router.delete("/notes/:id", async (ctx) => {
    const id = parsePositiveInteger(ctx.req.param("id"));
    if (!id) throw new HTTPException(400, { message: "Note id must be a positive integer" });

    const deleted = await ctx.get("localStore").deleteNote(id);
    if (!deleted) throw new HTTPException(404, { message: `Note ${id} was not found` });

    return ctx.json({ deleted } satisfies LocalNoteDeleteResponse);
  });

  return router;
};
