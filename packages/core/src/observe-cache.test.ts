import type { Cache, State } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeCache } from './observe-cache.ts';

/** Notifications are batched to the end of the current task's microtasks. */
const flush = () => Promise.resolve();

/** Reads a method for identity checks, without calling it. */
const method = (target: object, name: 'set' | 'delete'): unknown => Reflect.get(target, name);

afterEach(() => {
  vi.useRealTimers();
});

describe('observeCache', () => {
  it('patches the cache by default', () => {
    const observer = observeCache(new Map(), () => {});
    expect(observer.mode).toBe('patch');
    observer.unsubscribe();
  });

  it('notifies when a key is added, changed or removed', async () => {
    const cache: Cache = new Map();
    const listener = vi.fn<() => void>();
    const observer = observeCache(cache, listener);

    cache.set('/api/user', { data: 1 });
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);

    cache.set('/api/user', { data: 2 });
    await flush();
    expect(listener).toHaveBeenCalledTimes(2);

    cache.delete('/api/user');
    await flush();
    expect(listener).toHaveBeenCalledTimes(3);

    observer.unsubscribe();
  });

  it('still writes to the cache', () => {
    const cache: Cache = new Map();
    const observer = observeCache(cache, () => {});
    const state: State = { data: 1 };

    cache.set('/api/user', state);
    expect(cache.get('/api/user')).toBe(state);
    cache.delete('/api/user');
    expect(cache.get('/api/user')).toBeUndefined();

    observer.unsubscribe();
  });

  it('keeps the return values of the original methods', () => {
    const map = new Map<string, State>();
    const observer = observeCache(map, () => {});

    // Map#set returns the map (so calls chain) and Map#delete a boolean.
    expect(map.set('a', { data: 1 }).set('b', { data: 2 })).toBe(map);
    expect(map.delete('a')).toBe(true);
    expect(map.delete('missing')).toBe(false);

    observer.unsubscribe();
  });

  it('batches many writes into one notification', async () => {
    const cache: Cache = new Map();
    const listener = vi.fn<() => void>();
    const observer = observeCache(cache, listener);

    for (let i = 0; i < 1000; i++) cache.set(`/api/item/${i}`, { data: i });
    await flush();

    expect(listener).toHaveBeenCalledTimes(1);
    observer.unsubscribe();
  });

  it('shares one patch between listeners', async () => {
    const cache: Cache = new Map();
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();
    const a = observeCache(cache, first);
    const patchedSet = method(cache, 'set');
    const b = observeCache(cache, second);

    expect(method(cache, 'set')).toBe(patchedSet);
    cache.set('/api/user', { data: 1 });
    await flush();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    a.unsubscribe();
    b.unsubscribe();
  });

  it('keeps notifying other listeners after one unsubscribes', async () => {
    const cache: Cache = new Map();
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();
    const a = observeCache(cache, first);
    const b = observeCache(cache, second);

    a.unsubscribe();
    cache.set('/api/user', { data: 1 });
    await flush();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    b.unsubscribe();
  });

  it('restores the original methods when the last listener unsubscribes', () => {
    const cache: Cache = new Map();
    const a = observeCache(cache, () => {});
    const b = observeCache(cache, () => {});

    a.unsubscribe();
    expect(Object.hasOwn(cache, 'set')).toBe(true);

    b.unsubscribe();
    expect(Object.hasOwn(cache, 'set')).toBe(false);
    expect(Object.hasOwn(cache, 'delete')).toBe(false);
    expect(method(cache, 'set')).toBe(method(Map.prototype, 'set'));
  });

  it('restores methods a custom cache defines on itself', () => {
    const set = vi.fn<Cache['set']>();
    const remove = vi.fn<Cache['delete']>();
    const cache: Cache = {
      keys: () => [][Symbol.iterator](),
      get: () => undefined,
      set,
      delete: remove
    };

    observeCache(cache, () => {}).unsubscribe();

    expect(method(cache, 'set')).toBe(set);
    expect(method(cache, 'delete')).toBe(remove);
  });

  it('ignores a second unsubscribe', () => {
    const cache: Cache = new Map();
    const a = observeCache(cache, () => {});
    const b = observeCache(cache, () => {});

    a.unsubscribe();
    a.unsubscribe();

    expect(Object.hasOwn(cache, 'set')).toBe(true);
    b.unsubscribe();
  });

  it('does not notify after unsubscribing, even for writes made just before', async () => {
    const cache: Cache = new Map();
    const listener = vi.fn<() => void>();
    const observer = observeCache(cache, listener);

    cache.set('/api/user', { data: 1 });
    observer.unsubscribe();
    await flush();

    expect(listener).not.toHaveBeenCalled();
  });

  describe('when the cache cannot be patched', () => {
    it('falls back to polling', () => {
      const observer = observeCache(Object.freeze(new Map()), () => {});
      expect(observer.mode).toBe('poll');
      observer.unsubscribe();
    });

    it('notifies on the next poll after a key is added, changed or removed', () => {
      vi.useFakeTimers();
      const cache: Cache = Object.freeze(new Map());
      const listener = vi.fn<() => void>();
      const observer = observeCache(cache, listener, { pollInterval: 100 });

      cache.set('/api/user', { data: 1 });
      expect(listener).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(listener).toHaveBeenCalledTimes(1);

      cache.set('/api/user', { data: 2 });
      vi.advanceTimersByTime(100);
      expect(listener).toHaveBeenCalledTimes(2);

      cache.delete('/api/user');
      vi.advanceTimersByTime(100);
      expect(listener).toHaveBeenCalledTimes(3);

      observer.unsubscribe();
    });

    it('stays quiet when nothing changed', () => {
      vi.useFakeTimers();
      const cache: Cache = Object.freeze(new Map([['/api/user', { data: 1 }]]));
      const listener = vi.fn<() => void>();
      const observer = observeCache(cache, listener, { pollInterval: 100 });

      vi.advanceTimersByTime(1000);

      expect(listener).not.toHaveBeenCalled();
      observer.unsubscribe();
    });

    it('stops polling on unsubscribe', () => {
      vi.useFakeTimers();
      const cache: Cache = Object.freeze(new Map());
      const listener = vi.fn<() => void>();
      observeCache(cache, listener, { pollInterval: 100 }).unsubscribe();

      cache.set('/api/user', { data: 1 });
      vi.advanceTimersByTime(1000);

      expect(listener).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
