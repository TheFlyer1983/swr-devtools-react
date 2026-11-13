import { unstable_serialize as serialize, type ScopedMutator, type State } from 'swr';
import { initCache } from 'swr/_internal';
import { describe, expect, it, vi } from 'vitest';
import { createCacheActions } from './cache-actions.ts';

/** A real SWR cache and its bound mutate, as `useSWRConfig()` returns them. */
function setup(entries: Record<string, State> = {}) {
  // initCache returns undefined only for a cache it has already set up.
  const result = initCache(new Map(Object.entries(entries)));
  if (!result) throw new Error('Cache already initialised');
  const [cache, mutate] = result;
  const holder: { mutate: ScopedMutator } = { mutate };
  const spy = vi.spyOn(holder, 'mutate');
  const actions = createCacheActions(cache, holder.mutate);
  return { cache, actions, spy };
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
    it('removes every key, including infinite and subscription keys', async () => {
      const { cache, actions, spy } = setup({
        '/api/user': { data: 1 },
        '$inf$/api/feed?page=1': { data: [[1]] },
        $sub$ticker: { data: 3 }
      });

      await actions.clearAll();

      expect([...cache.keys()]).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });
});
