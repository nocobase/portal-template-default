import { nocobaseClient } from "@nocobase/portal-sdk/client";
import { createKnowledgeBaseService } from "./knowledge-base-factory";

export { createKnowledgeBaseService } from "./knowledge-base-factory";

/** The default Knowledge base workspace integration for compatible user-side Knowledge Base actions. */
export const knowledgeBaseService = createKnowledgeBaseService(nocobaseClient);
