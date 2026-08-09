import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { nocobaseClient } from "@nocobase/portal-sdk/client";

import {
  getMySpaces,
  setDefaultSpace,
  SPACES_KEY,
  SPACES_VIEW_KEY,
} from "./space-api";
import type { SpaceRecord, SpaceState } from "./types";

const Context = createContext<SpaceState | undefined>(undefined);

const read = (key: string) =>
  typeof localStorage === "undefined"
    ? []
    : (localStorage.getItem(key) || "").split(",").filter(Boolean);

const write = (key: string, values: string[]) =>
  localStorage.setItem(key, values.join(","));

export function MultiSpaceProvider({ children }: PropsWithChildren) {
  const [spaces, setSpaces] = useState<SpaceRecord[]>([]);
  const [current, setCurrent] = useState<string[]>(() => read(SPACES_KEY));
  const [viewed, setViewed] = useState<string[]>(() => read(SPACES_VIEW_KEY));
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [headersReady, setHeadersReady] = useState(false);
  const currentRef = useRef(current);
  const viewedRef = useRef(viewed);
  currentRef.current = current;
  viewedRef.current = viewed;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const state = await getMySpaces();
      const names = new Set(state.spaces.map((item) => item.name));
      const nextCurrent = [state.defaultSpaceName, ...read(SPACES_KEY)]
        .filter(
          (item): item is string => Boolean(item) && names.has(item as string)
        )
        .slice(0, 1);
      const resolved = nextCurrent.length
        ? nextCurrent
        : state.spaces[0]
          ? [state.spaces[0].name]
          : [];
      const nextViewed = state.viewableSpaceNames.filter((name: string) =>
        names.has(name)
      );

      setSpaces(state.spaces);
      setCurrent(resolved);
      setViewed(nextViewed.length ? nextViewed : resolved);
      write(SPACES_KEY, resolved);
      write(SPACES_VIEW_KEY, nextViewed.length ? nextViewed : resolved);
    } catch {
      // Keep the Portal usable when the server plugin is unavailable. The
      // administration page will surface its own API error with more context.
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  useLayoutEffect(() => {
    const remove = nocobaseClient.addHeaderProvider(() => ({
      [SPACES_KEY]: currentRef.current.join(",") || undefined,
      [SPACES_VIEW_KEY]: viewedRef.current.join(",") || undefined,
    }));
    setHeadersReady(true);
    return remove;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchSpace = useCallback(async (name: string) => {
    const next = [name];
    await setDefaultSpace(name, next);
    setCurrent(next);
    setViewed(next);
    write(SPACES_KEY, next);
    write(SPACES_VIEW_KEY, next);
    window.location.reload();
  }, []);

  const value = useMemo(
    () => ({ spaces, current, viewed, loading, switchSpace, refresh }),
    [spaces, current, viewed, loading, switchSpace, refresh]
  );

  return (
    <Context.Provider value={value}>
      {headersReady && initialized ? children : null}
    </Context.Provider>
  );
}

export function useMultiSpace() {
  const value = useContext(Context);
  if (!value) {
    throw new Error("useMultiSpace must be used under MultiSpaceProvider");
  }
  return value;
}
