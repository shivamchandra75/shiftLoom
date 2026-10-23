import { useEffect, useRef, useState } from "react";

interface Options {
  minLength?: number;
  delay?: number;
  enabled?: boolean;
}

interface SearchState<T> {
  results: T[];
  loading: boolean;
  error: string;
}

const IDLE = { results: [], loading: false, error: "" };

// Debounced search-as-you-type: waits `delay` ms after the last keystroke, cancels the
// in-flight request when the query changes, and caches results per query for this screen.
export function useDebouncedSearch<T>(
  query: string,
  search: (q: string, signal: AbortSignal) => Promise<T[]>,
  { minLength = 3, delay = 350, enabled = true }: Options = {}
): SearchState<T> {
  const [state, setState] = useState<SearchState<T>>(IDLE);
  const cache = useRef(new Map<string, T[]>());
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!enabled || q.length < minLength) return setState(IDLE);

    const hit = cache.current.get(q);
    if (hit) return setState({ results: hit, loading: false, error: "" });

    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: "" }));
    const timer = setTimeout(async () => {
      try {
        const results = await searchRef.current(q, controller.signal);
        cache.current.set(q, results);
        setState({ results, loading: false, error: "" });
      } catch (e: any) {
        if (controller.signal.aborted) return;
        const error = e?.message === "Network request failed" ? "No internet connection." : e?.message || "Search failed.";
        setState({ results: [], loading: false, error });
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled, minLength, delay]);

  return state;
}
