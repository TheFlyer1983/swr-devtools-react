import type { Cache } from 'swr';
import { createCacheReader, type CacheEntry } from './cache-reader.ts';
import { observeCache, type CacheObserverMode } from './observe-cache.ts';

/**
 * The SWR cache as an external store: the shape React's
 * `useSyncExternalStore` expects, but with no React dependency.
 */
export interface CacheStore {
  // Properties, not methods, so they can be passed to useSyncExternalStore
  // without binding.
  /** Starts observing the cache. Returns a function that stops. */
  subscribe: (onChange: () => void) => () => void;
  /** The current entries. The same array until the cache changes. */
  getSnapshot: () => CacheEntry[];
  /** How the latest subscription observes the cache. */
  getMode: () => CacheObserverMode;
}

/**
 * Creating a store only reads the cache. The patch is installed in
 * `subscribe`, which React calls after committing, so a render that React
 * discards can't leave the cache patched.
 */
export function createCacheStore(cache: Cache): CacheStore {
  const reader = createCacheReader();
  let entries = reader.read(cache);
  let mode: CacheObserverMode = 'patch';

  return {
    subscribe: (onChange) => {
      const observer = observeCache(cache, () => {
        entries = reader.read(cache);
        onChange();
      });
      mode = observer.mode;
      // Writes between creating the store and subscribing weren't observed.
      entries = reader.read(cache);
      return observer.unsubscribe;
    },
    getSnapshot: () => entries,
    getMode: () => mode
  };
}
