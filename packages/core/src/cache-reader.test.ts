import { unstable_serialize as serialize, type Cache, type State } from 'swr';
import { describe, expect, it } from 'vitest';
import { createCacheReader } from './cache-reader.ts';

function cacheOf(entries: Record<string, State>): Cache {
  return new Map(Object.entries(entries));
}

describe('createCacheReader', () => {
  it('reads every key with its data, error, flags, status, kind and label', () => {
    const error = new Error('boom');
    const cache = cacheOf({
      '/api/user': { data: { name: 'Ada' }, isLoading: false, isValidating: false },
      '/api/error': { error, isLoading: false, isValidating: false },
      [`$inf$/api/feed?page=1`]: { data: [[1, 2]], isValidating: true },
      $sub$ticker: { data: 42 }
    });

    const entries = createCacheReader().read(cache, 1000);

    expect(entries).toEqual([
      {
        key: '/api/user',
        label: '/api/user',
        kind: 'standard',
        status: 'success',
        data: { name: 'Ada' },
        error: undefined,
        isLoading: false,
        isValidating: false,
        updatedAt: 1000
      },
      {
        key: '/api/error',
        label: '/api/error',
        kind: 'standard',
        status: 'error',
        data: undefined,
        error,
        isLoading: false,
        isValidating: false,
        updatedAt: 1000
      },
      {
        key: '$inf$/api/feed?page=1',
        label: '/api/feed?page=1',
        kind: 'infinite',
        status: 'validating',
        data: [[1, 2]],
        error: undefined,
        isLoading: false,
        isValidating: true,
        updatedAt: 1000
      },
      {
        key: '$sub$ticker',
        label: 'ticker',
        kind: 'subscription',
        status: 'success',
        data: 42,
        error: undefined,
        isLoading: false,
        isValidating: false,
        updatedAt: 1000
      }
    ]);
  });

  it('labels serialised keys readably', () => {
    const key = serialize(['/api/posts', 2]);
    const [entry] = createCacheReader().read(cacheOf({ [key]: { data: [] } }), 0);
    expect(entry?.label).toBe('["/api/posts", 2]');
  });

  it('keeps the timestamp while an entry is unchanged', () => {
    const cache = cacheOf({ '/api/user': { data: 1 } });
    const reader = createCacheReader();

    reader.read(cache, 1000);

    expect(reader.read(cache, 5000)[0]?.updatedAt).toBe(1000);
  });

  it('updates the timestamp when SWR writes a new entry for the key', () => {
    const cache = cacheOf({ '/api/user': { data: 1 } });
    const reader = createCacheReader();
    reader.read(cache, 1000);

    // SWR replaces the entry object on every write.
    cache.set('/api/user', { data: 2 });

    expect(reader.read(cache, 5000)[0]?.updatedAt).toBe(5000);
  });

  it('keeps the timestamp when only the request state changes', () => {
    const data = { name: 'Ada' };
    const cache = cacheOf({ '/api/user': { data, isValidating: false } });
    const reader = createCacheReader();
    reader.read(cache, 1000);

    // Revalidation writes a new entry with the same data object, and SWR
    // keeps that object when the refetched data is equal.
    cache.set('/api/user', { data, isValidating: true });
    expect(reader.read(cache, 5000)[0]?.updatedAt).toBe(1000);

    cache.set('/api/user', { data, isValidating: false });
    expect(reader.read(cache, 6000)[0]?.updatedAt).toBe(1000);
  });

  it('updates the timestamp when the error changes', () => {
    const data = { name: 'Ada' };
    const cache = cacheOf({ '/api/user': { data } });
    const reader = createCacheReader();
    reader.read(cache, 1000);

    cache.set('/api/user', { data, error: new Error('boom') });

    expect(reader.read(cache, 5000)[0]?.updatedAt).toBe(5000);
  });

  it('forgets removed keys, so a key added again gets a new timestamp', () => {
    const entry: State = { data: 1 };
    const cache = cacheOf({ '/api/user': entry });
    const reader = createCacheReader();
    reader.read(cache, 1000);

    cache.delete('/api/user');
    expect(reader.read(cache, 2000)).toEqual([]);

    cache.set('/api/user', entry);
    expect(reader.read(cache, 3000)[0]?.updatedAt).toBe(3000);
  });

  it('skips keys whose entry is missing', () => {
    const cache: Cache = {
      keys: () => ['/api/gone'][Symbol.iterator](),
      get: () => undefined,
      set: () => {},
      delete: () => {}
    };
    expect(createCacheReader().read(cache, 0)).toEqual([]);
  });

  it('uses the current time by default', () => {
    const before = Date.now();
    const [entry] = createCacheReader().read(cacheOf({ '/api/user': { data: 1 } }));
    expect(entry?.updatedAt).toBeGreaterThanOrEqual(before);
  });
});
