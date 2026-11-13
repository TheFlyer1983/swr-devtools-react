import type { Cache, ScopedMutator } from 'swr';

/** What the panel can do to a key. Keys are raw cache keys from the reader. */
export interface CacheActions {
  /** Refetches the key through its mounted hook. No-op without one. */
  revalidate: (key: string) => Promise<void>;
  /**
   * Removes the key. Mounted hooks re-render with no data, except hooks using
   * `keepPreviousData`, which keep showing their last data until they next
   * fetch: SWR keeps that copy inside the hook and has no per-key way to drop
   * it.
   */
  remove: (key: string) => Promise<void>;
  /**
   * Removes every key, including infinite and subscription keys, without
   * refetching. On SWR 2.5+, which has `unload`, it also drops data kept by
   * `keepPreviousData`. Older versions have the same limit as `remove`.
   */
  clearAll: () => Promise<void>;
  /** Replaces the key's data without refetching. */
  setData: (key: string, data: unknown) => Promise<void>;
}

/** The parts of `useSWRConfig()` the actions use. */
export interface CacheActionsConfig {
  cache: Cache;
  mutate: ScopedMutator;
  /**
   * SWR's cache-bound `unload`, added in SWR 2.5. Typed here rather than
   * imported, because older versions don't export the `Unloader` type.
   */
  unload?: (options?: { revalidate?: boolean }) => void;
}

/**
 * Creates the panel's actions for one SWR cache. Pass `useSWRConfig()`.
 *
 * Raw cache keys work with `mutate` because SWR serialises a string key to
 * itself, so `@"/api/posts",1,` targets the same entry.
 */
export function createCacheActions({ cache, mutate, unload }: CacheActionsConfig): CacheActions {
  const remove = async (key: string) => {
    if (cache.get(key) === undefined) return;
    // cache.delete alone doesn't notify mounted hooks (see the
    // cache-observation spike), so clear the data through mutate first.
    await mutate(key, undefined, { revalidate: false });
    cache.delete(key);
  };

  return {
    async revalidate(key) {
      // One argument only: SWR treats `mutate(key)` as "refetch".
      await mutate(key);
    },
    remove,
    async clearAll() {
      if (typeof unload === 'function') {
        // SWR's own way to empty the cache: it also cancels in-flight
        // requests and drops data kept by keepPreviousData.
        unload({ revalidate: false });
        return;
      }
      // Older SWR: remove keys one by one, since the filter form of mutate
      // skips infinite and subscription keys.
      await Promise.all([...cache.keys()].map(remove));
    },
    async setData(key, data) {
      await mutate(key, data, { revalidate: false });
    }
  };
}
