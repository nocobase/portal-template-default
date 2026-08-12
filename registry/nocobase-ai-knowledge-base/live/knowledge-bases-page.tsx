import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import {
  KnowledgeBaseDirectoryEmpty,
  KnowledgeBaseDirectoryError,
  KnowledgeBaseDirectoryFilteredEmpty,
  KnowledgeBaseDirectorySkeleton,
  KnowledgeBaseSwitchableDirectory,
  PaginatedKnowledgeBaseSwitchableDirectory,
} from "../components";
import { useKnowledgeBase } from "../hooks";
import { knowledgeBaseLiveRoutes } from "../routes";
import { liveListSearch, liveLocationPath, parseLiveListState } from "./url-state";
import { useT } from "../locales";

function InfiniteCardLoadTrigger({
  hasMore,
  loading,
  error,
  onLoadMore,
  onRetry,
  loadingLabel,
  errorLabel,
  retryLabel,
}: {
  hasMore: boolean;
  loading: boolean;
  error: unknown;
  onLoadMore: () => void;
  onRetry: () => void;
  loadingLabel: string;
  errorLabel: string;
  retryLabel: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore || loading || error || typeof IntersectionObserver === "undefined") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [error, hasMore, loading, onLoadMore]);

  if (error) {
    return (
      <div className="flex items-center justify-center gap-3 py-4" role="alert">
        <p className="text-sm text-muted-foreground">{errorLabel}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      </div>
    );
  }
  if (!hasMore) return null;
  return (
    <div ref={sentinelRef} className="flex h-10 items-center justify-center" role="status" aria-live="polite">
      {loading ? <span className="text-sm text-muted-foreground">{loadingLabel}</span> : null}
    </div>
  );
}
export default function LiveKnowledgeBasesPage() {
  const t = useT();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = parseLiveListState(params);
  const update = useCallback(
    (next: Partial<typeof state>) =>
      navigate(
        { pathname: location.pathname, search: liveListSearch({ ...state, ...next }), hash: location.hash },
        { replace: true },
      ),
    [location.hash, location.pathname, navigate, state],
  );
  const isCardView = state.view === "cards";
  const knowledgeBase = useKnowledgeBase({
    directory: {
      mode: isCardView ? "infinite" : "paginated",
      page: state.page,
      pageSize: state.pageSize,
      query: state.query,
    },
  });
  const listResult = knowledgeBase.directory.paginated;
  const cardResult = knowledgeBase.directory.infinite;
  const rows = isCardView ? cardResult.rows : (listResult.data?.rows ?? []);
  const loading = isCardView ? cardResult.loading : listResult.loading && !listResult.data;
  const error = isCardView ? cardResult.error : listResult.error;
  const retry = isCardView ? cardResult.retry : listResult.retry;
  if (loading) {
    return (
      <main className="pb-12">
        <KnowledgeBaseDirectorySkeleton />
      </main>
    );
  }
  if (error && !rows.length) {
    return (
      <main className="pb-12">
        <KnowledgeBaseDirectoryError error={error} onRetry={retry} />
      </main>
    );
  }
  if (!isCardView && !listResult.data) {
    return (
      <main className="pb-12">
        <KnowledgeBaseDirectorySkeleton />
      </main>
    );
  }
  return (
    <main className="space-y-5 pb-12">
      <header>
        <h1 className="font-heading text-2xl font-semibold">
          {t("Knowledge bases")}
        </h1>
        <p className="text-muted-foreground">
          {t("View the knowledge bases you can access and manage permitted content.")}
        </p>
      </header>
      {!rows.length ? (
        state.query ? (
          <KnowledgeBaseDirectoryFilteredEmpty
            onClear={() => update({ query: "", page: 1 })}
          />
        ) : (
          <KnowledgeBaseDirectoryEmpty />
        )
      ) : isCardView ? (
        <div className="space-y-4">
          <KnowledgeBaseSwitchableDirectory
            items={rows}
            query={state.query}
            onQueryChange={(query) => update({ query, page: 1 })}
            view={state.view}
            onViewChange={(view) => update({ view, page: view === "cards" ? 1 : state.page })}
            onItemOpen={(item) =>
              navigate(knowledgeBaseLiveRoutes.workspace(item.key), {
                state: { from: liveLocationPath(location) },
              })
            }
          />
          <InfiniteCardLoadTrigger
            hasMore={cardResult.hasMore}
            loading={cardResult.loadingMore}
            error={cardResult.error}
            onLoadMore={cardResult.loadMore}
            onRetry={cardResult.retry}
            loadingLabel={t("Loading more knowledge bases…")}
            errorLabel={t("Unable to load more knowledge bases.")}
            retryLabel={t("Retry")}
          />
        </div>
      ) : (
        <PaginatedKnowledgeBaseSwitchableDirectory
          items={rows}
          query={state.query}
          onQueryChange={(query) => update({ query, page: 1 })}
          view={state.view}
          onViewChange={(view) => update({ view, page: view === "cards" ? 1 : state.page })}
          onItemOpen={(item) =>
            navigate(knowledgeBaseLiveRoutes.workspace(item.key), {
              state: { from: liveLocationPath(location) },
            })
          }
          pagination={{
            page: listResult.data!.page,
            pageSize: listResult.data!.pageSize,
            total: listResult.data!.count,
            onPageChange: (page) => update({ page }),
            onPageSizeChange: (pageSize) => update({ pageSize, page: 1 }),
          }}
        />
      )}
    </main>
  );
}
