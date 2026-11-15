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

/** The readout renders in a shadow root, which `screen` queries don't reach. */
function panel() {
  const root = document
    .querySelector('[data-swr-devtools]')
    ?.shadowRoot?.querySelector<HTMLElement>('.panel-content');
  if (!root) throw new Error('Panel not rendered');
  return within(root);
}

function rowFor(label: string): HTMLElement {
  const row = panel().getByText(label).closest('tr');
  if (!row) throw new Error(`No row for ${label}`);
  return row;
}

describe('<SWRDevtoolsPanel /> (temporary readout)', () => {
  it('lists keys already in the cache', () => {
    const cache: Cache = new Map([['/api/user', { data: 'Ada' }]]);
    render(
      <Wrapper cache={cache}>
        <SWRDevtoolsPanel />
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
        <SWRDevtoolsPanel />
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
        <SWRDevtoolsPanel />
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
