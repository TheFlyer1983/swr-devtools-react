import { describe, expect, it } from 'vitest';
import type { CacheEntry } from './cache-reader.ts';
import { filterEntries, sortEntries } from './sort-entries.ts';

function entry(label: string, patch: Partial<CacheEntry> = {}): CacheEntry {
  return {
    key: label,
    label,
    kind: 'standard',
    status: 'success',
    data: undefined,
    error: undefined,
    isLoading: false,
    isValidating: false,
    updatedAt: 0,
    hooks: undefined,
    ...patch
  };
}

const labels = (entries: CacheEntry[]) => entries.map((e) => e.label);

describe('sortEntries', () => {
  it('sorts by key, ignoring case and putting numbers in order', () => {
    const entries = [entry('/b'), entry('/page/10'), entry('/A'), entry('/page/2')];

    expect(labels(sortEntries(entries, 'key'))).toEqual(['/A', '/b', '/page/2', '/page/10']);
  });

  it('sorts by status, errors first, then in flight, then settled', () => {
    const entries = [
      entry('/idle', { status: 'idle' }),
      entry('/success', { status: 'success' }),
      entry('/validating', { status: 'validating' }),
      entry('/loading', { status: 'loading' }),
      entry('/error', { status: 'error' })
    ];

    expect(labels(sortEntries(entries, 'status'))).toEqual([
      '/error',
      '/loading',
      '/validating',
      '/success',
      '/idle'
    ]);
  });

  it('sorts by last updated, newest first', () => {
    const entries = [
      entry('/old', { updatedAt: 1 }),
      entry('/new', { updatedAt: 3 }),
      entry('/mid', { updatedAt: 2 })
    ];

    expect(labels(sortEntries(entries, 'updated'))).toEqual(['/new', '/mid', '/old']);
  });

  it('breaks ties by key', () => {
    const entries = [
      entry('/c', { status: 'error', updatedAt: 5 }),
      entry('/a', { status: 'error', updatedAt: 5 }),
      entry('/b', { status: 'error', updatedAt: 5 })
    ];

    expect(labels(sortEntries(entries, 'status'))).toEqual(['/a', '/b', '/c']);
    expect(labels(sortEntries(entries, 'updated'))).toEqual(['/a', '/b', '/c']);
  });

  it('orders keys with the same label by their raw key', () => {
    // An infinite key and a standard key can share a label.
    const entries = [
      entry('/feed', { key: '$inf$/feed', kind: 'infinite' }),
      entry('/feed', { key: '/feed' })
    ];

    expect(sortEntries(entries, 'key').map((e) => e.key)).toEqual(['$inf$/feed', '/feed']);
  });

  it("doesn't change the array it's given", () => {
    const entries = [entry('/b'), entry('/a')];

    sortEntries(entries, 'key');

    expect(labels(entries)).toEqual(['/b', '/a']);
  });
});

describe('filterEntries', () => {
  const entries = [entry('/api/user'), entry('/api/posts'), entry('["/api/posts", 2]')];

  it('keeps every entry for an empty or blank query', () => {
    expect(filterEntries(entries, '')).toEqual(entries);
    expect(filterEntries(entries, '   ')).toEqual(entries);
  });

  it('keeps entries whose label contains the query, ignoring case', () => {
    expect(labels(filterEntries(entries, 'POSTS'))).toEqual(['/api/posts', '["/api/posts", 2]']);
  });

  it('ignores spaces around the query', () => {
    expect(labels(filterEntries(entries, '  user '))).toEqual(['/api/user']);
  });

  it('matches the readable label, not the raw key', () => {
    const feed = entry('/api/feed', { key: '$inf$/api/feed', kind: 'infinite' });

    expect(filterEntries([feed], '$inf$')).toEqual([]);
    expect(filterEntries([feed], 'feed')).toEqual([feed]);
  });

  it('returns nothing when no label matches', () => {
    expect(filterEntries(entries, 'nope')).toEqual([]);
  });
});
