import { act, render, screen, waitFor } from '@testing-library/react';
import { Component, Suspense, type ReactNode } from 'react';
import useSWR, { SWRConfig, useSWRConfig, type Cache, type SWRConfiguration } from 'swr';
import { createCacheHelper, getTimestamp, SWRGlobalState } from 'swr/_internal';
import useSWRInfinite from 'swr/infinite';
import useSWRSubscription from 'swr/subscription';
import { describe, expect, it, vi } from 'vitest';

// Spike for #22. Prototypes only; removed before merging.

const KEY = '/api/user';

type Info = { data?: unknown; error?: unknown; isLoading?: boolean; isValidating?: boolean };

/** Writes through SWR's own setter, so subscribed hooks are notified. */
function write(cache: Cache, key: string, info: Info) {
  const [, set] = createCacheHelper(cache, key);
  set(info);
}

function forceLoading(cache: Cache, key: string) {
  write(cache, key, { data: undefined, error: undefined, isLoading: true, isValidating: true });
}

function forceError(cache: Cache, key: string, error: unknown, { keepData = true } = {}) {
  write(cache, key, {
    ...(keepData ? {} : { data: undefined }),
    error,
    isLoading: false,
    isValidating: false
  });
}

/**
 * Parks a never-settling request in SWR's request table (`FETCH`, the third
 * item of the cache's state), so deduped revalidations wait on it instead of
 * fetching. Returns a release function.
 */
function lock(cache: Cache, key: string) {
  const fetches = (SWRGlobalState.get(cache) as unknown[])[2] as Record<string, unknown>;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => (release = resolve));
  const entry = [pending, getTimestamp()];
  fetches[key] = entry;
  return () => {
    if (fetches[key] === entry) delete fetches[key];
    release();
  };
}

function snapshot(cache: Cache, key: string): Info {
  const { data, error, isLoading, isValidating } = cache.get(key) ?? {};
  return { data, error, isLoading, isValidating };
}

function restore(cache: Cache, key: string, before: Info) {
  write(cache, key, {
    data: before.data,
    error: before.error,
    isLoading: before.isLoading ?? false,
    isValidating: before.isValidating ?? false
  });
}

function show({
  data,
  error,
  isLoading
}: {
  data?: unknown;
  error?: unknown;
  isLoading?: boolean;
}) {
  if (isLoading) return 'loading';
  if (error)
    return `error:${(error as Error).message}${data ? `+data:${JSON.stringify(data)}` : ''}`;
  return `data:${JSON.stringify(data)}`;
}

function User({ fetcher, config }: { fetcher: () => Promise<unknown>; config?: SWRConfiguration }) {
  const swr = useSWR(KEY, fetcher, config);
  return <p data-testid="user">{show(swr)}</p>;
}

function setup(ui: ReactNode, config: SWRConfiguration = {}) {
  const holder: { cache?: Cache } = {};
  function Grab() {
    holder.cache = useSWRConfig().cache;
    return null;
  }
  const result = render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        focusThrottleInterval: 0,
        ...config
      }}
    >
      <Grab />
      {ui}
    </SWRConfig>
  );
  return { ...result, cache: () => holder.cache! };
}

/** React 19 only resolves a suspended first render inside an async act. */
async function setupSuspense(ui: ReactNode, config: SWRConfiguration = {}) {
  let result!: ReturnType<typeof setup>;
  await act(async () => {
    result = setup(ui, config);
  });
  return result;
}

const ready = async (text = 'data:{"n":1}') =>
  waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(text));

const tick = (ms = 20) => act(() => new Promise((r) => setTimeout(r, ms)));

describe('spike #22: forcing loading / error through the cache', () => {
  describe('public APIs', () => {
    it('cache.set alone does not re-render hooks', async () => {
      const { cache } = setup(<User fetcher={async () => ({ n: 1 })} />);
      await ready();
      act(() => {
        cache().set(KEY, { ...cache().get(KEY), isLoading: true, data: undefined });
      });
      await tick();
      expect(screen.getByTestId('user')).toHaveTextContent('data:{"n":1}');
    });

    it('mutate with a rejected promise does not put the error in the cache', async () => {
      const { cache } = setup(<User fetcher={async () => ({ n: 1 })} />);
      await ready();
      const { mutate } = { mutate: (SWRGlobalState.get(cache()) as unknown[])[4] as Function };
      await act(async () => {
        await mutate(KEY, Promise.reject(new Error('boom')), { revalidate: false }).catch(() => {});
      });
      expect(cache().get(KEY)?.error).toBeUndefined();
      expect(screen.getByTestId('user')).toHaveTextContent('data:{"n":1}');
    });
  });

  describe("SWR's setter", () => {
    it('forced loading re-renders the hook as loading', async () => {
      const { cache } = setup(<User fetcher={async () => ({ n: 1 })} />);
      await ready();
      act(() => forceLoading(cache(), KEY));
      expect(screen.getByTestId('user')).toHaveTextContent('loading');
    });

    it('forced error re-renders the hook with the error, keeping data', async () => {
      const { cache } = setup(<User fetcher={async () => ({ n: 1 })} />);
      await ready();
      act(() => forceError(cache(), KEY, new Error('forced')));
      expect(screen.getByTestId('user')).toHaveTextContent('error:forced+data:{"n":1}');
    });

    it('restoring the snapshot renders the original state, without a fetch', async () => {
      const fetcher = vi.fn(async () => ({ n: 1 }));
      const { cache } = setup(<User fetcher={fetcher} />);
      await ready();
      const before = snapshot(cache(), KEY);
      act(() => forceLoading(cache(), KEY));
      act(() => restore(cache(), KEY, before));
      expect(screen.getByTestId('user')).toHaveTextContent('data:{"n":1}');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('does not fire onError or error retries', async () => {
      const onError = vi.fn();
      const fetcher = vi.fn(async () => ({ n: 1 }));
      const { cache } = setup(<User fetcher={fetcher} />, { onError, errorRetryInterval: 5 });
      await ready();
      act(() => forceError(cache(), KEY, new Error('forced')));
      await tick(50);
      expect(onError).not.toHaveBeenCalled();
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('what ends a forced state', () => {
    it('without a lock, a focus revalidation refetches and overwrites forced loading', async () => {
      const fetcher = vi.fn(async () => ({ n: 1 }));
      const { cache } = setup(<User fetcher={fetcher} />);
      await ready();
      act(() => forceLoading(cache(), KEY));
      await tick(5);
      act(() => void window.dispatchEvent(new Event('focus')));
      await ready();
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('without a lock, a focus revalidation overwrites forced error', async () => {
      const { cache } = setup(<User fetcher={async () => ({ n: 1 })} />);
      await ready();
      act(() => forceError(cache(), KEY, new Error('forced')));
      await tick(5);
      act(() => void window.dispatchEvent(new Event('focus')));
      await ready();
    });

    it('with a lock, focus, reconnect and polling do not end forced loading', async () => {
      const fetcher = vi.fn(async () => ({ n: 1 }));
      const { cache } = setup(<User fetcher={fetcher} config={{ refreshInterval: 10 }} />);
      await ready();
      const calls = fetcher.mock.calls.length;
      const unlock = lock(cache(), KEY);
      act(() => forceLoading(cache(), KEY));
      await tick(5);
      act(() => void window.dispatchEvent(new Event('focus')));
      act(() => void window.dispatchEvent(new Event('online')));
      await tick(80);
      expect(screen.getByTestId('user')).toHaveTextContent('loading');
      expect(fetcher).toHaveBeenCalledTimes(calls);
      unlock();
    });

    it('with a lock, focus does not end forced error', async () => {
      const fetcher = vi.fn(async () => ({ n: 1 }));
      const { cache } = setup(<User fetcher={fetcher} />);
      await ready();
      const unlock = lock(cache(), KEY);
      act(() => forceError(cache(), KEY, new Error('forced'), { keepData: false }));
      await tick(5);
      act(() => void window.dispatchEvent(new Event('focus')));
      await tick(50);
      expect(screen.getByTestId('user')).toHaveTextContent('error:forced');
      expect(fetcher).toHaveBeenCalledTimes(1);
      unlock();
    });

    it('with a lock, a request already in flight is discarded instead of overwriting', async () => {
      let resolve!: (v: unknown) => void;
      const fetcher = vi
        .fn<() => Promise<unknown>>()
        .mockResolvedValueOnce({ n: 1 })
        .mockImplementationOnce(() => new Promise((r) => (resolve = r)));
      const { cache } = setup(<User fetcher={fetcher} />);
      await ready();
      act(() => void window.dispatchEvent(new Event('focus')));
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
      const unlock = lock(cache(), KEY);
      act(() => forceLoading(cache(), KEY));
      await act(async () => resolve({ n: 2 }));
      await tick();
      expect(screen.getByTestId('user')).toHaveTextContent('loading');
      unlock();
    });

    it('mutate(key), e.g. the panel or the app revalidating, still ends a locked state', async () => {
      const fetcher = vi.fn(async () => ({ n: 1 }));
      const { cache } = setup(<User fetcher={fetcher} />);
      await ready();
      lock(cache(), KEY);
      act(() => forceLoading(cache(), KEY));
      const mutate = (SWRGlobalState.get(cache()) as unknown[])[4] as (
        k: string
      ) => Promise<unknown>;
      await act(() => mutate(KEY));
      await ready();
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('unlock + restore puts back the original state, and later revalidations work again', async () => {
      const fetcher = vi.fn(async () => ({ n: 1 }));
      const { cache } = setup(<User fetcher={fetcher} />);
      await ready();
      const before = snapshot(cache(), KEY);
      const unlock = lock(cache(), KEY);
      act(() => forceLoading(cache(), KEY));
      act(() => {
        unlock();
        restore(cache(), KEY, before);
      });
      await ready();
      await tick(5);
      act(() => void window.dispatchEvent(new Event('focus')));
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    });
  });

  describe('existing panel actions on a forced key', () => {
    const mutateOf = (cache: Cache) =>
      (SWRGlobalState.get(cache) as unknown[])[4] as (
        k: string,
        d: unknown,
        o: { revalidate: boolean }
      ) => Promise<unknown>;

    it('Edit data (mutate without revalidate) on forced loading leaves isLoading stuck', async () => {
      const { cache } = setup(<User fetcher={async () => ({ n: 1 })} />);
      await ready();
      lock(cache(), KEY);
      act(() => forceLoading(cache(), KEY));
      await act(() => mutateOf(cache())(KEY, { n: 9 }, { revalidate: false }));
      expect(cache().get(KEY)?.isLoading).toBe(true);
      expect(screen.getByTestId('user')).toHaveTextContent('loading');
    });

    it('Delete (mutate without revalidate) leaves the lock, so a remount waits forever', async () => {
      const fetcher = vi.fn(async () => ({ n: 1 }));
      const holder: { cache?: Cache } = {};
      function Grab() {
        holder.cache = useSWRConfig().cache;
        return null;
      }
      const wrap = (shown: boolean) => (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          <Grab />
          {shown && <User fetcher={fetcher} />}
        </SWRConfig>
      );
      const view = render(wrap(true));
      await ready();
      lock(holder.cache!, KEY);
      act(() => forceLoading(holder.cache!, KEY));
      await act(() => mutateOf(holder.cache!)(KEY, undefined, { revalidate: false }));
      holder.cache!.delete(KEY);
      view.rerender(wrap(false));
      view.rerender(wrap(true));
      await tick(50);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('user')).toHaveTextContent('loading');
    });
  });

  describe('hook options and other hooks', () => {
    it('a second hook mounting on a forced-loading key refetches unless locked', async () => {
      const fetcher = vi.fn(async () => ({ n: 1 }));
      function App({ second }: { second: boolean }) {
        return (
          <>
            <User fetcher={fetcher} />
            {second && <User fetcher={fetcher} />}
          </>
        );
      }
      const holder: { cache?: Cache } = {};
      function Grab() {
        holder.cache = useSWRConfig().cache;
        return null;
      }
      const wrap = (second: boolean) => (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          <Grab />
          <App second={second} />
        </SWRConfig>
      );
      const view = render(wrap(false));
      await ready();

      act(() => forceLoading(holder.cache!, KEY));
      view.rerender(wrap(true));
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        screen.getAllByTestId('user').forEach((el) => expect(el).toHaveTextContent('data:'))
      );
    });

    it('a second hook mounting on a locked forced-loading key stays loading', async () => {
      const fetcher = vi.fn(async () => ({ n: 1 }));
      const holder: { cache?: Cache } = {};
      function Grab() {
        holder.cache = useSWRConfig().cache;
        return null;
      }
      const wrap = (second: boolean) => (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          <Grab />
          <User fetcher={fetcher} />
          {second && <User fetcher={fetcher} />}
        </SWRConfig>
      );
      const view = render(wrap(false));
      await ready();
      const unlock = lock(holder.cache!, KEY);
      act(() => forceLoading(holder.cache!, KEY));
      view.rerender(wrap(true));
      await tick(30);
      expect(fetcher).toHaveBeenCalledTimes(1);
      screen.getAllByTestId('user').forEach((el) => expect(el).toHaveTextContent('loading'));
      unlock();
    });

    it('keepPreviousData: forced loading shows loading, but data keeps the previous value', async () => {
      function Laggy() {
        const swr = useSWR(KEY, async () => ({ n: 1 }), { keepPreviousData: true });
        return <p data-testid="user">{`${String(swr.isLoading)}|${JSON.stringify(swr.data)}`}</p>;
      }
      const { cache } = setup(<Laggy />);
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('false|{"n":1}'));
      act(() => forceLoading(cache(), KEY));
      expect(screen.getByTestId('user')).toHaveTextContent('true|{"n":1}');
    });

    it('suspense: forced loading with a lock shows the Suspense fallback; restore shows content', async () => {
      const fetcher = vi.fn(async () => ({ n: 1 }));
      const { cache } = await setupSuspense(
        <Suspense fallback={<p data-testid="fallback">fallback</p>}>
          <User fetcher={fetcher} config={{ suspense: true }} />
        </Suspense>
      );
      await ready();
      const before = snapshot(cache(), KEY);
      const unlock = lock(cache(), KEY);
      await act(async () => forceLoading(cache(), KEY));
      await waitFor(() => expect(screen.getByTestId('fallback')).toBeInTheDocument());
      await tick(30);
      expect(fetcher).toHaveBeenCalledTimes(1);
      await act(async () => {
        unlock();
        restore(cache(), KEY, before);
      });
      await ready();
    });

    it('suspense: forced loading without a lock refetches during render', async () => {
      const fetcher = vi.fn(async () => ({ n: 1 }));
      const { cache } = await setupSuspense(
        <Suspense fallback={<p data-testid="fallback">fallback</p>}>
          <User fetcher={fetcher} config={{ suspense: true }} />
        </Suspense>
      );
      await ready();
      await act(async () => forceLoading(cache(), KEY));
      await ready();
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('suspense: forced error reaches the error boundary only when data is cleared', async () => {
      class Boundary extends Component<{ children: ReactNode }, { error?: Error }> {
        state: { error?: Error } = {};
        static getDerivedStateFromError(error: Error) {
          return { error };
        }
        render() {
          return this.state.error ? (
            <p data-testid="boundary">{this.state.error.message}</p>
          ) : (
            this.props.children
          );
        }
      }
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { cache } = await setupSuspense(
        <Boundary>
          <Suspense fallback={null}>
            <User fetcher={async () => ({ n: 1 })} config={{ suspense: true }} />
          </Suspense>
        </Boundary>
      );
      await ready();
      await act(async () => forceError(cache(), KEY, new Error('kept')));
      expect(screen.queryByTestId('boundary')).toBeNull();
      expect(screen.getByTestId('user')).toHaveTextContent('error:kept+data:{"n":1}');
      const unlock = lock(cache(), KEY);
      await act(async () => forceError(cache(), KEY, new Error('cleared'), { keepData: false }));
      await waitFor(() => expect(screen.getByTestId('boundary')).toHaveTextContent('cleared'));
      unlock();
    });

    it('useSWRInfinite: forcing the $inf$ key drives the hook', async () => {
      function Feed() {
        const swr = useSWRInfinite(
          (i) => `/api/feed?page=${i}`,
          async () => ({ n: 1 })
        );
        return <p data-testid="user">{show(swr)}</p>;
      }
      const { cache } = setup(<Feed />);
      await ready('data:[{"n":1}]');
      const infKey = [...cache().keys()].find((k) => k.startsWith('$inf$'))!;
      const before = snapshot(cache(), infKey);
      const unlock = lock(cache(), infKey);
      act(() => forceLoading(cache(), infKey));
      expect(screen.getByTestId('user')).toHaveTextContent('loading');
      act(() => forceError(cache(), infKey, new Error('forced'), { keepData: false }));
      expect(screen.getByTestId('user')).toHaveTextContent('error:forced');
      act(() => {
        unlock();
        restore(cache(), infKey, before);
      });
      await ready('data:[{"n":1}]');
    });

    it('useSWRSubscription: forced error shows until the next message clears it', async () => {
      let push!: (data: unknown) => void;
      function Live() {
        const swr = useSWRSubscription('ws', (_k, { next }) => {
          push = (d) => next(null, d);
          return () => {};
        });
        return <p data-testid="user">{show(swr)}</p>;
      }
      const { cache } = setup(<Live />);
      act(() => push({ n: 1 }));
      await ready();
      act(() => forceError(cache(), '$sub$ws', new Error('forced')));
      expect(screen.getByTestId('user')).toHaveTextContent('error:forced');
      act(() => push({ n: 2 }));
      await ready('data:{"n":2}');
    });
  });
});
