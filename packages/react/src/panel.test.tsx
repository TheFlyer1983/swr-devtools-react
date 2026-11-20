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

/** `toHaveFocus` reads `document.activeElement`, which stops at the shadow host. */
function hasFocus(element: HTMLElement): boolean {
  const root = element.getRootNode();
  return root instanceof ShadowRoot && root.activeElement === element;
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

  it("doesn't submit a form it sits inside", () => {
    renderTwoKeys();

    for (const button of panel().getAllByRole('button')) {
      expect(button).toHaveAttribute('type', 'button');
    }
  });

  describe('Clear all', () => {
    const clearAll = () => panel().getByRole('button', { name: 'Clear all' });
    const confirmation = () => within(panel().getByRole('group', { name: 'Confirm Clear all' }));

    it('asks first, and moves focus to Cancel', () => {
      const cache = renderTwoKeys();

      fireEvent.click(clearAll());

      expect(confirmation().getByText('Clear every key?')).toBeInTheDocument();
      expect(hasFocus(confirmation().getByRole('button', { name: 'Cancel' }))).toBe(true);
      expect([...cache.keys()]).toEqual(['/api/user', '/api/posts']);
    });

    it('clears every key once confirmed', async () => {
      renderTwoKeys();
      fireEvent.click(clearAll());

      await act(async () => {
        confirmation().getByRole('button', { name: 'Clear' }).click();
      });

      expect(panel().getByText(/0 keys/)).toBeInTheDocument();
      expect(hasFocus(clearAll())).toBe(true);
    });

    it('keeps the cache when cancelled, and returns focus to Clear all', () => {
      const cache = renderTwoKeys();
      fireEvent.click(clearAll());

      fireEvent.click(confirmation().getByRole('button', { name: 'Cancel' }));

      expect([...cache.keys()]).toEqual(['/api/user', '/api/posts']);
      expect(panel().queryByRole('group', { name: 'Confirm Clear all' })).not.toBeInTheDocument();
      expect(hasFocus(clearAll())).toBe(true);
    });

    it('cancels with Escape', () => {
      const cache = renderTwoKeys();
      fireEvent.click(clearAll());

      fireEvent.keyDown(confirmation().getByRole('button', { name: 'Cancel' }), { key: 'Escape' });

      expect([...cache.keys()]).toEqual(['/api/user', '/api/posts']);
      expect(hasFocus(clearAll())).toBe(true);
    });

    it("doesn't take focus when the panel first renders", () => {
      renderTwoKeys();

      expect(hasFocus(clearAll())).toBe(false);
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
        detail().getByRole('button', { name: 'Delete' }).click();
      });
      expect(panel().queryByRole('region', { name: 'Key details' })).not.toBeInTheDocument();
    });

    it('deletes the key, leaving the others', async () => {
      const cache = renderCache([
        ['/api/user', { data: 'Ada' }],
        ['/api/posts', { data: [] }]
      ]);
      select('/api/user');

      await act(async () => {
        detail().getByRole('button', { name: 'Delete' }).click();
      });

      expect([...cache.keys()]).toEqual(['/api/posts']);
      expect(rowFor('/api/posts')).toBeInTheDocument();
    });

    it('revalidates the key through its hook', async () => {
      let calls = 0;
      const fetcher = () => Promise.resolve(`v${++calls}`);
      render(
        <Wrapper cache={new Map()}>
          <User fetcher={fetcher} />
          <SWRDevtoolsPanel />
        </Wrapper>
      );
      expect(await screen.findByText('user: v1')).toBeInTheDocument();
      select('/api/user');

      await act(async () => {
        detail().getByRole('button', { name: 'Revalidate' }).click();
      });

      expect(await screen.findByText('user: v2')).toBeInTheDocument();
    });

    it('disables Revalidate for subscription keys, and says why', async () => {
      // A fetcher on the $sub$ key itself, so a click that got through would
      // show up as a second fetch.
      let calls = 0;
      function Feed() {
        const { data } = useSWR('$sub$/api/feed', () => Promise.resolve(`v${++calls}`));
        return <p>feed: {data ?? '…'}</p>;
      }
      render(
        <Wrapper cache={new Map()}>
          <Feed />
          <SWRDevtoolsPanel />
        </Wrapper>
      );
      expect(await screen.findByText('feed: v1')).toBeInTheDocument();
      select('/api/feed');

      const revalidate = detail().getByRole('button', { name: 'Revalidate' });
      expect(revalidate).toHaveAttribute('aria-disabled', 'true');
      expect(revalidate).toHaveAccessibleDescription(/no fetcher/);

      await act(async () => {
        revalidate.click();
      });
      expect(calls).toBe(1);
    });

    it('keeps Revalidate enabled for standard and infinite keys', () => {
      renderCache([
        ['/api/user', { data: 'Ada' }],
        ['$inf$/api/page/0', { data: [] }]
      ]);

      for (const label of ['/api/user', '/api/page/0']) {
        select(label);
        expect(detail().getByRole('button', { name: 'Revalidate' })).not.toHaveAttribute(
          'aria-disabled'
        );
      }
    });

    describe('editing data', () => {
      const editor = () => detail().getByRole('textbox', { name: 'Data as JSON' });
      const edit = () => fireEvent.click(detail().getByRole('button', { name: 'Edit' }));
      const type = (text: string) => fireEvent.change(editor(), { target: { value: text } });

      it('opens prefilled with the formatted JSON, and focused', () => {
        renderCache([['/api/user', { data: { name: 'Ada' } }]]);
        select('/api/user');

        edit();

        expect(editor()).toHaveValue('{\n  "name": "Ada"\n}');
        expect(hasFocus(editor())).toBe(true);
        expect(detail().queryByRole('list', { name: 'Data' })).not.toBeInTheDocument();
      });

      it('applies the edit, and the app updates without refetching', async () => {
        let calls = 0;
        const fetcher = () => Promise.resolve(`v${++calls}`);
        render(
          <Wrapper cache={new Map()}>
            <User fetcher={fetcher} />
            <SWRDevtoolsPanel />
          </Wrapper>
        );
        expect(await screen.findByText('user: v1')).toBeInTheDocument();
        select('/api/user');
        edit();
        type('"edited"');

        await act(async () => {
          fireEvent.click(detail().getByRole('button', { name: 'Apply' }));
        });

        expect(await screen.findByText('user: edited')).toBeInTheDocument();
        expect(calls).toBe(1);
        expect(tree('Data').getByText('"edited"')).toBeInTheDocument();
        expect(hasFocus(detail().getByRole('button', { name: 'Edit' }))).toBe(true);
      });

      it("shows an error for invalid JSON, and doesn't apply it", async () => {
        const cache = renderCache([['/api/user', { data: 'Ada' }]]);
        select('/api/user');
        edit();
        type('{ name: ');

        await act(async () => {
          fireEvent.click(detail().getByRole('button', { name: 'Apply' }));
        });

        expect(detail().getByRole('alert')).toHaveTextContent(/^Invalid JSON: /);
        expect(editor()).toHaveAttribute('aria-invalid', 'true');
        expect(editor()).toHaveAccessibleDescription(/^Invalid JSON: /);
        expect(cache.get('/api/user')?.data).toBe('Ada');

        type('{ "name": "Ada" }');
        expect(detail().queryByRole('alert')).not.toBeInTheDocument();
      });

      it('applies with Ctrl+Enter', async () => {
        const cache = renderCache([['/api/user', { data: 'Ada' }]]);
        select('/api/user');
        edit();
        type('[1, 2]');

        await act(async () => {
          fireEvent.keyDown(editor(), { key: 'Enter', ctrlKey: true });
        });

        expect(cache.get('/api/user')?.data).toEqual([1, 2]);
      });

      it('cancels with the Cancel button or Escape, keeping the data', () => {
        const cache = renderCache([['/api/user', { data: 'Ada' }]]);
        select('/api/user');

        edit();
        type('"changed"');
        fireEvent.click(detail().getByRole('button', { name: 'Cancel' }));
        expect(detail().queryByRole('textbox')).not.toBeInTheDocument();
        expect(hasFocus(detail().getByRole('button', { name: 'Edit' }))).toBe(true);

        edit();
        fireEvent.keyDown(editor(), { key: 'Escape' });
        expect(detail().queryByRole('textbox')).not.toBeInTheDocument();

        edit();
        fireEvent.keyDown(detail().getByRole('button', { name: 'Cancel' }), { key: 'Escape' });
        expect(detail().queryByRole('textbox')).not.toBeInTheDocument();
        expect(cache.get('/api/user')?.data).toBe('Ada');
      });

      it('opens with the current data when the app changed it in place', async () => {
        const data = { name: 'Ada' };
        function Rename() {
          const { mutate } = useSWRConfig();
          return (
            <button
              onClick={() => {
                data.name = 'Grace';
                void mutate('/api/user', data, { revalidate: false });
              }}
            >
              rename
            </button>
          );
        }
        render(
          <Wrapper cache={new Map([['/api/user', { data }]])}>
            <Rename />
            <SWRDevtoolsPanel />
          </Wrapper>
        );
        select('/api/user');

        await act(async () => {
          screen.getByRole('button', { name: 'rename' }).click();
        });
        edit();

        expect(editor()).toHaveValue('{\n  "name": "Grace"\n}');
      });

      it("keeps the user's text when the data changes while editing", async () => {
        renderCache([['/api/new', { data: 'old' }]]);
        select('/api/new');
        edit();
        type('"mine"');

        await act(async () => {
          screen.getByRole('button', { name: 'add' }).click();
        });

        expect(editor()).toHaveValue('"mine"');
      });

      it('warns when JSON would change the data', () => {
        renderCache([['/api/user', { data: { joined: new Date(0) } }]]);
        select('/api/user');
        edit();

        expect(editor()).toHaveAccessibleDescription(/dates or Maps/);
      });

      it("disables Edit for data JSON can't write, and says why", () => {
        const data: Record<string, unknown> = {};
        data.self = data;
        renderCache([['/api/loop', { data }]]);
        select('/api/loop');

        const button = detail().getByRole('button', { name: 'Edit' });
        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(button).toHaveAccessibleDescription(/can’t be edited/);
        fireEvent.click(button);
        expect(detail().queryByRole('textbox')).not.toBeInTheDocument();
      });
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

    it('keeps a property expanded when a sibling before it goes away', async () => {
      function Update() {
        const { mutate } = useSWRConfig();
        return (
          <button onClick={() => mutate('/api/user', { b: { y: 3 } }, { revalidate: false })}>
            update
          </button>
        );
      }
      render(
        <Wrapper cache={new Map([['/api/user', { data: { a: { x: 1 }, b: { y: 2 } } }]])}>
          <Update />
          <SWRDevtoolsPanel />
        </Wrapper>
      );
      select('/api/user');
      fireEvent.click(tree('Data').getByRole('button', { name: /^b/ }));
      expect(tree('Data').getByText('2')).toBeInTheDocument();

      await act(async () => {
        screen.getByRole('button', { name: 'update' }).click();
      });

      expect(tree('Data').getByRole('button', { name: /^b/ })).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      expect(tree('Data').getByText('3')).toBeInTheDocument();
    });

    it("says so in place of a tree it can't show, and keeps the panel working", () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const data = new Proxy(
        {},
        {
          ownKeys() {
            throw new Error('revoked');
          }
        }
      );
      renderCache([['/api/proxy', { data }]]);

      select('/api/proxy');

      expect(detail().getByText("Couldn't show this value: revoked")).toBeInTheDocument();
      expect(rowFor('/api/proxy')).toBeInTheDocument();
      vi.restoreAllMocks();
    });

    it("still says so when the failure's message isn't a string", () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const failure = Object.assign(new Error(), { message: { code: 42 } });
      const data = new Proxy(
        {},
        {
          ownKeys() {
            throw failure;
          }
        }
      );
      renderCache([['/api/proxy', { data }]]);

      select('/api/proxy');

      expect(detail().getByText("Couldn't show this value: [object Object]")).toBeInTheDocument();
      vi.restoreAllMocks();
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
