import { act, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import useSWR, { SWRConfig, useSWRConfig, type Cache } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SWRDevtools } from './swr-devtools.tsx';

function Wrapper({ cache, children }: { cache: Cache; children: ReactNode }) {
  return <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>{children}</SWRConfig>;
}

function User({ fetcher }: { fetcher: () => Promise<string> }) {
  const { data } = useSWR('/api/user', fetcher);
  return <p>user: {data ?? '…'}</p>;
}

function AddKey() {
  const { mutate } = useSWRConfig();
  return <button onClick={() => mutate('/api/new', 'x', { revalidate: false })}>add</button>;
}

function renderTwoKeys() {
  const cache: Cache = new Map([
    ['/api/user', { data: 'Ada' }],
    ['/api/posts', { data: [] }]
  ]);
  render(
    <Wrapper cache={cache}>
      <SWRDevtools />
    </Wrapper>
  );
  return cache;
}

function rowFor(label: string): HTMLElement {
  const row = screen.getByText(label).closest('tr');
  if (!row) throw new Error(`No row for ${label}`);
  return row;
}

describe('<SWRDevtools /> (temporary readout)', () => {
  it('lists keys already in the cache', () => {
    const cache: Cache = new Map([['/api/user', { data: 'Ada' }]]);
    render(
      <Wrapper cache={cache}>
        <SWRDevtools />
      </Wrapper>
    );

    expect(within(rowFor('/api/user')).getByText('success')).toBeInTheDocument();
  });

  it('updates live as a hook fetches', async () => {
    let resolve: ((value: string) => void) | undefined;
    const fetcher = () => new Promise<string>((r) => (resolve = r));
    render(
      <Wrapper cache={new Map()}>
        <User fetcher={fetcher} />
        <SWRDevtools />
      </Wrapper>
    );

    expect(await within(rowFor('/api/user')).findByText('loading')).toBeInTheDocument();

    await act(async () => resolve?.('Ada'));

    expect(await within(rowFor('/api/user')).findByText('success')).toBeInTheDocument();
  });

  it('shows readable labels and kinds', () => {
    const cache: Cache = new Map([
      ['@"/api/posts",2,', { data: [] }],
      ['$inf$/api/feed?page=1', { data: [] }]
    ]);
    render(
      <Wrapper cache={cache}>
        <SWRDevtools />
      </Wrapper>
    );

    expect(rowFor('["/api/posts", 2]')).toBeInTheDocument();
    expect(within(rowFor('/api/feed?page=1')).getByText('infinite')).toBeInTheDocument();
  });

  it('updates when a key is changed with mutate', async () => {
    const cache: Cache = new Map([['/api/user', { data: 'Ada' }]]);
    render(
      <Wrapper cache={cache}>
        <AddKey />
        <SWRDevtools />
      </Wrapper>
    );

    await act(async () => {
      screen.getByRole('button', { name: 'add' }).click();
    });

    expect(await screen.findByText('/api/new')).toBeInTheDocument();
  });

  it('deletes a key from its row', async () => {
    const cache: Cache = new Map([
      ['/api/user', { data: 'Ada' }],
      ['/api/posts', { data: [] }]
    ]);
    render(
      <Wrapper cache={cache}>
        <SWRDevtools />
      </Wrapper>
    );

    await act(async () => {
      within(rowFor('/api/user')).getByRole('button', { name: 'Delete' }).click();
    });

    expect(screen.queryByText('/api/user')).not.toBeInTheDocument();
    expect(rowFor('/api/posts')).toBeInTheDocument();
  });

  describe('Clear all', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('clears every key once confirmed', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderTwoKeys();

      await act(async () => {
        screen.getByRole('button', { name: 'Clear all' }).click();
      });

      expect(confirm).toHaveBeenCalledOnce();
      expect(screen.getByText(/0 keys/)).toBeInTheDocument();
    });

    it('keeps the cache when cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const cache = renderTwoKeys();

      await act(async () => {
        screen.getByRole('button', { name: 'Clear all' }).click();
      });

      expect([...cache.keys()]).toEqual(['/api/user', '/api/posts']);
      expect(screen.getByText(/2 keys/)).toBeInTheDocument();
    });
  });

  it('restores the cache when it unmounts', () => {
    const cache: Cache = new Map();
    const { unmount } = render(
      <Wrapper cache={cache}>
        <SWRDevtools />
      </Wrapper>
    );
    expect(Object.hasOwn(cache, 'set')).toBe(true);

    unmount();

    expect(Object.hasOwn(cache, 'set')).toBe(false);
  });
});
