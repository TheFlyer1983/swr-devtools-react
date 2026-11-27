# Spike: forcing loading and error states

Issue: #22 · Date: 2026-11-27 · SWR 2.5.1, React 19.3

**Question:** can the panel put a key into a loading or error state, so the app's own loading and error UI renders, and can it put the key back afterwards? Do hooks re-render correctly when it does?

**Decision:** yes. Write the forced state through SWR's own setter (`createCacheHelper` from `swr/_internal`), and hold it by parking a request that never settles in SWR's request table for that key. Restore writes back a snapshot of the entry and removes the parked request. No user setup is needed, and no fetch happens on force or restore.

The prototypes are 23 Vitest + React Testing Library tests in commit `03bf0bc` on this PR (`packages/react/src/spike/trigger-states.test.tsx`), mounting real `useSWR`, `useSWRInfinite` and `useSWRSubscription` hooks. They were removed before merging.

## Why the public API isn't enough

Read from `swr/dist/config-context-*.mjs` and `use-swr-*.mjs`:

- **`mutate` can only write `data`.** It never writes `error`, `isLoading` or `isValidating`. With a rejected promise it throws, and the cache keeps no error. A test confirms the hook keeps showing its data.
- **`cache.set` doesn't re-render hooks.** That was already known from the cache-observation spike, and a test confirms it here for `isLoading`. Hooks only hear about writes that go through SWR's internal setter.
- **`createCacheHelper(cache, key)` returns that setter**, bound to one key. It merges the given fields into the entry and notifies the key's hooks. It's a named export of `swr/_internal`, the same entry point `readHookCounts` uses, so no tuple index is needed for writing.

## What the hook does with each forced state

| Forced entry                                                          | What `useSWR` returns                                                                           |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Loading: `data`, `error` cleared, `isLoading`, `isValidating` true    | `isLoading: true`, no data. The app's loading UI renders.                                       |
| Error: `error` set, `data` cleared, `isLoading`, `isValidating` false | `error` set, no data. The app's error UI renders.                                               |
| Error, keeping `data`                                                 | `error` and the old data together, as after a failed revalidation in SWR. Works, but see below. |

Every forced write re-rendered the hook in the same `act()`, for all mounted hooks on the key. Forcing bypasses the fetcher, so `onError`, `onErrorRetry` and `onLoadingSlow` don't fire. A test waited for retries with `errorRetryInterval: 5` and saw none.

Forced error clears `data`. Keeping it is closer to a failed refetch, but two things break. A Suspense hook only throws to the error boundary when there's no data, so it would keep rendering the old content. And apps that branch on `data` before `error` would never show their error UI. Clearing it reproduces a failed first load, which is the state error UIs are written for.

## What ends a forced state

Writing the state is not enough on its own. Without a hold, SWR refetches the key and overwrites the forced state on any of these:

- a focus or visibility change (switching tabs and back), after `focusThrottleInterval`
- going back online
- `refreshInterval` polling (for loading; polling already pauses while a key has an error)
- another hook for the key mounting, because a key with no data revalidates on mount
- a Suspense hook rendering, because it revalidates during render when there's no data

Tests reproduced the focus and mount cases, and the Suspense one. A forced state that ends when you click back into the tab isn't usable.

**The hold.** SWR's state for each cache has a request table (`FETCH`, the third item) mapping a key to its in-flight request and a timestamp. Every automatic revalidation above is deduped: if the key has an entry, the hook awaits that request instead of fetching. Parking a promise that never settles there makes all of them wait. Tests confirmed it for focus, reconnect, `refreshInterval`, a second hook mounting and a Suspense hook, with no extra fetcher calls. A Suspense hook shows its fallback for forced loading, and its error boundary for forced error.

The parked entry also has a newer timestamp than any request already in flight. When that request resolves, SWR sees the mismatch and discards the result, so a slow response can't overwrite the forced state. A test checked this.

**What still ends it, on purpose:** `mutate(key)` with revalidation. SWR deletes the key's `FETCH` entry before refetching, so the panel's Revalidate button and the app's own `mutate` both end the forced state and fetch fresh data. `unload()` (Clear all) also empties `FETCH`. The panel has to notice either and drop its "forced" marker for the key.

## Restore

Before forcing, snapshot the entry's `data`, `error`, `isLoading` and `isValidating`. To restore:

1. Remove the parked `FETCH` entry, but only if it's still the one the panel put there, then resolve its promise. Hooks waiting on it see the entry is gone and discard the result.
2. Write all four fields back through the setter. Write every field explicitly. The setter merges, so a field left out keeps its forced value.

The hook renders its original state, with no fetch. Later focus revalidations fetch normally again. Tests confirmed both, including for Suspense and `useSWRInfinite`.

## Other hooks and options

- **`useSWRInfinite`** reads its state from the `$inf$` key. Forcing that key drives the hook's `isLoading` and `error`, and restore works.
- **`useSWRSubscription`** returns only `data` and `error`, with no loading state. A forced error shows until the next message, because each message clears the error. There's no fetcher, so the hold does nothing for these keys.
- **`keepPreviousData`**: forced loading shows `isLoading: true`, but `data` stays the previous value. SWR keeps that copy inside the hook, the same as for Delete.
- **Forcing doesn't touch the app's error object shape.** The panel writes a plain `Error`. App code that reads custom fields such as `error.status` sees `undefined`.

## Existing panel actions on a forced key

Two of them leave the key broken if they run while it's forced:

- **Edit data** calls `mutate(key, data, { revalidate: false })`, which writes `data` and clears `error` but leaves `isLoading: true`. The hook stays on its loading UI.
- **Delete** (and Clear all on SWR before 2.5) also calls `mutate` without revalidating, which leaves the parked `FETCH` entry. When a hook for the key mounts again, it waits on that request forever and never fetches.

Both were reproduced. The fix is simple: restore a forced key before running Edit or Delete on it.

## SWR versions

The package supports `swr@^2.0.0`. In the published 2.0.0, 2.1.0, 2.2.0, 2.3.0, 2.4.0 and 2.5.1 builds:

- `swr/_internal` exports `createCacheHelper`.
- The per-cache state starts `[EVENT_REVALIDATORS, MUTATION, FETCH, ...]`.
- Revalidation dedupes on `FETCH[key]` and discards a result when `FETCH[key][1] !== startAt`.

`FETCH` is still an undocumented tuple index. As with hook counts, `core` should check its shape (an array whose third item is a plain object) and hide the toggles if it doesn't match, rather than force a state it can't hold.

## Decision

**Force through `createCacheHelper`, hold with a parked `FETCH` entry, restore from a snapshot.**

- **Hooks re-render correctly.** Every forced state and every restore re-rendered the mounted hooks, including Suspense, infinite and subscription hooks.
- **The state holds** until the user restores it or something revalidates the key explicitly.
- **No setup, no fetch.** Nothing changes for the user, and nothing hits the network until they restore or revalidate.

Notes for the implementation (#23):

- **Put it in `core`**: `forceState(cache, key, 'loading' | 'error') → restore`, idempotent per key, like `observeCache`.
- **Restore before Edit or Delete** on a forced key. Clear all through `unload()` needs nothing extra.
- **Drop the "forced" marker** when the parked entry is no longer the panel's (the user or app revalidated) or the key leaves the cache.
- **Subscription keys:** offer Trigger error only. Trigger loading means nothing for a hook with no loading state.
- **Keys with no mounted hook:** disable both toggles, as Revalidate already is. There's nothing on screen to change.
