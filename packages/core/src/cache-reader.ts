import type { Cache, State } from 'swr';
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
  /** When the reader first saw this version of the entry (ms since epoch). */
  updatedAt: number;
}

export interface CacheReader {
  /** Reads every key in the cache, in the cache's own order. */
  read(cache: Cache, now?: number): CacheEntry[];
}

/**
 * Creates a reader that turns an SWR cache into a list of entries.
 *
 * SWR doesn't record when an entry changed, so the reader remembers each
 * entry object it has seen. SWR replaces the object on every write, so a new
 * object means the key was updated at `now`. Call `read` whenever the cache
 * changes (see the cache-observation spike) to keep timestamps accurate.
 */
export function createCacheReader(): CacheReader {
  const seen = new Map<string, { state: State; updatedAt: number }>();

  return {
    read(cache, now = Date.now()) {
      const entries: CacheEntry[] = [];
      const present = new Set<string>();

      for (const key of cache.keys()) {
        const state = cache.get(key);
        if (!state) continue;
        present.add(key);

        let record = seen.get(key);
        if (record?.state !== state) {
          record = { state, updatedAt: now };
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
