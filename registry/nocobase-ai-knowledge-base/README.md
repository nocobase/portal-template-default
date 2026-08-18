# NocoBase AI Knowledge Base Registry

A development-only Portal Registry integration for the user-facing NocoBase AI Knowledge Base experience. It provides:

- a user-side service contract and default NocoBase adapter;
- URL-independent resource hooks for knowledge bases, documents, and segments;
- controlled directory, document, retrieval, segment, and upload components;
- five deterministic, API-free development workflows; and
- a real Knowledge base workspace example with URL-addressable document, retrieval, upload, and nested segment surfaces.

It does **not** add production routes, configure AI providers, embedding models, storage engines, or vector databases, and it does not make client-side authorization authoritative.

## Registry items

Choose the smallest Registry item that fits the consuming Portal:

| Registry item | Intended use | Published source |
| --- | --- | --- |
| `@nocobase/ai-knowledge-base-providers` | Build a Portal-owned integration or custom page | `providers/` and `hooks/` |
| `@nocobase/ai-knowledge-base-components` | Compose controlled Knowledge Base UI into an existing page | `components/` and `locales/`; installs the provider item |
| `@nocobase/ai-knowledge-base` | Install the complete development experience | Demo and Knowledge base workspace pages, development extension/routes, locales, this README; installs the component item |

```bash
pnpm exec shadcn add @nocobase/ai-knowledge-base-providers
pnpm exec shadcn add @nocobase/ai-knowledge-base-components
pnpm exec shadcn add @nocobase/ai-knowledge-base
```

All items install under `src/extensions/nocobase-ai-knowledge-base`. Tests are excluded from published payloads.

## Source layout

```text
registry/nocobase-ai-knowledge-base/
├── providers/
│   ├── context.tsx                    # Service context, provider, and accessor
│   ├── types.ts                       # User-side DTOs and UX-only helpers
│   ├── utils.ts                       # PagedResult and error normalization
│   └── service/
│       ├── knowledge-base.ts          # KnowledgeBaseService contract
│       ├── knowledge-base-factory.ts  # NocoBase user-action adapter
│       └── index.ts                   # Factory and default service
├── hooks/
│   ├── index.ts                       # Three public resource-hook re-exports
│   ├── use-knowledge-base.ts          # Directory, detail, and retrieval
│   ├── use-knowledge-base-document.ts # Document lists/detail and upload metadata
│   ├── use-knowledge-base-segment.ts  # Segment list and detail
│   └── shared.ts                      # Service identity and stale-safe requests
├── components/                        # Controlled UI components
├── demo/                              # Deterministic API-free workflows
├── live/                              # Real user-side Knowledge base workspace
├── locales/                           # Namespace catalogs and useT()
├── extension.tsx                      # Development resources and routes
├── routes.ts                          # Reusable encoded route builders
└── index.ts                           # Root public exports
```

`providers/utils.ts` is the only pagination/error utility module. Do not restore legacy `paged-result.ts`, `errors.ts`, data-source, or runtime paths.

## Public imports

Providers and hooks are sibling public entry points:

```tsx
import {
  createKnowledgeBaseService,
  knowledgeBaseService,
  KnowledgeBaseServiceProvider,
  normalizeKnowledgeBaseError,
  type KnowledgeBaseService,
  type PagedResult,
} from "@/extensions/nocobase-ai-knowledge-base/providers";

import {
  useKnowledgeBase,
  useKnowledgeBaseDocument,
  useKnowledgeBaseSegment,
} from "@/extensions/nocobase-ai-knowledge-base/hooks";

import {
  DocumentTable,
  KnowledgeBaseHitTests,
  KnowledgeBaseSwitchableDirectory,
  SegmentEditor,
  SegmentTable,
  UploadDocumentDialog,
} from "@/extensions/nocobase-ai-knowledge-base/components";
```

`hooks/index.ts` exports only the three resource hooks. Their lower-level requests and `useRequest()` lifecycle are implementation details, not application-facing APIs.

## Service layer

`KnowledgeBaseService` is the application boundary between the UI and transport. It covers only user-facing operations:

- knowledge-base listing and detail lookup;
- document listing, detail lookup, upload constraints, ZIP filename encodings, upload, re-indexing, and deletion;
- retrieval tests;
- segment listing, detail lookup, content and related-question updates, enabled state, deletion, and regeneration.

The default `knowledgeBaseService` is created with the Portal SDK `nocobaseClient`, so compatible servers require no provider setup. Override it only for a deployment-specific proxy, a version-pinned server adapter, or a test double:

```tsx
import {
  KnowledgeBaseServiceProvider,
  type KnowledgeBaseService,
} from "@/extensions/nocobase-ai-knowledge-base/providers";

const service: KnowledgeBaseService = createPortalKnowledgeBaseService();

export function AppRoot({ children }: { children: React.ReactNode }) {
  return (
    <KnowledgeBaseServiceProvider service={service}>
      {children}
    </KnowledgeBaseServiceProvider>
  );
}
```

The default adapter calls only user-side `aiKnowledgeBase*` actions. It intentionally excludes administrator vector-store, provider, embedding, storage, and configuration actions. Responses are projected into explicit DTOs—including the server-computed document `accessAbility`—pagination envelopes are normalized, server file URLs remain server-owned, and upload branching between multipart and presigned flows stays inside the adapter.

Important payload contracts include:

- knowledge-base lookup uses the public key filter rather than a bigint primary-key lookup;
- retrieval and segment mutation bodies are flat, not nested under `values`;
- multipart upload carries `knowledgeBaseKey` in both query and `FormData`;
- selected ZIP encodings are sent only when explicitly chosen;
- segment writes carry the latest `contentHash`.

## Resource hooks

The hooks read the active service from `KnowledgeBaseServiceProvider`, own stable service identity, abort obsolete requests, discard stale responses, clear data when a logical resource identity changes, and expose `retry()`.

They do not import React Router and do not inspect URLs, route params, search params, or location state. A route component may parse its own navigation state, but it must pass plain domain values and explicit `enabled` flags to the hooks.

### `useKnowledgeBase()`

Owns knowledge-base directory, detail, and retrieval state.

```tsx
const state = useKnowledgeBase({
  knowledgeBaseKey,
  directory: {
    mode: "paginated", // "all" | "paginated" | "infinite"
    page,
    pageSize: 20,
    query,
  },
  retrieval: {
    enabled: hasSubmittedQuery,
    query: submittedQuery,
    topK: 4,
    score: 0.6,
  },
});
```

Only the selected directory mode receives the service and sends a request; `all`, `paginated`, and `infinite` do not run concurrently. Infinite mode fetches one server page at a time and accumulates rows. Retrieval remains disabled until the knowledge-base detail is available and the query is non-empty.

A parent can supply an already-loaded record to avoid a duplicate detail request:

```tsx
useKnowledgeBase({
  knowledgeBaseKey,
  knowledgeBase: workspaceContext.knowledgeBase,
});
```

Returned state includes:

- `service`;
- `knowledgeBase` async state;
- `directory.all`, `directory.paginated`, and `directory.infinite` state;
- `retrieval` async state.

### `useKnowledgeBaseDocument()`

Owns document collections, one document, and upload metadata.

```tsx
const state = useKnowledgeBaseDocument({
  knowledgeBaseKey,
  documentId,
  documents: {
    enabled: isLocal,
    mode: "paginated", // "all" | "paginated"
    page,
    pageSize: 20,
    query,
  },
  document: { enabled: isLocal },
  upload: {
    enabled: uploadOpen,
    includeConstraints: true,
    includeZipEncodingOptions: selectedFileIsZip,
  },
});
```

Returned state includes `documents.all`, `documents.paginated`, `document`, `upload.constraints`, `upload.zipEncodingOptions`, and `service`. ZIP encoding options should be enabled only after a ZIP is selected.

### `useKnowledgeBaseSegment()`

Owns a segment list and one segment detail.

```tsx
const state = useKnowledgeBaseSegment({
  knowledgeBaseKey,
  documentId,
  segmentUid,
  segments: {
    enabled: drawerOpen,
    page,
    pageSize: 20,
    keyword,
    enabledOnly,
  },
  segment: { enabled: editorOpen },
});
```

Returned state includes `segments`, `segment`, and `service`.

Mutations remain caller-owned because the page or drawer owns confirmation, notifications, conflict recovery, partial-save state, and navigation.

## Security boundary

The browser UI and TypeScript DTOs are defense in depth, not authorization. A compatible server must remain responsible for:

1. filtering the current user to accessible and enabled knowledge bases;
2. authorizing every knowledge-base, document, segment, retrieval, upload, download, and mutation action at record level;
3. enforcing LOCAL-only document and segment writes and uploader ownership where required;
4. returning only approved response fields; and
5. validating file extension, MIME type, size, content, and upload ownership.

The Live prerequisite route first calls the public `pm:listEnabledV2` action to confirm that `@nocobase/plugin-ai-knowledge-base` is enabled. A source/dev plugin can be loaded without a built client-v2 manifest entry, so a missing manifest match is confirmed with one read-only `aiKnowledgeBase:list` probe (`pageSize: 1`); a successful response means available, while a missing resource action means unavailable. After that check, Live business data and mutations call only user-side `aiKnowledgeBase*` actions. They must never call administrator vector-database, provider, embedding, storage, or configuration actions.

`canMaintainKnowledgeBaseDocuments()`, `canMaintainKnowledgeBaseDocument()`, `isLocalKnowledgeBase()`, and `isKnowledgeBaseDocumentProcessing()` are UX helpers only. They control what the user sees or can attempt; they do not grant permission.

LOCAL knowledge bases expose Documents and Hit tests. READONLY and EXTERNAL knowledge bases expose Hit tests only. For each returned document, the server-computed `accessAbility` controls maintenance affordances: `readWrite` enables them and `readOnly` keeps them unavailable. Authorized shared users may still view, download, open documents, and inspect segments.

## Controlled component API

Components receive data, state, and callbacks. They do not fetch data, inspect route state, infer role names, or make final permission decisions. They use the Portal's shadcn/Base UI foundation and do not depend on Ant Design.

### Knowledge-base directory

Core exports include:

- `KnowledgeBaseCard`, `KnowledgeBaseCardGrid`;
- `KnowledgeBaseListItem`, `KnowledgeBaseList`;
- `KnowledgeBaseDirectoryToolbar`, `KnowledgeBaseViewToggle`, `PagePagination`;
- card, list, and switchable directory presets, with paginated variants;
- directory loading, empty, filtered-empty, and error states;
- `KnowledgeBaseTypeBadge`, `KnowledgeBaseMetric`, and `CompactNumber`.

Use paginated presets when the host has a `PagedResult`; use non-paginated presets for bounded data. Supply `onOpen` only when an item is navigable—cards and rows show a pointer only when the callback exists. Full-surface open targets are independent from action slots, preserving keyboard access and preventing action clicks from triggering navigation.

The Live directory selects `directory.mode: "infinite"` for cards and uses an intersection sentinel. List mode selects `directory.mode: "paginated"` and uses URL-backed `PagePagination` with first, previous, next, last, and rows-per-page controls.

### Documents

Core exports include `DocumentTable`, `DocumentList`, `DocumentCardGrid`, `DocumentSplitView`, `PaginatedDocumentTable`, document status/access/metric primitives, the management toolbar, and the actions menu.

The Live table uses caller-supplied callbacks for Segments, Download, Re-index, and Delete. Download is the second action. It remains available whenever the host supplies `onDownload`; if a list row omits `url`, the Live host requests document detail first. Because a Portal may run on a different origin from NocoBase, the Live host resolves the server-issued file URL against the NocoBase origin, fetches it with the active authorization, role, and Portal headers, and downloads the resulting Blob URL. The file fetch intentionally omits `credentials: "include"`: the NocoBase file route accepts the Bearer token but may not opt into credentialed CORS. This preserves the NocoBase client's anchor-download behavior without navigating the Portal to a relative file path or making an unauthenticated request. Actions progressively move into an overflow menu on narrow widths. There are no bulk re-index or delete controls.

`canMaintain` is presentation-only. While indexing or segment generation is `PENDING` or `PROCESSING`—case-insensitive across `indexStatus` and `segmentStatus`—maintenance controls remain visible but disabled where required.

### Retrieval and Hit tests

`KnowledgeBaseHitTests` is controlled by:

- query draft and submitted query;
- `topK` and `score` settings;
- request loading/error state;
- ordered results;
- submit, edit, settings, retry, and open-result callbacks.

Supporting exports include result cards/grids/rows, ranked and grouped lists, split view, detail view, score badge, matched-question rendering, and `groupRetrievalResults()`.

The Knowledge base workspace defaults to Top K `4` and Score `0.6`. Scores render with three decimals and change in `0.1` steps. Re-entering Hit tests resets the initial state. Result order is preserved, matched questions are explicit, and unmodeled metadata is not displayed.

### Segments

`SegmentTable` and `SegmentList` render supplied segment data and callbacks. The management table includes number, preview, character count, related-question count, enabled state, update time, and actions.

During document processing:

- Edit remains openable;
- Enabled and Delete remain visible but disabled;
- editor content, related questions, and Save are locked.

`SegmentEditor` edits content and related questions only. It does not expose segment title editing or an overall Enabled switch. Saving content preserves the existing title. `SegmentQuestionsEditor` preserves question IDs, hashes, and enabled state.

Segment writes must use the latest `contentHash`. After content saves, persist the returned hash immediately. If saving related questions fails, show a recoverable partial-save state and retry only the questions mutation. A `409` conflict must offer an explicit adopt-server or keep-draft path. Use `SegmentConflictAlert`, `SegmentPartialSaveAlert`, `SegmentPendingAlert`, and `SegmentUnavailableState` for those states.

Segment regeneration settings use a local draft. Cancel does not apply changes. Chunk size has a minimum of `1`; decrement/increment controls change by `100`. Do not add browser `required`, `reportValidity()`, or extra validation prompts.

### Document upload

Controlled exports include `DocumentDropzone`, `SelectedDocumentFile`, `ZipFilenameEncodingField`, `UploadDocumentForm`, and `UploadDocumentDialog`.

The client experience allowlist includes `.doc`, `.docx`, `.md`, `.pdf`, `.txt`, and `.zip`; the server remains authoritative. ZIP encoding appears only for ZIP files, supports multiple selections and custom entries, splits custom input on spaces or commas, removes duplicates, and displays—but does not automatically submit—the server default.

`UploadDocumentDialog` retains the existing upload button/dialog interaction and refuses close while submitting. Static form examples omit a submit button. Opening or cancelling upload must not refresh or unmount the parent document list; only a successful upload triggers the parent refresh.

## Loading, empty, errors, and notifications

Use the host `LoadingState` for full-page and first-load states. Use shared `Empty` primitives for blank and unavailable states. Knowledge-base card skeletons may preserve the directory layout during initial loading. Do not add one-off spinners or ordinary dashed empty placeholders.

Failed reads stay in context with Retry using `KnowledgeBaseDirectoryError`, form alerts, or drawer alerts. User-triggered terminal mutations use Refine's `notificationProvider` through `notifyKnowledgeBaseMutationError()`; Knowledge base workspace code must not import Sonner directly.

Do not show a toast and a generic inline error for the same terminal mutation. Keep inline state for validation, `409` conflict recovery, partial saves, and errors requiring an in-place user action.

## Development workflows

The five deterministic development workflows reuse the same controlled component contracts as the Knowledge base workspace and do not import the service layer or call Knowledge Base APIs.

The development menu order is:

1. Knowledge bases
2. Documents
3. Document upload
4. Segments
5. Hit tests
6. Knowledge base workspace

| Workflow | Route | Current fixture behavior |
| --- | --- | --- |
| Knowledge bases | `/dev/ai-knowledge-base` and `/dev/ai-knowledge-base/directory` | Six displayed items; EXTERNAL is penultimate and READONLY is last |
| Documents | `/dev/ai-knowledge-base/documents` | Eight displayed rows from deterministic document fixtures |
| Document upload | `/dev/ai-knowledge-base/upload` | Dialog plus static PDF/ZIP controlled states |
| Segments | `/dev/ai-knowledge-base/segments` | Eight displayed rows and a controlled editor/settings flow |
| Hit tests | `/dev/ai-knowledge-base/hit-tests` | Defaults to Top K `4`, Score `0.6`, deterministic ranked results |

The fixture source also provides 24 bases, 37 documents, 12 retrieval results, and 42 segments for pagination and layout coverage. Demo copy must remain business-facing: do not describe fixtures as mocks, explain server implementation, or announce that requests are not sent. Operations that intentionally do not change Demo business state should remain silent.

## Knowledge base workspace routes and behavior

All routes are development-only under `/dev/ai-knowledge-base`. The shared `live` parent route uses the template-level `NocoBasePluginPrerequisiteGate` before rendering any Knowledge base workspace child. It checks the public `pm:listEnabledV2` response for `@nocobase/plugin-ai-knowledge-base`, reuses the shared manifest/probe caches and in-flight requests, and falls back to a read-only `aiKnowledgeBase:list` probe when a source/dev plugin has no built client-v2 entry. A successful missing-plugin result is distinct from a network/server error, and both states offer a manual retry. Demo routes remain API-free and are not gated.

| Surface | Route |
| --- | --- |
| Directory | `/dev/ai-knowledge-base/live` |
| Workspace | `/dev/ai-knowledge-base/live/:knowledgeBaseKey` |
| Retrieval result | `/dev/ai-knowledge-base/live/:knowledgeBaseKey/retrieval/:resultIndex` |
| Document segments | `/dev/ai-knowledge-base/live/:knowledgeBaseKey/documents/:documentId` |
| Segment editor | `/dev/ai-knowledge-base/live/:knowledgeBaseKey/documents/:documentId/segments/:segmentUid` |
| Upload | `/dev/ai-knowledge-base/live/:knowledgeBaseKey/upload` |

Route builders URL-encode knowledge-base keys, document IDs, segment UIDs, and retrieval indexes.

The Workspace keeps its parent mounted while retrieval detail, document, segment, and upload children are open. Segment editing uses a nested `RouteDrawer`; upload uses the controlled dialog flow. Closing a child returns to a safe internal originating URL including search and hash.

URL state belongs to the Live route layer, not the hooks. It preserves directory view/page/search, document page size/page, submitted retrieval query, Top K, Score, and the active segment-document drawer. The hooks receive the parsed domain values explicitly.

A LOCAL Workspace normally loads knowledge-base detail and then its requested document page. Retrieval runs only after a submitted query exists. READONLY and EXTERNAL Workspaces do not request document lists. Nested pages reuse parent knowledge-base data where available to avoid duplicate detail calls.

## Composition recipes

- **Bounded card homepage:** pass a bounded item array to `KnowledgeBaseCardDirectory`.
- **Paginated directory:** combine `useKnowledgeBase({ directory: { mode: "paginated", ... } })` with `PaginatedKnowledgeBaseListDirectory` or the switchable preset.
- **Infinite card directory:** select `directory.mode: "infinite"`, render accumulated rows, and call `loadMore()` from a sentinel only when `hasMore` is true.
- **Document management:** gate the document request explicitly with `enabled: isLocal`, then pass the result and an `accessAbility`-based `canMaintain` callback to `DocumentTable`.
- **Narrow document surface:** use `DocumentList`; for parent-owned selection use `DocumentSplitView`.
- **Retrieval alternatives:** use `RetrievalRankedList`, `RetrievalSourceGroupedResults`, or `RetrievalSplitView` without reordering the server result array.
- **Segment drawer:** use `RouteDrawer`, `useRefineUnsavedChangesGuard`, latest-hash writes, explicit conflict recovery, and a questions-only retry after partial save.
- **Upload:** obtain constraints from `useKnowledgeBaseDocument()`, request ZIP encodings only for ZIP, and inject a Portal-safe upload callback into `UploadDocumentDialog`.

Every composition must handle Loading, Empty, Error, `403`, and—where segment writes are involved—`409`. Use semantic host tokens, support narrow viewports and keyboard focus, honor reduced motion, avoid Ant Design, and leave `src/components/ui` unchanged unless a verified base-component change is truly required.

## Localization

All user-visible Knowledge Base text uses namespace `nocobase-ai-knowledge-base` and English source text as the key.

- `locales/en-US.ts` maps each English key to the same English value;
- `locales/zh-CN.ts` has the identical key set with Chinese values;
- `useT()` calls `translate(key, { ...options, ns }, key)` so the English key is also the fallback.

When adding text, add the same English key to both catalogs. Do not introduce semantic prefixes such as `components.`, `live.`, or `demo.`, and do not add intermediate Demo/Live translation wrappers.

## Development and verification

Develop directly in `registry/nocobase-ai-knowledge-base`. Registry source is loaded directly during normal development; do not copy it into `src/extensions` for preview.

Run the focused and application-level checks:

```bash
pnpm exec eslint --fix registry/nocobase-ai-knowledge-base
pnpm exec tsc --noEmit
node --experimental-strip-types --test registry/nocobase-ai-knowledge-base/tests/*.test.ts
pnpm build
node scripts/registry.mjs build
pnpm sdk:check
git diff --check
```

Before publishing or changing payload boundaries, also validate generated Registry artifacts and installation resolution:

```bash
pnpm exec shadcn registry validate ./registry.json
pnpm exec shadcn build registry.json --output public/r
pnpm exec shadcn add @nocobase/ai-knowledge-base-providers --dry-run
pnpm exec shadcn add @nocobase/ai-knowledge-base-components --dry-run
pnpm exec shadcn add @nocobase/ai-knowledge-base --dry-run
```

Verify responsive behavior around 390px, 768px, and desktop widths; keyboard navigation; light and dark themes; reduced motion; URL restoration; empty/filter-empty/read failures; unauthorized states; failed indexing; unavailable segments; conflict and partial-save recovery; and identity changes between knowledge bases, documents, and segments.

Browser smoke tests must not upload, delete, re-index, regenerate, or otherwise mutate real data unless the test environment and user explicitly authorize those actions. Real API/browser verification also requires an authenticated NocoBase session and a server implementing the user-side authorization contract.
