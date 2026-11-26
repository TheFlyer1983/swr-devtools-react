import type { Cache } from 'swr';
import { SWRGlobalState } from 'swr/_internal';
import { describe, expect, it, vi } from 'vitest';
import { createCacheStore } from './cache-store.ts';

const flush = () => Promise.resolve();

describe('createCacheStore', () => {
  it('starts with a snapshot of the current entries', () => {
    const cache: Cache = new Map([['/api/user', { data: 1 }]]);
    const store = createCacheStore(cache);
    expect(store.getSnapshot().map((entry) => entry.key)).toEqual(['/api/user']);
  });

  it('returns the same snapshot until the cache changes', async () => {
    const cache: Cache = new Map([['/api/user', { data: 1 }]]);
    const store = createCacheStore(cache);
    const onChange = vi.fn<() => void>();
    const unsubscribe = store.subscribe(onChange);
    const first = store.getSnapshot();

    expect(store.getSnapshot()).toBe(first);

    cache.set('/api/posts', { data: [] });
    await flush();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).not.toBe(first);
    expect(store.getSnapshot().map((entry) => entry.key)).toEqual(['/api/user', '/api/posts']);
    unsubscribe();
  });

  it('picks up changes made between creating the store and subscribing', () => {
    const cache: Cache = new Map();
    const store = createCacheStore(cache);

    cache.set('/api/user', { data: 1 });
    const unsubscribe = store.subscribe(() => {});

    expect(store.getSnapshot().map((entry) => entry.key)).toEqual(['/api/user']);
    unsubscribe();
  });

  it('reports how it observes the cache', () => {
    const patched = createCacheStore(new Map());
    const polled = createCacheStore(Object.freeze(new Map()));

    const a = patched.subscribe(() => {});
    const b = polled.subscribe(() => {});

    expect(patched.getMode()).toBe('patch');
    expect(polled.getMode()).toBe('poll');
    a();
    b();
  });

  it('notices a hook unmounting, which writes nothing to the cache', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const cache: Cache = new Map([['/api/user', { data: 1 }]]);
    const userHooks = [() => {}];
    // @ts-expect-error -- only the first item of SWR's state tuple matters here.
    SWRGlobalState.set(cache, [{ '/api/user': userHooks }]);
    const store = createCacheStore(cache);
    const onChange = vi.fn<() => void>();
    const unsubscribe = store.subscribe(onChange);
    expect(store.getSnapshot()[0]?.hooks).toBe(1);

    vi.advanceTimersByTime(1000);
    expect(onChange).not.toHaveBeenCalled();

    userHooks.pop();
    vi.advanceTimersByTime(1000);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()[0]?.hooks).toBe(0);
    unsubscribe();
    vi.useRealTimers();
  });

  it('leaves the cache unpatched once every subscriber has gone', () => {
    const cache: Cache = new Map();
    const store = createCacheStore(cache);

    store.subscribe(() => {})();

    expect(Object.hasOwn(cache, 'set')).toBe(false);
  });
});
