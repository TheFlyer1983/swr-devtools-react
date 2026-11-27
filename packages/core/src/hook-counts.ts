import type { Cache } from 'swr';
import { SWRGlobalState } from 'swr/_internal';

/**
 * Counts the mounted hooks per key, or returns `undefined` when SWR's hook
 * registry can't be read, e.g. before `<SWRConfig>` has set up the cache.
 *
 * Every mounted `useSWR` (and so `useSWRInfinite` and `useSWRSubscription`,
 * under their `$inf$`/`$sub$` keys) adds one revalidator under its key to
 * `EVENT_REVALIDATORS`, the first item of SWR's state for the cache, and
 * removes it on unmount. This is undocumented, so anything that doesn't look
 * like it gives `undefined`, never a wrong count. Keys without a mounted hook
 * are left out.
 */
export function readHookCounts(cache: Cache): Map<string, number> | undefined {
  const state: unknown = SWRGlobalState.get(cache);
  if (!Array.isArray(state)) return undefined;
  const revalidators: unknown = state[0];
  if (!isPlainRecord(revalidators)) return undefined;

  const counts = new Map<string, number>();
  for (const [key, callbacks] of Object.entries(revalidators)) {
    if (!Array.isArray(callbacks)) return undefined;
    if (callbacks.length > 0) counts.set(key, callbacks.length);
  }
  return counts;
}

/**
 * SWR's registry is `Object.create(null)`. A Map or other container would
 * enumerate as empty and mark every key unused, so it doesn't count.
 */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}
