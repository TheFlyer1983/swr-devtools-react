import type { CacheEntry } from './cache-reader.ts';
import type { KeyStatus } from './status.ts';

/** What the key list can be sorted by. */
export type SortBy = 'key' | 'status' | 'updated';

/** Problems first, then requests in flight, then settled keys. */
const STATUS_ORDER: Record<KeyStatus, number> = {
  error: 0,
  loading: 1,
  validating: 2,
  success: 3,
  idle: 4
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const byLabel = (a: CacheEntry, b: CacheEntry): number =>
  collator.compare(a.label, b.label) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

const comparators: Record<SortBy, (a: CacheEntry, b: CacheEntry) => number> = {
  key: byLabel,
  status: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || byLabel(a, b),
  // Newest first: the key that just changed is usually the one you want.
  updated: (a, b) => b.updatedAt - a.updatedAt || byLabel(a, b)
};

/**
 * Returns the entries in a new array, sorted by key (A to Z, numbers in
 * order), status (errors first) or last updated (newest first). Ties fall
 * back to the key, so the order is stable as the cache changes.
 */
export function sortEntries(entries: readonly CacheEntry[], by: SortBy): CacheEntry[] {
  return entries.toSorted(comparators[by]);
}

/**
 * Keeps the entries whose label contains the query, ignoring case and
 * surrounding spaces. An empty query keeps every entry.
 */
export function filterEntries(entries: readonly CacheEntry[], query: string): CacheEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...entries];
  return entries.filter((entry) => entry.label.toLowerCase().includes(needle));
}
