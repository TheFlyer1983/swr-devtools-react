import type { Cache } from 'swr';
import { SWRGlobalState } from 'swr/_internal';
import { describe, expect, it } from 'vitest';
import { readHookCounts } from './hook-counts.ts';

const noop = () => {};

/** Gives the cache SWR's state, with only the parts the counts read. */
function withRevalidators(revalidators: unknown): Cache {
  const cache: Cache = new Map();
  // @ts-expect-error -- only the first item of SWR's state tuple matters here.
  SWRGlobalState.set(cache, [revalidators]);
  return cache;
}

describe('readHookCounts', () => {
  it('counts the revalidators under each key', () => {
    const cache = withRevalidators({ '/api/user': [noop, noop], '$inf$/api/feed': [noop] });

    expect(readHookCounts(cache)).toEqual(
      new Map([
        ['/api/user', 2],
        ['$inf$/api/feed', 1]
      ])
    );
  });

  it('reads a registry with no prototype, the way SWR creates it', () => {
    const empty: object = Object.create(null);
    const revalidators = Object.assign(empty, { '/api/user': [noop] });

    expect(readHookCounts(withRevalidators(revalidators))).toEqual(new Map([['/api/user', 1]]));
  });

  it('leaves out keys whose hooks have all unmounted', () => {
    const cache = withRevalidators({ '/api/user': [] });

    expect(readHookCounts(cache)).toEqual(new Map());
  });

  it("is unknown for a cache SWR hasn't set up", () => {
    expect(readHookCounts(new Map())).toBeUndefined();
  });

  it("is unknown when SWR's state isn't the shape it expects", () => {
    expect(readHookCounts(withRevalidators(undefined))).toBeUndefined();
    expect(readHookCounts(withRevalidators({ '/api/user': 1 }))).toBeUndefined();
    // Would enumerate as empty, marking every key unused.
    expect(readHookCounts(withRevalidators(new Map([['/api/user', [noop]]])))).toBeUndefined();
  });
});
