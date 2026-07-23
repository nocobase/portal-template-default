import { useCallback, useEffect, useRef, useState } from "react";
import type { AIConfigurationStatus, AIConversation, AIProviderMode } from "./types";

export function useConversationCatalog({
  mode,
  configurationStatus,
  initialConversations,
  listConversations,
  onChange,
  onError,
}: {
  mode: AIProviderMode;
  configurationStatus: AIConfigurationStatus;
  initialConversations: AIConversation[];
  listConversations: (keyword?: string) => Promise<AIConversation[]>;
  onChange: (conversations: AIConversation[]) => void;
  onError: (error?: Error) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef("");
  const requestRef = useRef(0);
  const catalogRef = useRef(initialConversations);

  const apply = useCallback(
    (conversations: AIConversation[], keyword = searchRef.current) => {
      if (!keyword) catalogRef.current = conversations;
      onChange(conversations);
    },
    [onChange]
  );

  const refresh = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const keyword = searchRef.current;
    const conversations = await listConversations(keyword);
    if (requestRef.current === requestId) apply(conversations, keyword);
    return conversations;
  }, [apply, listConversations]);

  useEffect(() => {
    if (mode !== "nocobase" || configurationStatus !== "ready") return;
    let active = true;
    setLoading(true);
    onError(undefined);
    void listConversations()
      .then((conversations) => {
        if (!active || searchRef.current) return;
        apply(conversations, "");
      })
      .catch((error: unknown) => {
        if (!active) return;
        onError(
          error instanceof Error
            ? error
            : new Error("Unable to load conversations")
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apply, configurationStatus, listConversations, mode, onError]);

  const searchConversations = useCallback(
    async (keyword: string) => {
      const normalizedKeyword = keyword.trim();
      setSearch(keyword);
      searchRef.current = normalizedKeyword;

      if (mode === "mock") {
        const normalizedSearch = normalizedKeyword.toLocaleLowerCase();
        onChange(
          normalizedSearch
            ? catalogRef.current.filter((conversation) =>
                conversation.title
                  .toLocaleLowerCase()
                  .includes(normalizedSearch)
              )
            : catalogRef.current
        );
        return;
      }

      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setLoading(true);
      onError(undefined);
      try {
        const conversations = await listConversations(normalizedKeyword);
        if (requestRef.current !== requestId) return;
        apply(conversations, normalizedKeyword);
      } catch (error) {
        if (requestRef.current !== requestId) return;
        const resolvedError =
          error instanceof Error
            ? error
            : new Error("Unable to search conversations");
        onError(resolvedError);
        throw resolvedError;
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    },
    [apply, listConversations, mode, onChange, onError]
  );

  const reset = useCallback(
    (conversations: AIConversation[]) => {
      requestRef.current += 1;
      searchRef.current = "";
      catalogRef.current = conversations;
      setSearch("");
      setLoading(false);
    },
    []
  );

  const updateCatalog = useCallback(
    (updater: (conversations: AIConversation[]) => AIConversation[]) => {
      catalogRef.current = updater(catalogRef.current);
    },
    []
  );

  return {
    loading,
    search,
    searchRef,
    refresh,
    reset,
    searchConversations,
    updateCatalog,
  };
}
