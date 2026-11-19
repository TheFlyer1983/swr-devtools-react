import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
  const list = within(panel().getByRole('list', { name: 'Cache keys' }));
  const row = list.getByText(label).closest('li');
  if (!row) throw new Error(`No row for ${label}`);
  return row;
}

/** The keys as listed, top to bottom. */
function listedKeys(): (string | null)[] {
  return panel()
    .getAllByRole('listitem')
    .map((row) => row.querySelector('.key')?.textContent ?? null);
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

  describe('search and sort', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    function renderKeys(keys: string[]) {
      const cache: Cache = new Map(keys.map((key) => [key, { data: key }]));
      render(
        <Wrapper cache={cache}>
          <SWRDevtoolsPanel />
        </Wrapper>
      );
    }

    const filter = (text: string) =>
      fireEvent.change(panel().getByRole('searchbox', { name: 'Filter keys' }), {
        target: { value: text }
      });

    const sortBy = (name: string) => {
      const select = panel().getByRole('combobox', { name: 'Sort by' });
      const option = within(select).getByRole<HTMLOptionElement>('option', { name });
      fireEvent.change(select, { target: { value: option.value } });
    };

    it('sorts by key by default', () => {
      renderKeys(['/api/user', '/api/posts', '/api/comments']);

      expect(listedKeys()).toEqual(['/api/comments', '/api/posts', '/api/user']);
      expect(panel().getByRole('combobox', { name: 'Sort by' })).toHaveDisplayValue('Key');
    });

    it('filters keys by text, and counts what it shows', () => {
      renderKeys(['/api/user', '/api/posts', '/api/posts/1']);

      filter('POSTS');

      expect(listedKeys()).toEqual(['/api/posts', '/api/posts/1']);
      expect(panel().getByText(/2 of 3 keys/)).toBeInTheDocument();
    });

    it('says so when no key matches', () => {
      renderKeys(['/api/user']);

      filter('nope');

      expect(panel().getByText('No keys match “nope”.')).toBeInTheDocument();
      expect(panel().queryByRole('list')).not.toBeInTheDocument();
    });

    it('shows every key again when the filter is cleared', () => {
      renderKeys(['/api/user', '/api/posts']);

      filter('user');
      filter('');

      expect(listedKeys()).toHaveLength(2);
      expect(panel().getByText(/^2 keys/)).toBeInTheDocument();
    });

    it('sorts by status, errors first', () => {
      const cache: Cache = new Map<string, object>([
        ['/a-success', { data: 1 }],
        ['/b-error', { error: new Error('boom') }],
        ['/c-loading', { isLoading: true, isValidating: true }]
      ]);
      render(
        <Wrapper cache={cache}>
          <SWRDevtoolsPanel />
        </Wrapper>
      );

      sortBy('Status');

      expect(listedKeys()).toEqual(['/b-error', '/c-loading', '/a-success']);
    });

    it('sorts by last updated, newest first', async () => {
      const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
      const cache: Cache = new Map([
        ['/api/a', { data: 'a' }],
        ['/api/b', { data: 'b' }]
      ]);
      function UpdateB() {
        const { mutate } = useSWRConfig();
        return (
          <button onClick={() => mutate('/api/b', 'b2', { revalidate: false })}>update</button>
        );
      }
      render(
        <Wrapper cache={cache}>
          <UpdateB />
          <SWRDevtoolsPanel />
        </Wrapper>
      );

      now.mockReturnValue(1_060_000);
      await act(async () => {
        screen.getByRole('button', { name: 'update' }).click();
      });
      sortBy('Last updated');

      expect(listedKeys()).toEqual(['/api/b', '/api/a']);
    });
  });

  describe('key detail', () => {
    function renderCache(entries: [string, object][]) {
      const cache: Cache = new Map(entries);
      render(
        <Wrapper cache={cache}>
          <AddKey />
          <SWRDevtoolsPanel />
        </Wrapper>
      );
      return cache;
    }

    const select = (label: string) =>
      fireEvent.click(within(rowFor(label)).getByRole('button', { name: label }));

    const detail = () => within(panel().getByRole('region', { name: 'Key details' }));

    const tree = (name: string) => within(detail().getByRole('list', { name }));

    it('shows nothing until a key is selected', () => {
      renderCache([['/api/user', { data: 'Ada' }]]);

      expect(panel().queryByRole('region', { name: 'Key details' })).not.toBeInTheDocument();
    });

    it("shows the selected key's full key, status and data", () => {
      renderCache([['@"/api/posts",2,', { data: { title: 'Hello' } }]]);

      select('["/api/posts", 2]');

      expect(detail().getByRole('heading', { name: '["/api/posts", 2]' })).toBeInTheDocument();
      expect(detail().getByText('@"/api/posts",2,')).toBeInTheDocument();
      expect(detail().getByText('Success')).toHaveClass('badge');
      expect(tree('Data').getByText('"Hello"')).toBeInTheDocument();
      expect(detail().queryByRole('list', { name: 'Error' })).not.toBeInTheDocument();
    });

    it("shows a key's error, with the fields a fetcher added", () => {
      const error = Object.assign(new Error('Request failed'), { status: 500 });
      renderCache([['/api/user', { error }]]);

      select('/api/user');

      expect(tree('Error').getByText('Error: Request failed')).toBeInTheDocument();
      expect(tree('Error').getByText('500')).toBeInTheDocument();
    });

    it('marks the selected row, and hides the details when it is clicked again', () => {
      renderCache([['/api/user', { data: 'Ada' }]]);
      const key = within(rowFor('/api/user')).getByRole('button', { name: '/api/user' });

      select('/api/user');
      expect(key).toHaveAttribute('aria-pressed', 'true');

      select('/api/user');
      expect(key).toHaveAttribute('aria-pressed', 'false');
      expect(panel().queryByRole('region', { name: 'Key details' })).not.toBeInTheDocument();
    });

    it('closes from its own close button', () => {
      renderCache([['/api/user', { data: 'Ada' }]]);
      select('/api/user');

      fireEvent.click(detail().getByRole('button', { name: 'Close key details' }));

      expect(panel().queryByRole('region', { name: 'Key details' })).not.toBeInTheDocument();
    });

    it('stays open while the list is filtered', () => {
      renderCache([['/api/user', { data: 'Ada' }]]);
      select('/api/user');

      fireEvent.change(panel().getByRole('searchbox', { name: 'Filter keys' }), {
        target: { value: 'nope' }
      });

      expect(detail().getByRole('heading', { name: '/api/user' })).toBeInTheDocument();
    });

    it('updates live, and closes when the key is deleted', async () => {
      renderCache([['/api/new', { data: 'old' }]]);
      select('/api/new');

      await act(async () => {
        screen.getByRole('button', { name: 'add' }).click();
      });
      expect(tree('Data').getByText('"x"')).toBeInTheDocument();

      await act(async () => {
        within(rowFor('/api/new')).getByRole('button', { name: 'Delete' }).click();
      });
      expect(panel().queryByRole('region', { name: 'Key details' })).not.toBeInTheDocument();
    });

    it('opens the root and keeps deeper nodes collapsed until clicked', () => {
      renderCache([['/api/user', { data: { profile: { name: 'Ada' } } }]]);
      select('/api/user');

      const profile = tree('Data').getByRole('button', { name: /profile/ });
      expect(tree('Data').getByRole('button', { name: 'Object(1)' })).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      expect(profile).toHaveAttribute('aria-expanded', 'false');
      expect(tree('Data').queryByText('"Ada"')).not.toBeInTheDocument();

      fireEvent.click(profile);

      expect(profile).toHaveAttribute('aria-expanded', 'true');
      expect(tree('Data').getByText('"Ada"')).toBeInTheDocument();
    });

    it('splits a large array into ranges instead of rendering every item', () => {
      const items = Array.from({ length: 25_000 }, (_, i) => i);
      renderCache([['/api/items', { data: items }]]);
      select('/api/items');

      // 25,000 items: three ranges of 10,000, each of 100 ranges of 100.
      const ranges = tree('Data').getAllByRole('button', { name: /^\[\d+ … \d+\]$/ });
      expect(ranges.map((range) => range.textContent)).toEqual([
        '[0 … 9999]',
        '[10000 … 19999]',
        '[20000 … 24999]'
      ]);
      expect(tree('Data').getAllByRole('listitem')).toHaveLength(4);

      fireEvent.click(ranges[2]!);
      fireEvent.click(tree('Data').getByRole('button', { name: '[24900 … 24999]' }));

      expect(tree('Data').getByText('24999', { selector: '.json-value' })).toBeInTheDocument();
    });

    it('shows circular references without looping', () => {
      const data: Record<string, unknown> = { name: 'loop' };
      data.self = data;
      renderCache([['/api/loop', { data }]]);
      select('/api/loop');

      expect(tree('Data').getByText('[Circular]')).toBeInTheDocument();
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
