import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { knowledgeBaseDemoRoutes, knowledgeBaseLiveRoutes } from "../routes.ts";
import {
  liveListSearch,
  liveLocationPath,
  liveReturnTo,
  isLiveSegmentDrawerState,
  liveWorkspaceSearch,
  parseLiveListState,
  parseLiveWorkspaceState,
} from "../live/url-state.ts";

const registryRoot = path.resolve("registry/nocobase-ai-knowledge-base");

test("demo and live routes are distinct, URL-backed, and safely encode record identifiers", () => {
  assert.equal(knowledgeBaseDemoRoutes.index, "/dev/ai-knowledge-base");
  assert.equal("recipes" in knowledgeBaseDemoRoutes, false);
  assert.equal("foundations" in knowledgeBaseDemoRoutes, false);
  assert.equal(knowledgeBaseDemoRoutes.hitTests, "/dev/ai-knowledge-base/hit-tests");
  assert.equal("retrieval" in knowledgeBaseDemoRoutes, false);
  assert.equal(knowledgeBaseLiveRoutes.list, "/dev/ai-knowledge-base/live");
  assert.equal(
    knowledgeBaseLiveRoutes.segment("a/b", "doc 1", "seg:1"),
    "/dev/ai-knowledge-base/live/a%2Fb/documents/doc%201/segments/seg%3A1",
  );
  assert.equal(
    knowledgeBaseLiveRoutes.retrieval("a/b", 2),
    "/dev/ai-knowledge-base/live/a%2Fb/retrieval/2",
  );
});

test("list and workspace URL state preserve valid settings", () => {
  const list = parseLiveListState(new URLSearchParams("view=list&page=3&q=handbook&pageSize=20"));
  assert.deepEqual(list, { view: "list", page: 3, query: "handbook", pageSize: 20 });
  assert.equal(liveListSearch({ view: "cards", page: 1, query: "", pageSize: 10 }), "");
  assert.equal(liveListSearch(list), "?page=3&q=handbook&view=list&pageSize=20");
  const defaultWorkspace = parseLiveWorkspaceState(new URLSearchParams());
  assert.equal(defaultWorkspace.topK, 4);
  assert.equal(defaultWorkspace.score, 0.6);

  const workspace = parseLiveWorkspaceState(
    new URLSearchParams("documentsPage=2&documentPageSize=30&query=retention&topK=7&score=0.8&segmentsDocument=204"),
  );
  assert.deepEqual(workspace, {
    documentPage: 2,
    documentPageSize: 30,
    retrievalQuery: "retention",
    topK: 7,
    score: 0.8,
    segmentDocumentId: "204",
  });
  assert.equal(
    liveWorkspaceSearch(workspace),
    "?documentsPage=2&documentPageSize=30&query=retention&topK=7&score=0.8&segmentsDocument=204",
  );
});

test("drawer returns preserve a safe internal source URL including search and hash", () => {
  const from = liveLocationPath({
    pathname: "/dev/ai-knowledge-base/live/local/documents/12",
    search: "?page=2",
    hash: "#segment-list",
  });
  assert.equal(
    liveReturnTo(
      { from },
      "/dev/ai-knowledge-base/live/local/documents/12",
      "/dev/ai-knowledge-base/live/local/documents/12",
    ),
    from,
  );
  assert.equal(
    liveReturnTo(
      { from: "https://untrusted.example" },
      "/dev/ai-knowledge-base/live/local",
      "/dev/ai-knowledge-base/live/local",
    ),
    "/dev/ai-knowledge-base/live/local",
  );
  assert.equal(isLiveSegmentDrawerState({ segmentDrawer: true }), true);
  assert.equal(isLiveSegmentDrawerState({ segmentDrawer: "true" }), false);
  const segmentDrawerFrom = "/dev/ai-knowledge-base/live/local?documentsPage=4&segmentsDocument=204";
  assert.equal(
    liveReturnTo(
      { from: segmentDrawerFrom, segmentDrawer: true },
      "/dev/ai-knowledge-base/live/local/documents/204/segments/segment-1",
      "/dev/ai-knowledge-base/live/local",
    ),
    segmentDrawerFrom,
  );
});
test("Knowledge Base translations use English source text as keys", () => {
  const enUS = fs.readFileSync(path.join(registryRoot, "locales/en-US.ts"), "utf8");
  const zhCN = fs.readFileSync(path.join(registryRoot, "locales/zh-CN.ts"), "utf8");
  const catalogEntry = /^\s*["'](?<key>.+?)["']:\s*["'](?<value>.+?)["'],?$/gm;
  const enEntries = Array.from(enUS.matchAll(catalogEntry));
  const zhEntries = Array.from(zhCN.matchAll(catalogEntry));
  assert.ok(enEntries.length > 0);
  assert.deepEqual(
    enEntries.map((entry) => entry.groups?.key),
    zhEntries.map((entry) => entry.groups?.key),
  );
  for (const entry of enEntries) {
    assert.equal(entry.groups?.key, entry.groups?.value);
  }
  assert.doesNotMatch(enUS, /^\s*["'](?:navigation|development|demo|common|components|live)\./m);
  assert.doesNotMatch(zhCN, /^\s*["'](?:navigation|development|demo|common|components|live)\./m);
});

test("published payload layers isolate tests and include a working user-side Live Workspace adapter", () => {
  const config = JSON.parse(fs.readFileSync(path.resolve("registry.config.json"), "utf8"));
  const providers = config.items.find((item: { name: string }) => item.name === "ai-knowledge-base-providers");
  const components = config.items.find((item: { name: string }) => item.name === "ai-knowledge-base-components");
  const full = config.items.find((item: { name: string }) => item.name === "ai-knowledge-base");
  assert.deepEqual(providers.source.include, ["providers", "hooks"]);
  assert.deepEqual(components.source.include, ["components", "locales"]);
  assert.ok(full.source.include.includes("demo") && full.source.include.includes("live"));
  assert.ok(full.source.include.includes("README.md"));
  assert.equal(full.source.include.includes("docs"), false);
  assert.equal(fs.existsSync(path.join(registryRoot, "docs")), false);
  for (const item of [providers, components, full]) {
    assert.equal(item.source.include.some((entry: string) => entry.includes("test")), false);
  }

  const demo = fs.readFileSync(path.join(registryRoot, "demo/showcase.tsx"), "utf8");
  assert.equal(/from\s+["']\.\.\/providers/.test(demo), false);
  assert.equal(demo.includes("knowledgeBaseService"), false);

  const implementation = fs.readFileSync(path.join(registryRoot, "providers/service/index.ts"), "utf8");
  const context = fs.readFileSync(path.join(registryRoot, "providers/context.tsx"), "utf8");
  const providersIndex = fs.readFileSync(path.join(registryRoot, "providers/index.ts"), "utf8");
  const workspacePage = fs.readFileSync(path.join(registryRoot, "live/workspace-page.tsx"), "utf8");
  const documentPage = fs.readFileSync(path.join(registryRoot, "live/document-page.tsx"), "utf8");
  const providerTypes = fs.readFileSync(path.join(registryRoot, "providers/types.ts"), "utf8");
  const serviceFactory = fs.readFileSync(path.join(registryRoot, "providers/service/knowledge-base-factory.ts"), "utf8");
  const hooksIndex = fs.readFileSync(path.join(registryRoot, "hooks/index.ts"), "utf8");
  const knowledgeBaseHooks = fs.readFileSync(path.join(registryRoot, "hooks/use-knowledge-base.ts"), "utf8");
  const documentHooks = fs.readFileSync(path.join(registryRoot, "hooks/use-knowledge-base-document.ts"), "utf8");
  const segmentHooks = fs.readFileSync(path.join(registryRoot, "hooks/use-knowledge-base-segment.ts"), "utf8");
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/service/index.ts")), true);
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/service/knowledge-base.ts")), true);
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/service/knowledge-base-factory.ts")), true);
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/context.tsx")), true);
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/utils.ts")), true);
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/paged-result.ts")), false);
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/errors.ts")), false);
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/service/knowledge-base.tsx")), false);
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/data-source.ts")), false);
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/nocobase-data-source.ts")), false);
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/context.ts")), false);
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/data-source-context.tsx")), false);
  assert.equal(fs.existsSync(path.join(registryRoot, "providers/hooks")), false);
  assert.equal(fs.existsSync(path.join(registryRoot, "hooks/index.ts")), true);
  assert.equal(fs.existsSync(path.join(registryRoot, "hooks/use-knowledge-base.ts")), true);
  assert.equal(fs.existsSync(path.join(registryRoot, "hooks/use-knowledge-base-document.ts")), true);
  assert.equal(fs.existsSync(path.join(registryRoot, "hooks/use-knowledge-base-segment.ts")), true);
  assert.doesNotMatch(providersIndex, /hooks/);
  assert.equal(fs.existsSync(path.join(registryRoot, "live/live-prerequisite.tsx")), false);
  assert.match(context, /KnowledgeBaseServiceContext/);
  assert.match(context, /KnowledgeBaseServiceProvider/);
  assert.match(context, /service: KnowledgeBaseService/);
  assert.match(providersIndex, /service\/knowledge-base/);
  assert.match(implementation, /knowledgeBaseService/);
  assert.match(implementation, /createKnowledgeBaseService/);
  assert.match(serviceFactory, /export function createKnowledgeBaseService/);
  assert.doesNotMatch(serviceFactory, /createNocoBaseKnowledgeBaseDataSource|createNocoBaseKnowledgeBaseService/);
  assert.doesNotMatch(context, /KnowledgeBaseDataSource|source: KnowledgeBaseService|createElement/);
  assert.match(context, /<KnowledgeBaseServiceContext\.Provider value=\{service\}>/);
  assert.deepEqual(hooksIndex.trim().split("\n"), [
    'export * from "./use-knowledge-base";',
    'export * from "./use-knowledge-base-document";',
    'export * from "./use-knowledge-base-segment";',
  ]);
  assert.match(knowledgeBaseHooks, /export function useKnowledgeBase\(/);
  assert.match(documentHooks, /export function useKnowledgeBaseDocument\(/);
  assert.match(segmentHooks, /export function useKnowledgeBaseSegment\(/);
  assert.doesNotMatch(
    `${knowledgeBaseHooks}\n${documentHooks}\n${segmentHooks}`,
    /useParams|useSearchParams|URLSearchParams|useLocation/,
  );
  assert.doesNotMatch(workspacePage, /getKnowledgeBaseServiceKey|useRequest|useKnowledgeBaseService/);
  assert.match(workspacePage, /useKnowledgeBase\(\{/);
  assert.match(workspacePage, /useKnowledgeBaseDocument\(\{/);
  assert.match(providerTypes, /accessAbility\?: "readOnly" \| "readWrite"/);
  assert.match(
    providerTypes,
    /canMaintainKnowledgeBaseDocument[\s\S]*?document\.accessAbility === "readWrite"/,
  );
  assert.match(
    serviceFactory,
    /item\.accessAbility === "readOnly" \|\| item\.accessAbility === "readWrite"/,
  );
  assert.doesNotMatch(
    `${workspacePage}\n${documentPage}\n${demo}`,
    /isOwnedDocument|useGetIdentity|createdById\s*===|===\s*[^\n]*createdById/,
  );
  assert.match(
    serviceFactory,
    /async getKnowledgeBase\(key, signal\) \{[\s\S]*?action\(client, "aiKnowledgeBase", "list", \{[\s\S]*?paginate: false, "filter\[key\]": key/,
  );
  assert.match(
    serviceFactory,
    /async runRetrieval\(request\) \{[\s\S]*?action\(client, "aiKnowledgeBase", "runHitTest", \{[\s\S]*?body: \{[\s\S]*?knowledgeBaseKey: request\.knowledgeBaseKey,[\s\S]*?query: request\.query,[\s\S]*?topK: request\.topK,[\s\S]*?score: request\.score/ ,
  );
  assert.match(workspacePage, /defaultValue=\{local \? "documents" : "retrieve"\}/);
  assert.match(workspacePage, /TabsTrigger value="documents">\{t\("Documents"\)\}/);
  assert.doesNotMatch(workspacePage, /supports retrieval only\. Document, upload, and segment maintenance routes are unavailable\./);
  assert.match(workspacePage, /TabsTrigger value="retrieve">\{t\("Hit tests"\)\}/);
  assert.match(workspacePage, /BreadcrumbLink render={<Link to={listReturnTo} \/>}/);
  assert.match(workspacePage, /BreadcrumbPage>{base\.data\.name}/);
  assert.match(workspacePage, /<h1 className="text-2xl font-semibold tracking-tight">{base\.data\.name}<\/h1>/);
});

test("development demos use the Live Workspace component flows in the intended order", () => {
  const demo = fs.readFileSync(path.join(registryRoot, "demo/showcase.tsx"), "utf8");
  const fixtures = fs.readFileSync(path.join(registryRoot, "demo/fixtures/data.ts"), "utf8");
  const extension = fs.readFileSync(path.join(registryRoot, "extension.tsx"), "utf8");
  const enUS = fs.readFileSync(path.join(registryRoot, "locales/en-US.ts"), "utf8");
  const zhCN = fs.readFileSync(path.join(registryRoot, "locales/zh-CN.ts"), "utf8");
  assert.match(demo, /useT/);
  assert.doesNotMatch(demo, /useDemoText/);
  for (const component of [
    "KnowledgeBaseSwitchableDirectory",
    "DocumentTable",
    "SegmentTable",
    "SegmentEditor",
    "KnowledgeBaseHitTests",
    "UploadDocumentDialog",
    "UploadDocumentForm",
  ]) {
    assert.match(demo, new RegExp(`<${component}`));
  }
  assert.match(demo, /fixtureKnowledgeBaseDirectory/);
  assert.match(fixtures, /fixtureKnowledgeBases\[0\],[\s\S]*?fixtureKnowledgeBases\[6\]/);
  assert.match(fixtures, /defaultEncoding: "windows-1252"/);
  assert.match(fixtures, /description: "Unicode \(UTF-8\)"/);
  assert.match(fixtures, /value: "windows-1251", label: "windows-1251", description: "Cyrillic"/);
  assert.match(demo, /<UploadDocumentForm[\s\S]*?showSubmitButton=\{false\}[\s\S]*?<UploadDocumentForm[\s\S]*?showSubmitButton=\{false\}/);
  assert.match(demo, /<Popover[\s\S]*?Segment settings[\s\S]*?Split document[\s\S]*?Chunk size[\s\S]*?Chunk overlap/);
  assert.doesNotMatch(demo, /role="status"|Mock|mock data|server/);
  assert.doesNotMatch(
    demo,
    /ApiTable|FoundationsPage|DocumentList|DocumentCardGrid|DocumentSplitView|SegmentList|RetrievalRankedList|RetrievalResultGrid|RetrievalSourceGroupedResults|RetrievalSplitView/,
  );
  assert.match(
    extension,
    /"ai-knowledge-base-directory"[\s\S]*?"ai-knowledge-base-documents"[\s\S]*?"ai-knowledge-base-upload"[\s\S]*?"ai-knowledge-base-segments"[\s\S]*?"ai-knowledge-base-hit-tests"/,
  );
  assert.match(extension, /i18nKey: "Knowledge base"/);
  for (const key of [
    "Knowledge bases",
    "Documents",
    "Document upload",
    "Segments",
    "Hit tests",
    "Live workspace",
  ]) {
    assert.match(extension, new RegExp(`"${key}"`));
  }
  assert.match(
    extension,
    /path: "documents"[\s\S]*?\.\/demo\/documents-page[\s\S]*?path: "segments"[\s\S]*?\.\/demo\/segments-page[\s\S]*?path: "hit-tests"[\s\S]*?\.\/demo\/hit-tests-page[\s\S]*?path: "upload"[\s\S]*?\.\/demo\/document-upload-page/,
  );
  assert.doesNotMatch(extension, /document-layouts-page|segment-components-page|retrieval-layouts-page|upload-components-page/);
  for (const key of [
    "Knowledge bases",
    "Documents",
    "Segments",
    "Hit tests",
    "Document upload",
  ]) {
    assert.match(enUS, new RegExp(key.replace(".", "\\.")));
    assert.match(zhCN, new RegExp(key.replace(".", "\\.")));
  }
});

test("document table matches the NocoBase document-list fields and safe action surface", () => {
  const documents = fs.readFileSync(path.join(registryRoot, "components/documents.tsx"), "utf8");
  const workspacePage = fs.readFileSync(path.join(registryRoot, "live/workspace-page.tsx"), "utf8");
  for (const header of ["ID", "Filename", "Status", "Characters", "Segments", "Created at", "Updated at", "Actions"]) {
    assert.match(documents, new RegExp(`t\\("${header}"`));
  }
  assert.match(documents, /PanelsTopLeft/);
  assert.match(documents, /RefreshCw/);
  assert.match(documents, /Download/);
  assert.match(documents, /Trash2/);
  assert.match(documents, /MoreHorizontal/);
  assert.match(documents, /<CircleAlert aria-hidden="true" className="size-4" \/>/);
  assert.match(documents, /ResizeObserver/);
  assert.match(documents, /visibleActions = actions\.slice\(0, inlineActionCount\)/);
  assert.match(documents, /overflowActions = actions\.slice\(inlineActionCount\)/);
  assert.match(documents, /<Table className="table-fixed">/);
  assert.doesNotMatch(documents, /Checkbox|selectedDocumentIds/);
  assert.match(workspacePage, /Refresh[\s\S]*Upload/);
  assert.doesNotMatch(workspacePage, /Vectorization|selectedDocumentIds|onSelectedDocumentIdsChange/);
  assert.doesNotMatch(workspacePage, /Select documents to run bulk actions\./);
  assert.match(workspacePage, /<RefreshCw data-icon="inline-start" aria-hidden="true" \/>/);
  assert.match(workspacePage, /documentIds: activeAction\.documentIds/);
  assert.doesNotMatch(documents, /min-w-\[68rem\]/);
  assert.match(documents, /canMaintain && onVectorize/);
  assert.match(documents, /canMaintain && onDelete/);
  assert.match(documents, /disabled: !onDownload/);
  assert.doesNotMatch(documents, /disabled: !document\.url \|\| !onDownload/);
  assert.match(
    workspacePage,
    /record\.url[\s\S]*?service\.getDocument\(\{[\s\S]*?knowledgeBaseKey: record\.knowledgeBaseKey,[\s\S]*?documentId: record\.id/ ,
  );
  assert.match(
    workspacePage,
    /fetch\(nocobaseClient\.resolveUrl\(downloadable\.url\), \{[\s\S]*?nocobaseClient\.getHeaders\(\{[\s\S]*?withAclMeta: false[\s\S]*?Accept: "\*\/\*"/,
  );
  assert.doesNotMatch(workspacePage, /credentials: "include"/);
  assert.match(workspacePage, /URL\.createObjectURL\(await response\.blob\(\)\)/);
  assert.match(workspacePage, /link\.href = objectUrl/);
  assert.doesNotMatch(workspacePage, /link\.href = downloadable\.url/);
  assert.match(workspacePage, /link\.download = filename/);
  assert.match(workspacePage, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(documents, /const display = date\.toLocaleDateString\(\)/);
  assert.match(documents, /title=\{fullDateTime\}/);
});

test("Live Workspace composes shared loading and empty-state foundations", () => {
  const common = fs.readFileSync(path.join(registryRoot, "components/common.tsx"), "utf8");
  const retrieval = fs.readFileSync(path.join(registryRoot, "components/retrieval.tsx"), "utf8");
  const segments = fs.readFileSync(path.join(registryRoot, "components/segments.tsx"), "utf8");
  const workspace = fs.readFileSync(path.join(registryRoot, "live/workspace-page.tsx"), "utf8");
  const documentPage = fs.readFileSync(path.join(registryRoot, "live/document-page.tsx"), "utf8");
  const upload = fs.readFileSync(path.join(registryRoot, "live/upload-controller.tsx"), "utf8");
  const drawer = fs.readFileSync(path.join(registryRoot, "live/document-segments-drawer.tsx"), "utf8");
  const segmentRoute = fs.readFileSync(path.join(registryRoot, "live/segment-route.tsx"), "utf8");
  for (const surface of [workspace, documentPage, upload, drawer, segmentRoute]) {
    assert.match(surface, /@\/components\/app-shell\/loading-state/);
  }
  for (const surface of [workspace, documentPage, upload, drawer]) {
    assert.match(surface, /@\/components\/ui\/empty/);
  }
  assert.match(common, /<LoadingState className="min-h-32" \/>/);
  assert.match(retrieval, /<Empty className="min-h-64 flex-1 border-0 p-6">/);
  assert.match(retrieval, /<LoadingState className="min-h-64 flex-1" \/>/);
  assert.match(segments, /<Empty className="min-h-48 border">/);
  assert.doesNotMatch(workspace, /Loading documents…|rounded-xl border border-dashed p-5/);
  assert.doesNotMatch(documentPage, /Loading segments…|rounded-xl border border-dashed p-5/);
  assert.doesNotMatch(drawer, /Loading segments…|rounded-xl border border-dashed p-5/);
});

test("Knowledge Base separates inline read recovery from shared mutation notifications", () => {
  const errors = fs.readFileSync(path.join(registryRoot, "providers/utils.ts"), "utf8");
  const notifications = fs.readFileSync(path.join(registryRoot, "live/notifications.ts"), "utf8");
  const workspace = fs.readFileSync(path.join(registryRoot, "live/workspace-page.tsx"), "utf8");
  const upload = fs.readFileSync(path.join(registryRoot, "live/upload-controller.tsx"), "utf8");
  const drawer = fs.readFileSync(path.join(registryRoot, "live/document-segments-drawer.tsx"), "utf8");
  const segmentRoute = fs.readFileSync(path.join(registryRoot, "live/segment-route.tsx"), "utf8");
  const docs = fs.readFileSync(path.join(registryRoot, "README.md"), "utf8");
  const enUS = fs.readFileSync(path.join(registryRoot, "locales/en-US.ts"), "utf8");
  const zhCN = fs.readFileSync(path.join(registryRoot, "locales/zh-CN.ts"), "utf8");
  assert.match(errors, /normalizePagedResult[\s\S]*normalizeKnowledgeBaseError/);
  assert.match(notifications, /NotificationProvider\["open"\]/);
  assert.match(notifications, /normalizeKnowledgeBaseError\(error, fallback\)\.message/);
  for (const surface of [workspace, upload, drawer, segmentRoute]) {
    assert.match(surface, /useNotification/);
    assert.match(surface, /notifyKnowledgeBaseMutationError/);
    assert.doesNotMatch(surface, /from ["']sonner["']/);
  }
  assert.match(workspace, /<KnowledgeBaseDirectoryError error=\{documents\.error\} onRetry=\{documents\.retry\} \/>/);
  assert.match(workspace, /normalizeKnowledgeBaseError\(retrieval\.error, t\("Hit test failed\."\)\)\.message/);
  assert.doesNotMatch(workspace, /documentActionError|documentActionNotice|readUploadNotice/);
  assert.doesNotMatch(drawer, /actionError/);
  assert.match(segmentRoute, /setPartialSave\(/);
  assert.match(docs, /Failed reads stay in context with Retry/);
  assert.match(docs, /terminal mutations use Refine's `notificationProvider`/);
  for (const key of [
    "Document action failed",
    "Upload failed",
    "Unable to update segments",
    "Unable to save segment",
    "Unable to save related questions",
  ]) {
    assert.match(enUS, new RegExp(`['\\"]${key}`));
    assert.match(zhCN, new RegExp(`['\\"]${key}`));
  }
});

test("knowledge-base, document, and segment lists share the Users pagination controls", () => {
  const pagination = fs.readFileSync(path.join(registryRoot, "components/common.tsx"), "utf8");
  const knowledgeBases = fs.readFileSync(path.join(registryRoot, "live/knowledge-bases-page.tsx"), "utf8");
  const knowledgeBaseHooks = fs.readFileSync(path.join(registryRoot, "hooks/use-knowledge-base.ts"), "utf8");
  const knowledgeBaseComponents = fs.readFileSync(
    path.join(registryRoot, "components/knowledge-bases.tsx"),
    "utf8",
  );
  const workspace = fs.readFileSync(path.join(registryRoot, "live/workspace-page.tsx"), "utf8");
  const segments = fs.readFileSync(path.join(registryRoot, "live/document-segments-drawer.tsx"), "utf8");
  assert.match(pagination, /t\("Rows per page"\)/);
  assert.match(pagination, /t\("Page \{\{page\}\} of \{\{pages\}\}"/);
  assert.match(pagination, /ChevronsLeft/);
  assert.match(pagination, /ChevronsRight/);
  assert.match(pagination, /SelectTrigger className="h-8 w-\[70px\]"/);
  assert.match(knowledgeBases, /onPageSizeChange: \(pageSize\) => update\(\{ pageSize, page: 1 \}\)/);
  assert.match(knowledgeBaseHooks, /function useInfiniteKnowledgeBases/);
  assert.match(knowledgeBaseHooks, /setRows\(\[\]\);[\s\S]*?setCount\(undefined\)/);
  assert.match(knowledgeBases, /new IntersectionObserver/);
  assert.match(knowledgeBases, /isCardView \? \([\s\S]*?<KnowledgeBaseSwitchableDirectory[\s\S]*?<InfiniteCardLoadTrigger/);
  assert.match(knowledgeBases, /<PaginatedKnowledgeBaseSwitchableDirectory/);
  assert.match(knowledgeBaseComponents, /onOpen &&\s+"cursor-pointer transition-shadow/);
  assert.match(knowledgeBaseComponents, /onOpen && "cursor-pointer transition-colors/);
  assert.equal(
    knowledgeBaseComponents.match(/absolute inset-0 z-0 cursor-pointer rounded-xl/g)?.length,
    2,
  );
  assert.match(workspace, /<PagePagination/);
  assert.match(workspace, /documentPageSize/);
  assert.match(segments, /onPageSizeChange=\{\(nextPageSize\)/);
});

test("live hit tests follow the NocoBase query, settings, and ranked-card flow", () => {
  const retrieval = fs.readFileSync(path.join(registryRoot, "components/retrieval.tsx"), "utf8");
  const workspacePage = fs.readFileSync(path.join(registryRoot, "live/workspace-page.tsx"), "utf8");
  const retrievalRoute = fs.readFileSync(path.join(registryRoot, "live/retrieval-result-route.tsx"), "utf8");
  assert.match(retrieval, /export function KnowledgeBaseHitTests/);
  assert.match(retrieval, /t\("Test the matching between user input and the knowledge base"\)/);
  assert.match(retrieval, /t\("Input matching text"\)/);
  assert.match(retrieval, /HitTestSettingsPopover/);
  assert.match(retrieval, /value\.score\.toFixed\(3\)/);
  assert.match(retrieval, /step=\{0\.1\}/);
  assert.match(retrieval, /UserRound/);
  assert.match(retrieval, /t\("No matching documents found"\)/);
  assert.match(retrieval, /HitTestResultCard/);
  assert.match(retrieval, /showTitle = true/);
  assert.match(retrievalRoute, /<RetrievalResultDetail result=\{result\} showTitle=\{false\} \/>/);
  assert.match(workspacePage, /<KnowledgeBaseHitTests/);
  assert.match(workspacePage, /onSettingsChange=\{\(\{ topK, score \}\) => setWorkspace\(\{ topK, score \}\)\}/);
  assert.match(workspacePage, /if \(value === "retrieve"\) resetHitTests\(\);/);
  assert.match(workspacePage, /setWorkspace\(\{ retrievalQuery: "", topK: 4, score: 0\.6 \}\)/);
  assert.match(workspacePage, /results=\{hasSubmittedRetrievalQuery \? \(retrieval\.data \?\? \[\]\) : \[\]\}/);
  assert.doesNotMatch(workspacePage, /RetrievalRankedList/);
});

test("document segments open in a management drawer with caller-owned safe actions", () => {
  const workspacePage = fs.readFileSync(path.join(registryRoot, "live/workspace-page.tsx"), "utf8");
  const drawer = fs.readFileSync(path.join(registryRoot, "live/document-segments-drawer.tsx"), "utf8");
  const segments = fs.readFileSync(path.join(registryRoot, "components/segments.tsx"), "utf8");
  const documentPage = fs.readFileSync(path.join(registryRoot, "live/document-page.tsx"), "utf8");
  const segmentRoute = fs.readFileSync(path.join(registryRoot, "live/segment-route.tsx"), "utf8");
  const extension = fs.readFileSync(path.join(registryRoot, "extension.tsx"), "utf8");
  const segmentHooks = fs.readFileSync(path.join(registryRoot, "hooks/use-knowledge-base-segment.ts"), "utf8");
  assert.match(extension, /path: "live\/:knowledgeBaseKey"[\s\S]*path: "documents\/:documentId"[\s\S]*path: "segments\/:segmentUid"/);
  assert.doesNotMatch(extension, /path: "live\/:knowledgeBaseKey\/documents\/:documentId"/);
  assert.match(workspacePage, /setWorkspace\(\{ segmentDocumentId: String\(document\.id\) \}\)/);
  assert.match(workspacePage, /segmentDrawerOpen/);
  assert.doesNotMatch(workspacePage, /onOpenSegment=\{\(segment\) => \{[\s\S]*?setSegmentDrawerOpen/);
  assert.match(segmentRoute, /returnToSegmentDrawer/);
  assert.match(segmentRoute, /workspaceRoute/);
  assert.match(workspacePage, /<DocumentSegmentsDrawer/);
  assert.match(workspacePage, /segmentDrawer: true/);
  assert.match(documentPage, /openedFromSegmentDrawer/);
  assert.match(documentPage, /if \(openedFromSegmentDrawer\) return <Outlet context=\{outletContext\} \/>;/);
  assert.match(drawer, /<SheetContent\s+side="right"/);
  assert.doesNotMatch(drawer, /document\.segmentCount/);
  assert.doesNotMatch(drawer, /Loading document segments/);
  assert.match(drawer, /sm:!w-\[min\(96vw,80rem\)\]/);
  assert.match(drawer, /useKnowledgeBaseSegment\(\{/);
  assert.match(segmentHooks, /export function useKnowledgeBaseSegment/);
  assert.match(drawer, /t\("Enabled only"\)/);
  assert.match(drawer, /function SegmentSettings/);
  assert.match(drawer, /t\("Segment settings"\)/);
  assert.match(drawer, /t\("Split document"\)|t\("Chunk size"\)|t\("Chunk overlap"\)/);
  assert.match(drawer, /function SegmentNumberInput/);
  assert.match(drawer, /onChange\(value \+ 100\)/);
  assert.match(drawer, /minimum=\{1\}/);
  assert.match(drawer, /step="any"/);
  assert.match(drawer, /Math\.max\(minimum, nextValue\)/);
  assert.match(drawer, /noValidate/);
  assert.doesNotMatch(drawer, /reportValidity\(\)|required/);
  assert.match(drawer, /segmentOptions: action\.segmentOptions/);
  assert.match(drawer, /overwrite edited segments and related questions/);
  assert.match(drawer, /pageAfterDelete/);
  for (const header of ["No.", "Preview", "Characters", "Related questions", "Enabled", "Updated at"]) {
    assert.match(segments, new RegExp(`t\\("${header}"`));
  }
  assert.match(segments, /display: date\.toLocaleDateString\(\)/);
  assert.match(segments, /title=\{updatedAt\.fullDateTime\}/);
  assert.match(segments, /<TableCell className="pl-0">/);
  assert.match(segments, /canMaintain && onToggleEnabled/);
  assert.match(segments, /canMaintain && onDelete/);
  assert.match(drawer, /const pending = isKnowledgeBaseDocumentProcessing\(document\)/);
  assert.match(drawer, /onToggleEnabled=\{[\s\S]*?canMaintain[\s\S]*?setAction\(\{ kind: "toggle"/);
  assert.match(drawer, /onDelete=\{[\s\S]*?canMaintain \? \(segment\) => setAction\(\{ kind: "delete"/);
  assert.doesNotMatch(drawer, /onToggleEnabled=\{canWrite|onDelete=\{canWrite/);
  assert.match(segments, /<Switch[\s\S]*?disabled=\{disabled\}/);
  assert.match(segments, /<Button variant="ghost" size="sm" onClick=\{\(\) => onOpen\(segment\)\}>/);
  assert.match(segmentRoute, /const pending = isKnowledgeBaseDocumentProcessing\(document\)/);
  assert.match(segmentRoute, /disabled=\{!canMaintainDocument \|\| pending \|\| !!partialSave \|\| !!conflict\}/);
});

test("adapter and live save flow preserve required upload and content-hash contracts", () => {
  const contract = fs.readFileSync(path.join(registryRoot, "providers/service/knowledge-base.ts"), "utf8");
  const adapter = fs.readFileSync(path.join(registryRoot, "providers/service/knowledge-base-factory.ts"), "utf8");
  const segmentRoute = fs.readFileSync(path.join(registryRoot, "live/segment-route.tsx"), "utf8");
  const segmentComponents = fs.readFileSync(path.join(registryRoot, "components/segments.tsx"), "utf8");
  const upload = fs.readFileSync(path.join(registryRoot, "live/upload-controller.tsx"), "utf8");
  const documentHooks = fs.readFileSync(path.join(registryRoot, "hooks/use-knowledge-base-document.ts"), "utf8");
  const uploadComponents = fs.readFileSync(path.join(registryRoot, "components/upload.tsx"), "utf8");
  const workspace = fs.readFileSync(path.join(registryRoot, "live/workspace-page.tsx"), "utf8");
  const extension = fs.readFileSync(path.join(registryRoot, "extension.tsx"), "utf8");
  assert.match(contract, /in both the query and FormData/);
  assert.match(adapter, /getZipFilenameEncodingOptions/);
  assert.match(adapter, /zipFilenameEncoding\[\]/);
  assert.match(adapter, /createPresignedUrl/);
  assert.match(adapter, /knowledgeBaseDocsId: documentId/);
  const segmentActionBodies = adapter.slice(adapter.indexOf('"updateSegment"'));
  assert.doesNotMatch(segmentActionBodies, /body: \{ values:/);
  assert.match(
    segmentActionBodies,
    /"setEnabled", \{[\s\S]*?body: \{ knowledgeBaseKey, knowledgeBaseDocsId: documentId, segmentUid, enabled \}/,
  );
  assert.match(segmentActionBodies, /"regenerate", \{[\s\S]*?body: \{[\s\S]*?knowledgeBaseDocsId: documentId/);
  assert.match(contract, /segmentOptions\?: KnowledgeBaseSegmentOptions/);
  assert.match(adapter, /function toSegmentOptions/);
  assert.match(adapter, /segmentOptions \? \{ segmentOptions \} : \{\}/);
  assert.match(segmentRoute, /contentHash: contentSaved\.contentHash/);
  assert.match(segmentComponents, /Content saved; related questions were not saved/);
  assert.doesNotMatch(segmentComponents, /Optional segment title|onTitleChange/);
  assert.match(segmentRoute, /title: activeDraft\.title/);
  assert.match(segmentRoute, /title=\{t\("Edit segment"\)\}/);
  assert.doesNotMatch(segmentRoute, /Changes require the latest server content hash|onToggleEnabled|pendingToggle|setSegmentEnabled/);
  assert.match(segmentComponents, /t\("Related questions"\)/);
  assert.match(segmentComponents, /key=\{question\.id \?\? question\.hash \?\? index\}/);
  assert.doesNotMatch(segmentComponents, /key=\{question\.id \?\? question\.hash \?\? `\$\{question\.content\}-\$\{index\}`\}/);
  assert.doesNotMatch(segmentComponents, /<legend className="text-sm font-medium">Matched questions<\/legend>/);
  assert.doesNotMatch(segmentRoute, /document\.indexStatus === "PENDING"/);
  assert.match(upload, /useKnowledgeBaseDocument\(\{/);
  assert.match(documentHooks, /getUploadConstraints/);
  assert.match(documentHooks, /getZipFilenameEncodingOptions/);
  assert.match(upload, /new Set\(values\.map\(\(value\) => value\.trim\(\)\)\.filter\(Boolean\)\)/);
  assert.match(uploadComponents, /normalizeZipFilenameEncodings/);
  assert.match(uploadComponents, /split\(\/\[\\s,\]\+\//);
  assert.match(uploadComponents, /<Combobox[\s\S]*?multiple[\s\S]*?value=\{selectedItems\}/);
  assert.match(uploadComponents, /<ComboboxChips className="min-h-11 rounded-lg border-input/);
  assert.match(uploadComponents, /<ComboboxList>/);
  assert.match(uploadComponents, /<TooltipContent>[\s\S]*?decode filenames stored in ZIP archives/);
  assert.match(uploadComponents, /t\("Uses UTF-8 and \{\{encoding\}\} by default", \{/);
  assert.doesNotMatch(uploadComponents, /Upload a source document for this local knowledge base\.|Supported types:/);
  assert.doesNotMatch(uploadComponents, /file \? file\.name :/);
  assert.match(uploadComponents, /<Paperclip aria-hidden="true"/);
  assert.match(uploadComponents, /truncate text-xs text-muted-foreground/);
  assert.match(uploadComponents, /<DialogContent className="sm:max-w-2xl">/);
  assert.match(uploadComponents, /<UploadDocumentForm \{\.\.\.props\} formId=\{formId\} showSubmitButton=\{false\} \/>/);
  assert.match(uploadComponents, /t\("Cancel"\)[\s\S]*?<Button type="submit" form=\{formId\}[\s\S]*?t\("Submit"\)/);
  assert.match(
    extension,
    /path: "live\/:knowledgeBaseKey"[\s\S]*?children: \[[\s\S]*?path: "upload"/,
  );
  assert.doesNotMatch(extension, /path: "live\/:knowledgeBaseKey\/upload"/);
  assert.match(workspace, /onDocumentsRefresh: documents\.retry/);
  assert.match(
    workspace,
    /to=\{`\$\{knowledgeBaseLiveRoutes\.upload\(base\.data\.key\)\}\$\{location\.search\}\$\{location\.hash\}`\}/,
  );
  assert.match(upload, /outletContext\?\.onDocumentsRefresh\(\)/);
});
