import type { RouteObject } from "react-router";

export const knowledgeBaseDevRoot = "/dev/ai-knowledge-base";

export const knowledgeBaseDemoRoutes = {
  index: knowledgeBaseDevRoot,
  directory: `${knowledgeBaseDevRoot}/directory`,
  documents: `${knowledgeBaseDevRoot}/documents`,
  segments: `${knowledgeBaseDevRoot}/segments`,
  hitTests: `${knowledgeBaseDevRoot}/hit-tests`,
  upload: `${knowledgeBaseDevRoot}/upload`,
};

export const knowledgeBaseLiveRoutes = {
  list: `${knowledgeBaseDevRoot}/live`,
  workspace: (knowledgeBaseKey: string) =>
    `${knowledgeBaseDevRoot}/live/${encodeURIComponent(knowledgeBaseKey)}`,
  document: (knowledgeBaseKey: string, documentId: string | number) =>
    `${knowledgeBaseDevRoot}/live/${encodeURIComponent(knowledgeBaseKey)}/documents/${encodeURIComponent(String(documentId))}`,
  segment: (
    knowledgeBaseKey: string,
    documentId: string | number,
    segmentUid: string,
  ) =>
    `${knowledgeBaseDevRoot}/live/${encodeURIComponent(knowledgeBaseKey)}/documents/${encodeURIComponent(String(documentId))}/segments/${encodeURIComponent(segmentUid)}`,
  upload: (knowledgeBaseKey: string) =>
    `${knowledgeBaseDevRoot}/live/${encodeURIComponent(knowledgeBaseKey)}/upload`,
  retrieval: (knowledgeBaseKey: string, resultIndex: number) =>
    `${knowledgeBaseDevRoot}/live/${encodeURIComponent(knowledgeBaseKey)}/retrieval/${encodeURIComponent(String(resultIndex))}`,
};

export const knowledgeBaseRoutes: RouteObject[] = [];
