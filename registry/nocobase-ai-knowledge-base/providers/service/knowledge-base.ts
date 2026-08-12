import type { PagedResult } from "../utils";
import type {
  PagedRequestMode,
  DocumentListRequest,
  KnowledgeBase,
  KnowledgeBaseDocument,
  KnowledgeBaseSearchResult,
  KnowledgeBaseSegment,
  KnowledgeBaseSegmentOptions,
  RecordId,
  RetrievalRequest,
  SegmentListRequest,
  SegmentRequest,
  UploadConstraints,
  UploadResult,
  ZipFilenameEncodingOption,
} from "../types";

/**
 * Data contract for NocoBase AI Knowledge Base user-side actions. The default adapter
 * intentionally excludes administrator vector-store and configuration actions.
 * Server-side authorization and positive response projection remain authoritative.
 */
export interface KnowledgeBaseService {
  listKnowledgeBases(
    request: PagedRequestMode & { query?: string; signal?: AbortSignal },
  ): Promise<PagedResult<KnowledgeBase>>;
  getKnowledgeBase(key: string, signal?: AbortSignal): Promise<KnowledgeBase>;
  listDocuments(
    request: DocumentListRequest,
  ): Promise<PagedResult<KnowledgeBaseDocument>>;
  getDocument(request: {
    knowledgeBaseKey: string;
    documentId: RecordId;
    signal?: AbortSignal;
  }): Promise<KnowledgeBaseDocument>;
  runRetrieval(request: RetrievalRequest): Promise<KnowledgeBaseSearchResult[]>;
  listSegments(
    request: SegmentListRequest,
  ): Promise<PagedResult<KnowledgeBaseSegment>>;
  getSegment(request: SegmentRequest): Promise<KnowledgeBaseSegment | undefined>;

  /** Safe capability payload only: extensions and size, never storage/provider configuration. */
  getUploadConstraints(request: {
    knowledgeBaseKey: string;
    signal?: AbortSignal;
  }): Promise<UploadConstraints>;
  /** Request only after a ZIP is selected; an empty selection must remain omitted from upload. */
  getZipFilenameEncodingOptions(request: {
    knowledgeBaseKey: string;
    signal?: AbortSignal;
  }): Promise<ZipFilenameEncodingOption[]>;
  /**
   * The adapter owns multipart/S3 branching. Multipart must include knowledgeBaseKey
   * in both the query and FormData; an S3 finalize payload must be flat.
   */
  uploadDocument(request: {
    knowledgeBaseKey: string;
    file: File;
    zipFilenameEncodings?: string[];
  }): Promise<UploadResult>;

  vectorizeDocuments(request: {
    knowledgeBaseKey: string;
    documentIds?: RecordId[];
  }): Promise<unknown>;
  deleteDocuments(request: { documentIds: RecordId[] }): Promise<unknown>;
  updateSegment(request: {
    knowledgeBaseKey: string;
    documentId: RecordId;
    segmentUid: string;
    title?: string;
    content: string;
    contentHash: string;
  }): Promise<KnowledgeBaseSegment>;
  updateQuestions(request: {
    knowledgeBaseKey: string;
    documentId: RecordId;
    segmentUid: string;
    questions: KnowledgeBaseSegment["questions"];
    contentHash: string;
  }): Promise<KnowledgeBaseSegment>;
  setSegmentEnabled(request: {
    knowledgeBaseKey: string;
    documentId: RecordId;
    segmentUid: string;
    enabled: boolean;
  }): Promise<KnowledgeBaseSegment>;
  deleteSegment(request: {
    knowledgeBaseKey: string;
    documentId: RecordId;
    segmentUid: string;
  }): Promise<unknown>;
  regenerateSegments(request: {
    knowledgeBaseKey: string;
    documentId: RecordId;
    segmentOptions?: KnowledgeBaseSegmentOptions;
  }): Promise<unknown>;
}
