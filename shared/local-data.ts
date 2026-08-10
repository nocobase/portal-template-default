export interface LocalCacheReadResponse {
  key: string;
  value: unknown;
  hit: boolean;
  expiresAtEpochMs: number | null;
}

export interface LocalCacheWriteResponse {
  key: string;
  value: unknown;
  ttlMs?: number;
}

export interface LocalCacheDeleteResponse {
  deleted: boolean;
  key: string;
}

export interface LocalCacheClearResponse {
  cleared: boolean;
}

export interface LocalNoteRecord {
  id: number;
  portalId: string;
  title: string;
  body: string | null;
  createdAt: string;
}

export interface LocalNotesListResponse {
  portalId: string;
  notes: LocalNoteRecord[];
}

export interface LocalCachedNotesResponse extends LocalNotesListResponse {
  cache: {
    key: string;
    durationMs: number;
    expiresAtEpochMs: number | null;
    source: "cache-manager" | "sqlite";
  };
}

export interface LocalNoteResponse {
  note: LocalNoteRecord;
}

export interface LocalNoteDeleteResponse {
  deleted: Pick<LocalNoteRecord, "id" | "portalId" | "title">;
}

export interface LocalNoteMutationRequest {
  title?: string;
  body?: string | null;
}
