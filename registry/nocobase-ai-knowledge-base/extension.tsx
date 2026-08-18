import type { ReactNode } from "react";
import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { BookOpenText, Boxes, FileText, PanelsTopLeft, Search, Upload } from "lucide-react";
import "./locales";

const group = "ai-knowledge-base-components";
const resource = (name: string, label: string, i18nKey: string, list: string, icon: ReactNode) => ({
  name,
  list,
  meta: {
    parent: group,
    label,
    i18nKey,
    i18nOptions: { ns: "nocobase-ai-knowledge-base" },
    icon,
    acl: { type: "authenticated" as const },
  },
});

const knowledgeBaseExtension: AppExtension = {
  id: "nocobase-ai-knowledge-base",
  dev: {
    resources: [
      {
        name: group,
        meta: {
          label: "Knowledge base",
          i18nKey: "Knowledge base",
          i18nOptions: { ns: "nocobase-ai-knowledge-base" },
          icon: <BookOpenText />,
          description: "Five focused knowledge-base workflows and an isolated Knowledge base workspace.",
          acl: { type: "authenticated" },
        },
      },
      resource(
        "ai-knowledge-base-directory",
        "Knowledge bases",
        "Knowledge bases",
        "ai-knowledge-base/directory",
        <Boxes />,
      ),
      resource(
        "ai-knowledge-base-documents",
        "Documents",
        "Documents",
        "ai-knowledge-base/documents",
        <FileText />,
      ),
      resource(
        "ai-knowledge-base-upload",
        "Document upload",
        "Document upload",
        "ai-knowledge-base/upload",
        <Upload />,
      ),
      resource(
        "ai-knowledge-base-segments",
        "Segments",
        "Segments",
        "ai-knowledge-base/segments",
        <PanelsTopLeft />,
      ),
      resource(
        "ai-knowledge-base-hit-tests",
        "Hit tests",
        "Hit tests",
        "ai-knowledge-base/hit-tests",
        <Search />,
      ),
      resource(
        "ai-knowledge-base-workspace",
        "Knowledge base workspace",
        "Knowledge base workspace",
        "ai-knowledge-base/live",
        <BookOpenText />,
      ),
    ],
    routes: defineAppRoutes([
      {
        name: "development.ai-knowledge-base",
        path: "ai-knowledge-base",
        children: [
          {
            name: "development.ai-knowledge-base.index",
            index: true,
            lazy: () => import("./demo/knowledge-base-directory-page"),
          },
          {
            name: "development.ai-knowledge-base.directory",
            path: "directory",
            lazy: () => import("./demo/knowledge-base-directory-page"),
          },
          {
            name: "development.ai-knowledge-base.documents",
            path: "documents",
            lazy: () => import("./demo/documents-page"),
          },
          {
            name: "development.ai-knowledge-base.segments",
            path: "segments",
            lazy: () => import("./demo/segments-page"),
          },
          {
            name: "development.ai-knowledge-base.hit-tests",
            path: "hit-tests",
            lazy: () => import("./demo/hit-tests-page"),
          },
          {
            name: "development.ai-knowledge-base.upload",
            path: "upload",
            lazy: () => import("./demo/document-upload-page"),
          },
          {
            name: "development.ai-knowledge-base.workspace",
            path: "live",
            lazy: () => import("./live/plugin-prerequisite-route"),
            children: [
              {
                name: "development.ai-knowledge-base.workspace.index",
                index: true,
                lazy: () => import("./live/knowledge-bases-page"),
              },
              {
                name: "development.ai-knowledge-base.workspace.detail",
                path: ":knowledgeBaseKey",
                lazy: () => import("./live/knowledge-base-workspace-page"),
                children: [
                  {
                    name: "development.ai-knowledge-base.retrieval-result",
                    path: "retrieval/:resultIndex",
                    lazy: () => import("./live/retrieval-result-route"),
                  },
                  {
                    name: "development.ai-knowledge-base.document",
                    path: "documents/:documentId",
                    lazy: () => import("./live/document-page"),
                    children: [
                      {
                        name: "development.ai-knowledge-base.segment",
                        path: "segments/:segmentUid",
                        lazy: () => import("./live/segment-route"),
                      },
                    ],
                  },
                  {
                    name: "development.ai-knowledge-base.upload-live",
                    path: "upload",
                    lazy: () => import("./live/upload-controller"),
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  },
};

export default knowledgeBaseExtension;
