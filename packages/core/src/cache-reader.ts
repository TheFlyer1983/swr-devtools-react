import type { Cache } from 'swr';
import { formatKey } from './format-key.ts';
import { getKeyKind, type KeyKind } from './key-kind.ts';
import { getStatus, type KeyStatus } from './status.ts';

/** One SWR cache key, as the panel shows it. */
export interface CacheEntry {
  /** The raw cache key, for actions such as `mutate(key)`. */
  key: string;
  /** The key formatted for display, without the infinite/subscription prefix. */
  label: string;
  kind: KeyKind;
  status: KeyStatus;
  data: unknown;
  error: unknown;
  isLoading: boolean;
  isValidating: boolean;
  /** When the reader first saw the current data or error (ms since epoch). */
  updatedAt: number;
}

export interface CacheReader {
  /** Reads every key in the cache, in the cache's own order. */
  read(cache: Cache, now?: number): CacheEntry[];
}

/**
 * Creates a reader that turns an SWR cache into a list of entries.
 *
 * SWR doesn't record when data changed, so the reader remembers the `data`
 * and `error` objects it last saw per key. Request-state writes (e.g.
 * `isValidating`) keep the same `data` object, and SWR also keeps it when a
 * refetch returns equal data, so a different object means the data really
 * changed at `now`. Call `read` whenever the cache changes (see the
 * cache-observation spike) to keep timestamps accurate.
 */
export function createCacheReader(): CacheReader {
  const seen = new Map<string, { data: unknown; error: unknown; updatedAt: number }>();

  return {
    read(cache, now = Date.now()) {
      const entries: CacheEntry[] = [];
      const present = new Set<string>();

      for (const key of cache.keys()) {
        const state = cache.get(key);
        if (!state) continue;
        present.add(key);

        let record = seen.get(key);
        if (!record || record.data !== state.data || record.error !== state.error) {
          record = { data: state.data, error: state.error, updatedAt: now };
          seen.set(key, record);
        }

        entries.push({
          key,
          label: formatKey(key),
          kind: getKeyKind(key),
          status: getStatus(state),
          data: state.data,
          error: state.error,
          isLoading: state.isLoading ?? false,
          isValidating: state.isValidating ?? false,
          updatedAt: record.updatedAt
        });
      }

      for (const key of seen.keys()) {
        if (!present.has(key)) seen.delete(key);
      }
      return entries;
    }
  };
}
