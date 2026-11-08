/**
 * The kind of SWR hook that wrote a cache entry.
 *
 * SWR stores `useSWRInfinite` and `useSWRSubscription` entries under
 * prefixed keys, so the panel can label them.
 */
export type KeyKind = 'standard' | 'infinite' | 'subscription';

export function getKeyKind(key: string): KeyKind {
  if (key.startsWith('$inf$')) return 'infinite';
  if (key.startsWith('$sub$')) return 'subscription';
  return 'standard';
}
