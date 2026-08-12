export type KnowledgeBaseType = "LOCAL" | "READONLY" | "EXTERNAL";
export type RecordId = string | number;

/**
 * User-side shape. Its fields are a positive allowlist that the Portal server
 * adapter must project before data reaches this package; a TypeScript type is
 * not itself a security boundary.
 */
export type KnowledgeBase = {
  id: RecordId;
  key: string;
  name: string;
  description?: string;
  knowledgeBaseType: KnowledgeBaseType;
  documentCount?: number;
  characterCount?: number;
  aiEmployeeCount?: number;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type KnowledgeBaseSegmentOptions = {
  enabled?: boolean;
  chunkSize?: number;
  chunkOverlap?: number;
};
export type KnowledgeBaseDocument = {
  id: RecordId;
  key?: string;
  title?: string;
  filename?: string;
  extname?: string;
  size?: number;
  mimetype?: string;
  /** Server-issued URL. Resolve it with nocobaseClient.resolveUrl() before linking. */
  url?: string;
  preview?: string;
  knowledgeBaseKey: string;
  characterCount?: number;
  segmentCount?: number;
  segmentOptions?: KnowledgeBaseSegmentOptions;
  segmentStatus?: string;
  segmentErrorMessage?: string;
  segmentUpdatedAt?: string;
  enabled?: boolean;
  indexStatus?: string;
  errorMessage?: string;
  createdById?: RecordId;
  createdAt?: string;
  updatedAt?: string;
};

/** Search metadata must be explicitly modeled by an application before it is rendered. */
export type KnowledgeBaseSearchResult = {
  id?: RecordId;
  title?: string;
  filename?: string;
  content?: string;
  score?: number;
  matchedQuestions?: string[];
};

export type KnowledgeBaseSegmentQuestion = {
  id?: RecordId;
  content: string;
  enabled?: boolean;
  hash?: string;
};

export type KnowledgeBaseSegment = {
  uid: string;
  position?: number;
  title?: string;
  preview?: string;
  content?: string;
  charLength?: number;
  questionCount?: number;
  enabled?: boolean;
  contentHash?: string;
  updatedAt?: string;
  questions?: KnowledgeBaseSegmentQuestion[];
};

export type ZipFilenameEncodingOption = {
  value: string;
  label: string;
  description?: string;
  isDefault?: boolean;
};

export type UploadConstraints = {
  acceptedExtensions?: string[];
  maxFileSizeBytes?: number;
};

export type UploadResult = KnowledgeBaseDocument | { taskId: RecordId; message?: string };

export type PagedRequestMode =
  | { mode: "all" }
  | { mode: "server"; page: number; pageSize: number };

export type KnowledgeBaseListRequest = PagedRequestMode & {
  query?: string;
  signal?: AbortSignal;
};

export type DocumentListRequest = PagedRequestMode & {
  knowledgeBaseKey: string;
  query?: string;
  signal?: AbortSignal;
};

export type SegmentListRequest = PagedRequestMode & {
  knowledgeBaseKey: string;
  documentId: RecordId;
  keyword?: string;
  enabled?: boolean;
  signal?: AbortSignal;
};

export type RetrievalRequest = {
  knowledgeBaseKey: string;
  query: string;
  topK?: number;
  score?: number;
  signal?: AbortSignal;
};

export type SegmentRequest = {
  knowledgeBaseKey: string;
  documentId: RecordId;
  segmentUid: string;
  signal?: AbortSignal;
};

export const isLocalKnowledgeBase = (value: KnowledgeBase) =>
  value.knowledgeBaseType === "LOCAL";

/** Experience-only gate. The Portal server must enforce the same rule. */
export const canMaintainKnowledgeBaseDocuments = (value: KnowledgeBase | undefined) =>
  !!value && isLocalKnowledgeBase(value);

export const isAsyncUploadResult = (
  value: UploadResult,
): value is { taskId: RecordId; message?: string } => "taskId" in value;

/** Ownership may tailor an affordance; it never authorizes a request. */
export const isOwnedDocument = (document: KnowledgeBaseDocument, userId?: RecordId) =>
  userId !== undefined && document.createdById === userId;

const processingDocumentStatuses = new Set(["PENDING", "PROCESSING"]);

export const isKnowledgeBaseDocumentProcessing = (
  document?: Pick<KnowledgeBaseDocument, "indexStatus" | "segmentStatus">,
) =>
  [document?.indexStatus, document?.segmentStatus].some(
    (status) =>
      typeof status === "string" && processingDocumentStatuses.has(status.toUpperCase()),
  );
