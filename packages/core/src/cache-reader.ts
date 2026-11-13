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
  /** When the data was last fetched successfully or changed (ms since epoch). */
  updatedAt: number;
}

export interface CacheReader {
  /** Reads every key in the cache, in the cache's own order. */
  read(cache: Cache, now?: number): CacheEntry[];
}

/**
 * Creates a reader that turns an SWR cache into a list of entries.
 *
 * SWR doesn't record when data was last fetched, so the reader remembers
 * the `data` object and `isValidating` flag it last saw per key. The time
 * moves on when:
 * - a request finishes without an error (`isValidating` true → false). SWR
 *   keeps the same `data` object when a refetch returns equal data, so this
 *   is the only way to see that refetch.
 * - the data object changes, e.g. through `mutate(key, data)`.
 * A failed refetch keeps the old time, so old data never looks fresh. Call
 * `read` whenever the cache changes (see the cache-observation spike) to
 * keep timestamps accurate.
 */
export function createCacheReader(): CacheReader {
  const seen = new Map<string, { data: unknown; isValidating: boolean; updatedAt: number }>();

  return {
    read(cache, now = Date.now()) {
      const entries: CacheEntry[] = [];
      const present = new Set<string>();

      for (const key of cache.keys()) {
        const state = cache.get(key);
        if (!state) continue;
        present.add(key);

        const isValidating = state.isValidating ?? false;
        const previous = seen.get(key);
        const fetched = previous?.isValidating && !isValidating && state.error === undefined;
        const updatedAt =
          !previous || previous.data !== state.data || fetched ? now : previous.updatedAt;
        seen.set(key, { data: state.data, isValidating, updatedAt });

        entries.push({
          key,
          label: formatKey(key),
          kind: getKeyKind(key),
          status: getStatus(state),
          data: state.data,
          error: state.error,
          isLoading: state.isLoading ?? false,
          isValidating,
          updatedAt
        });
      }

      for (const key of seen.keys()) {
        if (!present.has(key)) seen.delete(key);
      }
      return entries;
    }
  };
}
