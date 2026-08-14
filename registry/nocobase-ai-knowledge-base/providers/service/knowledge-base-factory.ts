import { normalizePagedResult, type PagedResult } from "../utils";
import type { KnowledgeBaseService } from "./knowledge-base";
import type {
  KnowledgeBase,
  KnowledgeBaseDocument,
  KnowledgeBaseSearchResult,
  KnowledgeBaseSegment,
  KnowledgeBaseSegmentOptions,
  KnowledgeBaseSegmentQuestion,
  KnowledgeBaseType,
  RecordId,
  UploadConstraints,
  UploadResult,
  ZipFilenameEncodingOption,
} from "../types";

/**
 * The AI Knowledge Base plugin's user-side actions apply role association,
 * record ownership, LOCAL-write, and server response allowlist policies. This
 * adapter is a complete Portal example for that contract, not an adapter for
 * administrator-only vector-store or knowledge-base configuration actions.
 */
type ActionOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | Array<string | number | boolean> | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  unwrap?: "data" | "deep-data" | "none";
};
type NocoBaseKnowledgeBaseClient = {
  action<T>(resource: string, action: string, options?: ActionOptions): Promise<T>;
};
type UnknownRecord = Record<string, unknown>;
type UploadStorage = { id: RecordId; type?: string; maxFileSizeBytes?: number };

const supportedExtensions = [".doc", ".docx", ".md", ".pdf", ".txt", ".zip"];

const isRecord = (value: unknown): value is UnknownRecord =>
  !!value && typeof value === "object" && !Array.isArray(value);

const responseData = (value: unknown) =>
  isRecord(value) && "data" in value ? value.data : value;

const text = (value: unknown) => (typeof value === "string" ? value : undefined);
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const boolean = (value: unknown) => (typeof value === "boolean" ? value : undefined);
const recordId = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? value : undefined;

const required = <T>(value: T | undefined, field: string): T => {
  if (value === undefined) {
    throw new Error(`Knowledge Base API response is missing required field: ${field}.`);
  }
  return value;
};

const optionalDate = (value: unknown) => text(value);

function toSegmentOptions(value: unknown): KnowledgeBaseSegmentOptions | undefined {
  const item = isRecord(value) ? value : {};
  const chunkSize = number(item.chunkSize);
  const chunkOverlap = number(item.chunkOverlap);
  const options: KnowledgeBaseSegmentOptions = {
    ...(boolean(item.enabled) !== undefined ? { enabled: boolean(item.enabled) } : {}),
    ...(chunkSize !== undefined && chunkSize > 0 ? { chunkSize } : {}),
    ...(chunkOverlap !== undefined && chunkOverlap >= 0 ? { chunkOverlap } : {}),
  };
  return Object.keys(options).length ? options : undefined;
}

function toKnowledgeBase(value: unknown): KnowledgeBase {
  const item = isRecord(value) ? value : {};
  const knowledgeBaseType = text(item.knowledgeBaseType);
  if (
    knowledgeBaseType !== "LOCAL" &&
    knowledgeBaseType !== "READONLY" &&
    knowledgeBaseType !== "EXTERNAL"
  ) {
    throw new Error("Knowledge Base API response has an invalid knowledgeBaseType.");
  }
  return {
    id: required(recordId(item.id), "id"),
    key: required(text(item.key), "key"),
    name: required(text(item.name), "name"),
    knowledgeBaseType: knowledgeBaseType as KnowledgeBaseType,
    enabled: required(boolean(item.enabled), "enabled"),
    ...(text(item.description) ? { description: text(item.description) } : {}),
    ...(number(item.documentCount) !== undefined ? { documentCount: number(item.documentCount) } : {}),
    ...(number(item.characterCount) !== undefined ? { characterCount: number(item.characterCount) } : {}),
    ...(number(item.aiEmployeeCount) !== undefined ? { aiEmployeeCount: number(item.aiEmployeeCount) } : {}),
    ...(optionalDate(item.createdAt) ? { createdAt: optionalDate(item.createdAt) } : {}),
    ...(optionalDate(item.updatedAt) ? { updatedAt: optionalDate(item.updatedAt) } : {}),
  };
}

function toDocument(value: unknown): KnowledgeBaseDocument {
  const item = isRecord(value) ? value : {};
  const segmentOptions = toSegmentOptions(item.segmentOptions);
  return {
    id: required(recordId(item.id), "document.id"),
    knowledgeBaseKey: required(text(item.knowledgeBaseKey), "document.knowledgeBaseKey"),
    ...(text(item.key) ? { key: text(item.key) } : {}),
    ...(text(item.title) ? { title: text(item.title) } : {}),
    ...(text(item.filename) ? { filename: text(item.filename) } : {}),
    ...(text(item.extname) ? { extname: text(item.extname) } : {}),
    ...(number(item.size) !== undefined ? { size: number(item.size) } : {}),
    ...(text(item.mimetype) ? { mimetype: text(item.mimetype) } : {}),
    ...(text(item.url) ? { url: text(item.url) } : {}),
    ...(text(item.preview) ? { preview: text(item.preview) } : {}),
    ...(number(item.characterCount) !== undefined ? { characterCount: number(item.characterCount) } : {}),
    ...(number(item.segmentCount) !== undefined ? { segmentCount: number(item.segmentCount) } : {}),
    ...(segmentOptions ? { segmentOptions } : {}),
    ...(text(item.segmentStatus) ? { segmentStatus: text(item.segmentStatus) } : {}),
    ...(text(item.segmentErrorMessage) ? { segmentErrorMessage: text(item.segmentErrorMessage) } : {}),
    ...(optionalDate(item.segmentUpdatedAt) ? { segmentUpdatedAt: optionalDate(item.segmentUpdatedAt) } : {}),
    ...(boolean(item.enabled) !== undefined ? { enabled: boolean(item.enabled) } : {}),
    ...(text(item.indexStatus) ? { indexStatus: text(item.indexStatus) } : {}),
    ...(text(item.errorMessage) ? { errorMessage: text(item.errorMessage) } : {}),
    ...(item.accessAbility === "readOnly" || item.accessAbility === "readWrite"
      ? { accessAbility: item.accessAbility }
      : {}),
    ...(recordId(item.createdById) !== undefined ? { createdById: recordId(item.createdById) } : {}),
    ...(optionalDate(item.createdAt) ? { createdAt: optionalDate(item.createdAt) } : {}),
    ...(optionalDate(item.updatedAt) ? { updatedAt: optionalDate(item.updatedAt) } : {}),
  };
}

function toQuestion(value: unknown): KnowledgeBaseSegmentQuestion | undefined {
  const item = isRecord(value) ? value : {};
  const content = text(item.content);
  if (!content) return undefined;
  return {
    content,
    ...(recordId(item.id) !== undefined ? { id: recordId(item.id) } : {}),
    ...(boolean(item.enabled) !== undefined ? { enabled: boolean(item.enabled) } : {}),
    ...(text(item.hash) ? { hash: text(item.hash) } : {}),
  };
}

function toSegment(value: unknown): KnowledgeBaseSegment {
  const item = isRecord(value) ? value : {};
  const questions = Array.isArray(item.questions)
    ? item.questions.map(toQuestion).filter((question): question is KnowledgeBaseSegmentQuestion => !!question)
    : undefined;
  return {
    uid: required(text(item.uid), "segment.uid"),
    ...(number(item.position) !== undefined ? { position: number(item.position) } : {}),
    ...(text(item.title) ? { title: text(item.title) } : {}),
    ...(text(item.preview) ? { preview: text(item.preview) } : {}),
    ...(text(item.content) ? { content: text(item.content) } : {}),
    ...(number(item.charLength) !== undefined ? { charLength: number(item.charLength) } : {}),
    ...(number(item.questionCount) !== undefined ? { questionCount: number(item.questionCount) } : {}),
    ...(boolean(item.enabled) !== undefined ? { enabled: boolean(item.enabled) } : {}),
    ...(text(item.contentHash) ? { contentHash: text(item.contentHash) } : {}),
    ...(optionalDate(item.updatedAt) ? { updatedAt: optionalDate(item.updatedAt) } : {}),
    ...(questions ? { questions } : {}),
  };
}

function toSearchResult(value: unknown): KnowledgeBaseSearchResult {
  const item = isRecord(value) ? value : {};
  return {
    ...(recordId(item.id) !== undefined ? { id: recordId(item.id) } : {}),
    ...(text(item.title) ? { title: text(item.title) } : {}),
    ...(text(item.filename) ? { filename: text(item.filename) } : {}),
    ...(text(item.content) ? { content: text(item.content) } : {}),
    ...(number(item.score) !== undefined ? { score: number(item.score) } : {}),
    ...(Array.isArray(item.matchedQuestions)
      ? { matchedQuestions: item.matchedQuestions.filter((question): question is string => typeof question === "string") }
      : {}),
  };
}

const action = (
  client: NocoBaseKnowledgeBaseClient,
  resource: string,
  name: string,
  options: ActionOptions = {},
) => client.action<unknown>(resource, name, { ...options, unwrap: "none" });

const listQuery = (
  request: { mode: "all" } | { mode: "server"; page: number; pageSize: number },
) =>
  request.mode === "all"
    ? { paginate: false }
    : { page: request.page, pageSize: request.pageSize };

const mapPagedResult = <T>(
  payload: unknown,
  fallback: { page: number; pageSize: number },
  mapper: (value: unknown) => T,
): PagedResult<T> => {
  const normalized = normalizePagedResult<unknown>(payload, fallback);
  return { ...normalized, rows: normalized.rows.map(mapper) };
};

const storageFromPayload = (payload: unknown): UploadStorage => {
  const value = responseData(payload);
  const storage = isRecord(value) ? value : {};
  const rules = isRecord(storage.rules) ? storage.rules : {};
  return {
    id: required(recordId(storage.id), "uploadStorage.id"),
    ...(text(storage.type) ? { type: text(storage.type) } : {}),
    ...(number(rules.size) !== undefined ? { maxFileSizeBytes: number(rules.size) } : {}),
  };
};

const extensionOf = (file: File) => {
  const dot = file.name.lastIndexOf(".");
  return dot < 0 ? "" : file.name.slice(dot).toLowerCase();
};

export function createKnowledgeBaseService(
  client: NocoBaseKnowledgeBaseClient,
): KnowledgeBaseService {
  const getUploadStorage = async (knowledgeBaseKey: string, signal?: AbortSignal) =>
    storageFromPayload(
      await action(client, "aiKnowledgeBaseDocs", "getUploadStorage", {
        method: "GET",
        query: { knowledgeBaseKey },
        signal,
      }),
    );

  return {
    async listKnowledgeBases(request) {
      const payload = await action(client, "aiKnowledgeBase", "list", {
        query: {
          ...listQuery(request),
          ...(request.query ? { "filter[name][$includes]": request.query } : {}),
        },
        signal: request.signal,
      });
      return mapPagedResult(
        payload,
        request.mode === "all" ? { page: 1, pageSize: 20 } : request,
        toKnowledgeBase,
      );
    },

    async getKnowledgeBase(key, signal) {
      // The Live route uses the public knowledge-base key, while filterByTk targets the bigint primary key.
      const payload = await action(client, "aiKnowledgeBase", "list", {
        query: { paginate: false, "filter[key]": key },
        signal,
      });
      const result = mapPagedResult(payload, { page: 1, pageSize: 1 }, toKnowledgeBase);
      const knowledgeBase = result.rows.find((item) => item.key === key);
      if (!knowledgeBase) {
        throw new Error("Knowledge base was not found or is not accessible.");
      }
      return knowledgeBase;
    },

    async listDocuments(request) {
      const payload = await action(client, "aiKnowledgeBaseDocs", "list", {
        query: {
          ...listQuery(request),
          "filter[knowledgeBaseKey]": request.knowledgeBaseKey,
          ...(request.query ? { "filter[title][$includes]": request.query } : {}),
        },
        signal: request.signal,
      });
      return mapPagedResult(
        payload,
        request.mode === "all" ? { page: 1, pageSize: 20 } : request,
        toDocument,
      );
    },

    async getDocument(request) {
      const document = toDocument(
        responseData(
          await action(client, "aiKnowledgeBaseDocs", "get", {
            query: { filterByTk: request.documentId },
            signal: request.signal,
          }),
        ),
      );
      if (document.knowledgeBaseKey !== request.knowledgeBaseKey) {
        throw new Error("The returned document does not belong to the requested knowledge base.");
      }
      return document;
    },

    async runRetrieval(request) {
      const payload = responseData(
        await action(client, "aiKnowledgeBase", "runHitTest", {
          method: "POST",
          body: {
            knowledgeBaseKey: request.knowledgeBaseKey,
            query: request.query,
            topK: request.topK,
            score: request.score,
          },
          signal: request.signal,
        }),
      );
      return Array.isArray(payload) ? payload.map(toSearchResult) : [];
    },

    async listSegments(request) {
      const payload = await action(client, "aiKnowledgeBaseDocSegments", "list", {
        query: {
          ...listQuery(request),
          knowledgeBaseKey: request.knowledgeBaseKey,
          knowledgeBaseDocsId: request.documentId,
          ...(request.keyword ? { keyword: request.keyword } : {}),
          ...(request.enabled !== undefined ? { enabled: request.enabled } : {}),
        },
        signal: request.signal,
      });
      return mapPagedResult(
        payload,
        request.mode === "all" ? { page: 1, pageSize: 20 } : request,
        toSegment,
      );
    },

    async getSegment(request) {
      const payload = responseData(
        await action(client, "aiKnowledgeBaseDocSegments", "getSegment", {
          method: "GET",
          query: {
            knowledgeBaseKey: request.knowledgeBaseKey,
            knowledgeBaseDocsId: request.documentId,
            segmentUid: request.segmentUid,
          },
          signal: request.signal,
        }),
      );
      return payload === undefined || payload === null ? undefined : toSegment(payload);
    },

    async getUploadConstraints(request): Promise<UploadConstraints> {
      const storage = await getUploadStorage(request.knowledgeBaseKey, request.signal);
      return {
        acceptedExtensions: supportedExtensions,
        ...(storage.maxFileSizeBytes ? { maxFileSizeBytes: storage.maxFileSizeBytes } : {}),
      };
    },

    async getZipFilenameEncodingOptions(request) {
      const payload = responseData(
        await action(client, "aiKnowledgeBaseDocs", "getZipFilenameEncodingOptions", {
          method: "GET",
          signal: request.signal,
        }),
      );
      const result = isRecord(payload) ? payload : {};
      return Array.isArray(result.options)
        ? result.options.flatMap((option): ZipFilenameEncodingOption[] => {
            const item = isRecord(option) ? option : {};
            const value = text(item.value);
            const label = text(item.label);
            if (!value || !label) return [];
            return [
              {
                value,
                label,
                ...(text(item.description) ? { description: text(item.description) } : {}),
                ...(boolean(item.isDefault) !== undefined ? { isDefault: boolean(item.isDefault) } : {}),
              },
            ];
          })
        : [];
    },

    async uploadDocument(request): Promise<UploadResult> {
      const storage = await getUploadStorage(request.knowledgeBaseKey);
      if (storage.maxFileSizeBytes && request.file.size > storage.maxFileSizeBytes) {
        throw new Error("This file exceeds the server upload limit.");
      }
      if (!supportedExtensions.includes(extensionOf(request.file))) {
        throw new Error(`Unsupported file type: ${extensionOf(request.file) || "no extension"}.`);
      }

      let payload: unknown;
      if (storage.type === "s3-compatible") {
        const presigned = responseData(
          await action(client, "storages", "createPresignedUrl", {
            method: "POST",
            body: {
              name: request.file.name,
              size: request.file.size,
              type: request.file.type,
              storageId: storage.id,
              storageType: storage.type,
            },
          }),
        );
        const upload = isRecord(presigned) ? presigned : {};
        const putUrl = text(upload.putUrl);
        const fileInfo = isRecord(upload.fileInfo) ? upload.fileInfo : {};
        if (!putUrl) throw new Error("The upload service did not return a presigned upload URL.");
        const put = await fetch(putUrl, {
          method: "PUT",
          headers: request.file.type ? { "Content-Type": request.file.type } : undefined,
          body: request.file,
        });
        if (!put.ok) throw new Error(`File upload failed (${put.status}).`);
        payload = await action(client, "aiKnowledgeBaseDocs", "upload", {
          method: "POST",
          query: { knowledgeBaseKey: request.knowledgeBaseKey },
          body: {
            title: text(fileInfo.title) || request.file.name,
            filename: required(text(fileInfo.key), "presignedUpload.fileInfo.key"),
            extname: text(fileInfo.extname) || extensionOf(request.file),
            path: "",
            size: number(fileInfo.size) ?? request.file.size,
            url: required(text(fileInfo.url), "presignedUpload.fileInfo.url"),
            mimetype: text(fileInfo.mimetype) || request.file.type,
            storageId: storage.id,
            meta: {},
            ...(request.zipFilenameEncodings?.length
              ? { zipFilenameEncoding: request.zipFilenameEncodings }
              : {}),
          },
        });
      } else {
        const formData = new FormData();
        formData.append("knowledgeBaseKey", request.knowledgeBaseKey);
        for (const encoding of request.zipFilenameEncodings ?? []) {
          formData.append("zipFilenameEncoding[]", encoding);
        }
        formData.append("file", request.file);
        payload = await action(client, "aiKnowledgeBaseDocs", "upload", {
          method: "POST",
          query: { knowledgeBaseKey: request.knowledgeBaseKey },
          body: formData,
        });
      }

      const result = responseData(payload);
      const record = isRecord(result) ? result : {};
      if (recordId(record.taskId) !== undefined) {
        return {
          taskId: recordId(record.taskId)!,
          ...(text(record.message) ? { message: text(record.message) } : {}),
        };
      }
      return toDocument(result);
    },

    vectorizeDocuments: ({ knowledgeBaseKey, documentIds }) =>
      action(client, "aiKnowledgeBaseDocs", "vectorization", {
        method: "POST",
        query: {
          knowledgeBaseKey,
          ...(documentIds?.length ? { "id[]": documentIds } : {}),
        },
      }),

    deleteDocuments: ({ documentIds }) =>
      action(client, "aiKnowledgeBaseDocs", "destroy", {
        method: "POST",
        query: { "filterByTk[]": documentIds },
      }),

    updateSegment: async ({ documentId, ...request }) =>
      toSegment(
        responseData(
          await action(client, "aiKnowledgeBaseDocSegments", "updateSegment", {
            method: "POST",
            body: { ...request, knowledgeBaseDocsId: documentId },
          }),
        ),
      ),

    updateQuestions: async ({ documentId, ...request }) =>
      toSegment(
        responseData(
          await action(client, "aiKnowledgeBaseDocSegments", "updateQuestions", {
            method: "POST",
            body: { ...request, knowledgeBaseDocsId: documentId },
          }),
        ),
      ),

    setSegmentEnabled: async ({ knowledgeBaseKey, documentId, segmentUid, enabled }) =>
      toSegment(
        responseData(
          await action(client, "aiKnowledgeBaseDocSegments", "setEnabled", {
            method: "POST",
            body: { knowledgeBaseKey, knowledgeBaseDocsId: documentId, segmentUid, enabled },
          }),
        ),
      ),

    deleteSegment: ({ knowledgeBaseKey, documentId, segmentUid }) =>
      action(client, "aiKnowledgeBaseDocSegments", "deleteSegment", {
        method: "POST",
        body: { knowledgeBaseKey, knowledgeBaseDocsId: documentId, segmentUid },
      }),

    regenerateSegments: ({ knowledgeBaseKey, documentId, segmentOptions }) =>
      action(client, "aiKnowledgeBaseDocSegments", "regenerate", {
        method: "POST",
        body: {
          knowledgeBaseKey,
          knowledgeBaseDocsId: documentId,
          ...(segmentOptions ? { segmentOptions } : {}),
        },
      }),
  };
}
