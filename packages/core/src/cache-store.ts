import type { Cache } from 'swr';
import { createCacheReader, type CacheEntry } from './cache-reader.ts';
import { readHookCounts } from './hook-counts.ts';
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

/** How often, in ms, to check for hooks that unmounted. */
const HOOK_CHECK_INTERVAL = 500;

/**
 * Creating a store only reads the cache. The patch is installed in
 * `subscribe`, which React calls after committing, so a render that React
 * discards can't leave the cache patched.
 *
 * A hook mounting writes to the cache, so the patch sees it. A hook
 * unmounting writes nothing, so hook counts are also checked on an interval.
 */
export function createCacheStore(cache: Cache): CacheStore {
  const reader = createCacheReader();
  let entries = reader.read(cache);
  let mode: CacheObserverMode = 'patch';

  return {
    subscribe: (onChange) => {
      const refresh = () => {
        entries = reader.read(cache);
        onChange();
      };
      const observer = observeCache(cache, refresh);
      mode = observer.mode;
      // Writes between creating the store and subscribing weren't observed.
      entries = reader.read(cache);

      const timer = setInterval(() => {
        if (hookCountsChanged(entries, readHookCounts(cache))) refresh();
      }, HOOK_CHECK_INTERVAL);

      return () => {
        clearInterval(timer);
        observer.unsubscribe();
      };
    },
    getSnapshot: () => entries,
    getMode: () => mode
  };
}

function hookCountsChanged(
  entries: CacheEntry[],
  counts: ReadonlyMap<string, number> | undefined
): boolean {
  return entries.some((entry) => entry.hooks !== (counts && (counts.get(entry.key) ?? 0)));
}
