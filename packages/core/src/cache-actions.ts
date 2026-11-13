import type { Cache, ScopedMutator } from 'swr';

/** What the panel can do to a key. Keys are raw cache keys from the reader. */
export interface CacheActions {
  /** Refetches the key through its mounted hook. No-op without one. */
  revalidate: (key: string) => Promise<void>;
  /** Removes the key. Mounted hooks re-render with no data. */
  remove: (key: string) => Promise<void>;
  /** Removes every key, including infinite and subscription keys. */
  clearAll: () => Promise<void>;
  /** Replaces the key's data without refetching. */
  setData: (key: string, data: unknown) => Promise<void>;
}

/**
 * Creates the panel's actions for one SWR cache, using the `cache` and
 * `mutate` from `useSWRConfig()`.
 *
 * Raw cache keys work with `mutate` because SWR serialises a string key to
 * itself, so `@"/api/posts",1,` targets the same entry.
 */
export function createCacheActions(cache: Cache, mutate: ScopedMutator): CacheActions {
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
      // SWR's filter form of mutate skips infinite and subscription keys, so
      // remove each key ourselves.
      await Promise.all([...cache.keys()].map(remove));
    },
    async setData(key, data) {
      await mutate(key, data, { revalidate: false });
    }
  };
}
