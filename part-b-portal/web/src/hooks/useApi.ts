import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

/**
 * Fetch `path` and re-fetch whenever any value in `deps` changes (e.g. a live
 * revision bump, a filter, or pagination). Tracks load time so we can prove the
 * sub-1s requirement in the UI.
 */
export function useApi<T>(path: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const reqId = useRef(0);

  const run = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const r = await api<T>(path);
      if (id === reqId.current) {
        setData(r);
        setMs(Math.round(performance.now() - t0));
      }
    } catch (e) {
      if (id === reqId.current) setError((e as Error).message);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, ms, refetch: run };
}
