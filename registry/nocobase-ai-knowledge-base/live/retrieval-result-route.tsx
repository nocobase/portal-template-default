import { useLocation, useOutletContext, useParams } from "react-router";
import { RouteDrawer } from "@/extensions/nocobase-route-surfaces";
import { RetrievalResultDetail } from "../components";
import { knowledgeBaseLiveRoutes } from "../routes";
import type { KnowledgeBaseWorkspaceOutletContext } from "./knowledge-base-workspace-page";
import { liveReturnTo } from "./url-state";
import { useT } from "../locales";

export default function RetrievalResultRoute() {
  const t = useT();
  const { knowledgeBaseKey, resultIndex } = useParams();
  const location = useLocation();
  const { retrievalResults } =
    useOutletContext<KnowledgeBaseWorkspaceOutletContext>();
  const index = Number.parseInt(resultIndex || "", 10);
  const result = Number.isInteger(index) ? retrievalResults[index] : undefined;
  const fallback = knowledgeBaseKey
    ? `${knowledgeBaseLiveRoutes.workspace(knowledgeBaseKey)}${location.search}${location.hash}`
    : knowledgeBaseLiveRoutes.list;
  const closeTo = knowledgeBaseKey
    ? liveReturnTo(location.state, fallback, knowledgeBaseLiveRoutes.workspace(knowledgeBaseKey))
    : fallback;

  return (
    <RouteDrawer title={result?.title || result?.filename || t("Retrieval result")} closeLabel={t("Close")} closeTo={closeTo}>
      <div className="p-5">
        <RetrievalResultDetail result={result} showTitle={false} />
      </div>
    </RouteDrawer>
  );
}
