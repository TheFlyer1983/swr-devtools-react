import type { Cache } from 'swr';
import { SWRGlobalState } from 'swr/_internal';
import { record, summarize } from './log.ts';

/**
 * SPIKE (#5) approach C: patch SWR's private global state.
 *
 * SWRGlobalState is a WeakMap from cache -> an internal tuple. Index 5 is the
 * setter every hook calls. Replacing it sees every write with no user setup,
 * but depends on an undocumented tuple layout that can change in any release.
 */
export function patchInternals(cache: Cache): boolean {
  const state = SWRGlobalState.get(cache);
  if (!state) return false;
  const original = state[5];
  state[5] = (key: string, value: unknown, prev: unknown) => {
    original(key, value, prev);
    record({ approach: 'C: internals', kind: 'set', key, summary: summarize(value) });
  };
  return true;
}
