import { createCacheActions, type CacheActions } from '@swr-devtools-react/core';
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import useSWR, { SWRConfig, useSWRConfig, type Cache } from 'swr';
import { describe, expect, it } from 'vitest';

// Confirms the core actions make real SWR hooks re-render (issue #9).

function Wrapper({ cache, children }: { cache: Cache; children: ReactNode }) {
  return <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>{children}</SWRConfig>;
}

function counter(prefix: string) {
  let calls = 0;
  const fetcher = () => Promise.resolve(`${prefix}${++calls}`);
  return { fetcher, calls: () => calls };
}

function Show({ swrKey, fetcher }: { swrKey: string; fetcher: () => Promise<string> }) {
  const { data } = useSWR(swrKey, fetcher);
  return <p>{`${swrKey}: ${data ?? 'none'}`}</p>;
}

let actions: CacheActions | undefined;
function GrabActions() {
  const { cache, mutate } = useSWRConfig();
  actions ??= createCacheActions(cache, mutate);
  return null;
}

async function run(action: (actions: CacheActions) => Promise<void>) {
  if (!actions) throw new Error('Actions not ready');
  const current = actions;
  await act(() => action(current));
}

function renderWith(...nodes: ReactNode[]) {
  actions = undefined;
  const cache: Cache = new Map();
  render(
    <Wrapper cache={cache}>
      {nodes}
      <GrabActions />
    </Wrapper>
  );
  return cache;
}

describe('cache actions with mounted hooks', () => {
  it('revalidate refetches and re-renders', async () => {
    const user = counter('v');
    renderWith(<Show key="u" swrKey="/api/user" fetcher={user.fetcher} />);
    expect(await screen.findByText('/api/user: v1')).toBeInTheDocument();

    await run((a) => a.revalidate('/api/user'));

    expect(await screen.findByText('/api/user: v2')).toBeInTheDocument();
    expect(user.calls()).toBe(2);
  });

  it('remove re-renders the hook with no data and empties the key', async () => {
    const user = counter('v');
    const cache = renderWith(<Show key="u" swrKey="/api/user" fetcher={user.fetcher} />);
    expect(await screen.findByText('/api/user: v1')).toBeInTheDocument();

    await run((a) => a.remove('/api/user'));

    expect(await screen.findByText('/api/user: none')).toBeInTheDocument();
    expect(cache.get('/api/user')?.data).toBeUndefined();
    expect(user.calls()).toBe(1);
  });

  it('setData re-renders with the new data without refetching', async () => {
    const user = counter('v');
    renderWith(<Show key="u" swrKey="/api/user" fetcher={user.fetcher} />);
    expect(await screen.findByText('/api/user: v1')).toBeInTheDocument();

    await run((a) => a.setData('/api/user', 'edited'));

    expect(await screen.findByText('/api/user: edited')).toBeInTheDocument();
    expect(user.calls()).toBe(1);
  });

  it('clearAll re-renders every hook with no data', async () => {
    const user = counter('u');
    const posts = counter('p');
    renderWith(
      <Show key="u" swrKey="/api/user" fetcher={user.fetcher} />,
      <Show key="p" swrKey="/api/posts" fetcher={posts.fetcher} />
    );
    expect(await screen.findByText('/api/user: u1')).toBeInTheDocument();
    expect(await screen.findByText('/api/posts: p1')).toBeInTheDocument();

    await run((a) => a.clearAll());

    expect(await screen.findByText('/api/user: none')).toBeInTheDocument();
    expect(await screen.findByText('/api/posts: none')).toBeInTheDocument();
  });
});
