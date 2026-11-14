import {
  unstable_serialize as serialize,
  type ScopedMutator,
  type State,
  type Unloader
} from 'swr';
import { initCache } from 'swr/_internal';
import { describe, expect, it, vi } from 'vitest';
import { createCacheActions } from './cache-actions.ts';

/**
 * A real SWR cache with its bound `mutate` and `unload`, as `useSWRConfig()`
 * returns them. `withUnload: false` simulates SWR versions before `unload`.
 */
function setup(entries: Record<string, State> = {}, { withUnload = true } = {}) {
  // initCache returns undefined only for a cache it has already set up.
  const result = initCache(new Map(Object.entries(entries)));
  if (!result) throw new Error('Cache already initialised');
  const [cache, mutate, , , unload] = result;
  const holder: { mutate: ScopedMutator; unload: Unloader } = { mutate, unload };
  const spy = vi.spyOn(holder, 'mutate');
  const unloadSpy = vi.spyOn(holder, 'unload');
  const actions = createCacheActions({
    cache,
    mutate: holder.mutate,
    unload: withUnload ? holder.unload : undefined
  });
  return { cache, actions, spy, unloadSpy };
}

describe('createCacheActions', () => {
  describe('revalidate', () => {
    it('calls mutate with only the key, so SWR refetches it', async () => {
      const { actions, spy } = setup({ '/api/user': { data: 1 } });

      await actions.revalidate('/api/user');

      expect(spy).toHaveBeenCalledWith('/api/user');
      expect(spy.mock.calls[0]).toHaveLength(1);
    });
  });

  describe('setData', () => {
    it('writes the data without revalidating', async () => {
      const { cache, actions, spy } = setup({ '/api/user': { data: 1 } });

      await actions.setData('/api/user', { name: 'Ada' });

      expect(cache.get('/api/user')?.data).toEqual({ name: 'Ada' });
      expect(spy).toHaveBeenCalledWith('/api/user', { name: 'Ada' }, { revalidate: false });
    });

    it('writes to the same serialised key, not a re-serialised one', async () => {
      const key = serialize(['/api/posts', 1]);
      const { cache, actions } = setup({ [key]: { data: [] } });

      await actions.setData(key, ['post']);

      expect([...cache.keys()]).toEqual([key]);
      expect(cache.get(key)?.data).toEqual(['post']);
    });
  });

  describe('remove', () => {
    it('clears the data through mutate, so mounted hooks re-render, then deletes the key', async () => {
      const { cache, actions, spy } = setup({ '/api/user': { data: 1 } });

      await actions.remove('/api/user');

      expect(spy).toHaveBeenCalledWith('/api/user', undefined, { revalidate: false });
      expect(cache.get('/api/user')).toBeUndefined();
      expect([...cache.keys()]).toEqual([]);
    });

    it('does nothing for a key that is not in the cache', async () => {
      const { cache, actions } = setup({ '/api/user': { data: 1 } });

      await actions.remove('/api/missing');

      expect([...cache.keys()]).toEqual(['/api/user']);
    });
  });

  describe('clearAll', () => {
    const entries = {
      '/api/user': { data: 1 },
      '$inf$/api/feed?page=1': { data: [[1]] },
      $sub$ticker: { data: 3 }
    };

    it("uses SWR's unload without revalidating, when available", async () => {
      const { cache, actions, spy, unloadSpy } = setup(entries);

      await actions.clearAll();

      expect(unloadSpy).toHaveBeenCalledWith({ revalidate: false });
      expect(spy).not.toHaveBeenCalled();
      expect([...cache.keys()]).toEqual([]);
    });

    it('removes every key itself on SWR versions without unload', async () => {
      const { cache, actions, spy } = setup(entries, { withUnload: false });

      await actions.clearAll();

      expect([...cache.keys()]).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });
});
