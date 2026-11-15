import { act, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import useSWR, { SWRConfig, useSWRConfig, type Cache } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SWRDevtoolsPanel } from './swr-devtools-panel.tsx';

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

function renderTwoKeysIn() {
  const cache: Cache = new Map([
    ['/api/user', { data: 'Ada' }],
    ['/api/posts', { data: [] }]
  ]);
  const { container } = render(
    <Wrapper cache={cache}>
      <SWRDevtoolsPanel />
    </Wrapper>
  );
  return { cache, container };
}

function renderTwoKeys() {
  return renderTwoKeysIn().cache;
}

/** The panel renders in a shadow root, which `screen` queries don't reach. */
function panel() {
  const root = document
    .querySelector('[data-swr-devtools]')
    ?.shadowRoot?.querySelector<HTMLElement>('.panel-content');
  if (!root) throw new Error('Panel not rendered');
  return within(root);
}

function rowFor(label: string): HTMLElement {
  const row = panel().getByText(label).closest('li');
  if (!row) throw new Error(`No row for ${label}`);
  return row;
}

function ageOf(label: string): HTMLElement {
  return within(rowFor(label)).getByText(/ago$/);
}

describe('<SWRDevtoolsPanel />', () => {
  it('lists keys already in the cache', () => {
    const cache: Cache = new Map([['/api/user', { data: 'Ada' }]]);
    render(
      <Wrapper cache={cache}>
        <SWRDevtoolsPanel />
      </Wrapper>
    );

    expect(within(rowFor('/api/user')).getByText('Success')).toBeInTheDocument();
  });

  it('lists the keys under one labelled list', () => {
    renderTwoKeys();

    const list = panel().getByRole('list', { name: 'Cache keys' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('says so when the cache is empty', () => {
    render(
      <Wrapper cache={new Map()}>
        <SWRDevtoolsPanel />
      </Wrapper>
    );

    expect(panel().getByText('No keys in the cache yet.')).toBeInTheDocument();
    expect(panel().queryByRole('list')).not.toBeInTheDocument();
  });

  it('badges each status, with its name as well as its colour', () => {
    const cache: Cache = new Map<string, object>([
      ['/loading', { isLoading: true, isValidating: true }],
      ['/validating', { data: 1, isValidating: true }],
      ['/success', { data: 1 }],
      ['/error', { error: new Error('boom') }],
      ['/idle', {}]
    ]);
    render(
      <Wrapper cache={cache}>
        <SWRDevtoolsPanel />
      </Wrapper>
    );

    for (const [key, name] of [
      ['/loading', 'Loading'],
      ['/validating', 'Validating'],
      ['/success', 'Success'],
      ['/error', 'Error'],
      ['/idle', 'Idle']
    ] as const) {
      const badge = within(rowFor(key)).getByText(name);
      expect(badge).toHaveClass('badge');
      expect(badge).toHaveAttribute('data-status', name.toLowerCase());
    }
  });

  it('shows how long ago each key was updated, and keeps it current', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    renderTwoKeys();

    expect(ageOf('/api/user')).toHaveTextContent('0s ago');
    expect(ageOf('/api/user').tagName).toBe('TIME');
    expect(ageOf('/api/user')).toHaveAttribute('dateTime', new Date(1_000_000).toISOString());

    now.mockReturnValue(1_090_000);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(ageOf('/api/user')).toHaveTextContent('1m ago');
    vi.useRealTimers();
  });

  it('updates live as a hook fetches', async () => {
    let resolve: ((value: string) => void) | undefined;
    const fetcher = () => new Promise<string>((r) => (resolve = r));
    render(
      <Wrapper cache={new Map()}>
        <User fetcher={fetcher} />
        <SWRDevtoolsPanel />
      </Wrapper>
    );

    expect(await within(rowFor('/api/user')).findByText('Loading')).toBeInTheDocument();

    await act(async () => resolve?.('Ada'));

    expect(await within(rowFor('/api/user')).findByText('Success')).toBeInTheDocument();
  });

  it('updates live when a fetch fails', async () => {
    let reject: ((error: Error) => void) | undefined;
    const fetcher = () => new Promise<string>((_, r) => (reject = r));
    render(
      <Wrapper cache={new Map()}>
        <User fetcher={fetcher} />
        <SWRDevtoolsPanel />
      </Wrapper>
    );
    expect(await within(rowFor('/api/user')).findByText('Loading')).toBeInTheDocument();

    await act(async () => reject?.(new Error('boom')));

    expect(await within(rowFor('/api/user')).findByText('Error')).toBeInTheDocument();
  });

  it('shows readable labels, and labels infinite and subscription keys', () => {
    const cache: Cache = new Map([
      ['@"/api/posts",2,', { data: [] }],
      ['$inf$/api/feed?page=1', { data: [] }],
      ['$sub$/ws/prices', { data: 1 }]
    ]);
    render(
      <Wrapper cache={cache}>
        <SWRDevtoolsPanel />
      </Wrapper>
    );

    expect(within(rowFor('["/api/posts", 2]')).queryByText(/infinite|subscription/i)).toBeNull();
    expect(within(rowFor('/api/feed?page=1')).getByText('Infinite')).toBeInTheDocument();
    expect(within(rowFor('/ws/prices')).getByText('Subscription')).toBeInTheDocument();
  });

  it('updates when a key is changed with mutate', async () => {
    const cache: Cache = new Map([['/api/user', { data: 'Ada' }]]);
    render(
      <Wrapper cache={cache}>
        <AddKey />
        <SWRDevtoolsPanel />
      </Wrapper>
    );

    await act(async () => {
      screen.getByRole('button', { name: 'add' }).click();
    });

    expect(await panel().findByText('/api/new')).toBeInTheDocument();
  });

  it('deletes a key from its row', async () => {
    const cache: Cache = new Map([
      ['/api/user', { data: 'Ada' }],
      ['/api/posts', { data: [] }]
    ]);
    render(
      <Wrapper cache={cache}>
        <SWRDevtoolsPanel />
      </Wrapper>
    );

    await act(async () => {
      within(rowFor('/api/user')).getByRole('button', { name: 'Delete' }).click();
    });

    expect(panel().queryByText('/api/user')).not.toBeInTheDocument();
    expect(rowFor('/api/posts')).toBeInTheDocument();
  });

  it("doesn't submit a form it sits inside", () => {
    renderTwoKeys();

    for (const button of panel().getAllByRole('button')) {
      expect(button).toHaveAttribute('type', 'button');
    }
  });

  describe('Clear all', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('clears every key once confirmed', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderTwoKeys();

      await act(async () => {
        panel().getByRole('button', { name: 'Clear all' }).click();
      });

      expect(confirm).toHaveBeenCalledOnce();
      expect(panel().getByText(/0 keys/)).toBeInTheDocument();
    });

    it('keeps the cache when cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const cache = renderTwoKeys();

      await act(async () => {
        panel().getByRole('button', { name: 'Clear all' }).click();
      });

      expect([...cache.keys()]).toEqual(['/api/user', '/api/posts']);
      expect(panel().getByText(/2 keys/)).toBeInTheDocument();
    });
  });

  it('restores the cache when it unmounts', () => {
    const cache: Cache = new Map();
    const { unmount } = render(
      <Wrapper cache={cache}>
        <SWRDevtoolsPanel />
      </Wrapper>
    );
    expect(Object.hasOwn(cache, 'set')).toBe(true);

    unmount();

    expect(Object.hasOwn(cache, 'set')).toBe(false);
  });

  it('renders where it is placed, with no toggle or close button', () => {
    const { container } = renderTwoKeysIn();

    expect(container.querySelector('[data-swr-devtools]')).not.toBeNull();
    expect(panel().queryByRole('button', { name: /open|close/i })).not.toBeInTheDocument();
  });
});
