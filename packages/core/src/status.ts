import type { State } from 'swr';

/**
 * What a cache entry is doing, for the panel's status badge.
 *
 * `idle` covers an entry with no data, no error and no request in flight,
 * e.g. after `mutate(key, undefined)`.
 */
export type KeyStatus = 'loading' | 'validating' | 'error' | 'success' | 'idle';

export function getStatus(state: State): KeyStatus {
  // A request in flight wins: that's what's happening right now, even if an
  // older error or data is still in the entry.
  if (state.isLoading) return 'loading';
  if (state.isValidating) return 'validating';
  if (state.error !== undefined) return 'error';
  if (state.data !== undefined) return 'success';
  return 'idle';
}
