import type { Cache } from 'swr';
import { record, summarize } from './log.ts';

/**
 * SPIKE (#5) approach A: give SWR a cache that reports its own writes.
 *
 * SWR funnels every write (useSWR, useSWRInfinite, useSWRSubscription, mutate)
 * through a single internal setter that calls `provider.set(key, value)`, and
 * only `unload()` calls `provider.delete`. Wrapping those two methods sees all
 * of them. Usage: <SWRConfig value={{ provider: observableProvider }}>.
 */
export function createObservableCache(): Cache {
  const map = new Map<string, any>();
  return {
    keys: () => map.keys(),
    get: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
      record({ approach: 'A: wrapped provider', kind: 'set', key, summary: summarize(value) });
    },
    delete: (key) => {
      map.delete(key);
      record({ approach: 'A: wrapped provider', kind: 'delete', key });
    }
  };
}
