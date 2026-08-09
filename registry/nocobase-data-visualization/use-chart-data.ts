import { useCallback, useEffect, useRef, useState } from "react";

import { queryChartData } from "./chart-api";
import type { ChartQuery, ChartRow } from "./types";

function toError(reason: unknown) {
  return reason instanceof Error ? reason : new Error(String(reason));
}

export function useChartData(query: ChartQuery) {
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const serializedQuery = JSON.stringify(query);

  const load = useCallback(
    async (refresh = false) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setLoading(true);
      setError(undefined);
      try {
        const data = await queryChartData({ ...query, refresh }, controller.signal);
        if (requestRef.current === requestId) setRows(data);
        return data;
      } catch (reason) {
        if (controller.signal.aborted) return [];
        const nextError = toError(reason);
        if (requestRef.current === requestId) setError(nextError);
        throw nextError;
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    },
    // serializedQuery intentionally gives callers value-based request stability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serializedQuery]
  );

  useEffect(() => {
    load().catch(() => undefined);
    return () => controllerRef.current?.abort();
  }, [load]);

  return { rows, loading, error, refresh: () => load(true) };
}
