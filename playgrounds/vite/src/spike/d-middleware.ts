import { useEffect } from 'react';
import type { Middleware } from 'swr';
import { unstable_serialize } from 'swr';
import { record } from './log.ts';

/**
 * SPIKE (#5) approach D: SWR middleware runs around every hook call.
 * It knows which hooks are mounted for which key, but never sees the cache
 * writes themselves (fetch results, mutate, revalidation).
 */
export const mountTracker: Middleware = (useSWRNext) => (key, fetcher, config) => {
  const serialized = typeof key === 'function' ? '(key function)' : unstable_serialize(key);
  useEffect(() => {
    record({ approach: 'D: middleware', kind: 'mount', key: serialized });
    return () => record({ approach: 'D: middleware', kind: 'unmount', key: serialized });
  }, [serialized]);
  return useSWRNext(key, fetcher, config);
};
