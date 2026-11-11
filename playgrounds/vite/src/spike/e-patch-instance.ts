import { useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { record, summarize } from './log.ts';

/**
 * SPIKE (#5) approach E: wrap the existing cache object's set/delete in place.
 *
 * No new provider (avoids vercel/swr#2771) and no private tuple indexes: the
 * `cache` from useSWRConfig() is the object SWR calls `provider.set()` on, so
 * an own-property wrapper on that instance sees every write.
 */
export function usePatchedCacheObserver(): void {
  const { cache } = useSWRConfig();
  useEffect(() => {
    const target = cache as typeof cache & { set: typeof cache.set; delete: typeof cache.delete };
    const originalSet = target.set;
    const originalDelete = target.delete;
    target.set = function (key, value) {
      originalSet.call(this, key, value);
      record({ approach: 'E: patch instance', kind: 'set', key, summary: summarize(value) });
    };
    target.delete = function (key) {
      originalDelete.call(this, key);
      record({ approach: 'E: patch instance', kind: 'delete', key });
    };
    return () => {
      target.set = originalSet;
      target.delete = originalDelete;
    };
  }, [cache]);
}
