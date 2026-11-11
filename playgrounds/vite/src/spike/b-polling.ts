import { useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { record, summarize } from './log.ts';

/**
 * SPIKE (#5) approach B: re-read the cache on a timer and diff snapshots.
 * Needs no setup, but only sees the state at each tick.
 */
export function usePollingObserver(intervalMs: number): void {
  const { cache } = useSWRConfig();
  useEffect(() => {
    let previous = new Map<string, unknown>();
    const tick = () => {
      const start = performance.now();
      const next = new Map<string, unknown>();
      for (const key of cache.keys()) {
        const value = cache.get(key);
        next.set(key, value);
        // SWR replaces the entry object on every write, so reference equality
        // is enough to detect a change.
        if (previous.get(key) !== value) {
          record({ approach: 'B: polling', kind: 'poll-diff', key, summary: summarize(value) });
        }
      }
      for (const key of previous.keys()) {
        if (!next.has(key)) record({ approach: 'B: polling', kind: 'delete', key });
      }
      previous = next;
      pollCost.push(performance.now() - start);
    };
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [cache, intervalMs]);
}

/** Time spent per poll, in ms, for the measurements. */
export const pollCost: number[] = [];
(window as unknown as { __pollCost: number[] }).__pollCost = pollCost;
