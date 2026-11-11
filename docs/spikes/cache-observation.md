# Spike: observing SWR cache changes live

Issue: #5 · Date: 2026-11-11 · SWR 2.5.1, React 19.3

**Question:** how does the panel find out that the SWR cache changed, so the key list updates live?

**Decision:** wrap the `set` and `delete` methods of the cache object SWR is already using (approach **E**), installed by `core`. If the cache object can't be patched, fall back to polling (**B**). Users need no setup for live updates.

The prototypes are in commit `9fbe09c` on this PR (`playgrounds/vite/src/spike/`) and were removed before merging.

## How SWR writes to its cache

Read from `swr/dist/config-context-*.mjs`:

- **Every write goes through one internal setter**, which calls `provider.set(key, value)` and then notifies that key's subscribers. `useSWR`, `useSWRInfinite`, `useSWRSubscription` and `mutate` all write through it, via `createCacheHelper`.
- **Only `unload()` calls `provider.delete`.** Normal use never deletes keys.
- **SWR's own listeners are per key.** Hooks subscribe to the key they use, and there is no "any key changed" listener to reuse.
- **Each write replaces the entry object** (`mergeObjects(prev, info)`), so reference equality is enough to detect a change.

Two consequences beyond this spike:

1. **Keys stay in the cache after their component unmounts.** Unticking a playground card doesn't remove its key, so a panel can't use "key exists" to mean "in use". Showing mounted vs not needs observer tracking (#21), via middleware (D) or SWR internals.
2. **`cache.delete(key)` doesn't notify mounted hooks**, because SWR's subscriber list is only called from its own setter. The panel's Delete action (#9) needs a way to delete that also re-renders hooks.

## Approaches compared

All five ran together in the Vite playground (`?spike`). The script waited for the initial load, then revalidated `/api/user`, went to posts page 2, loaded feed page 2 and unmounted the Error card. Transitions are distinct `key → state` pairs (e.g. `/api/user → validating+data`).

|       | Approach                                                      | User setup                      | Saw every transition?                                                                                              | Cost                                                    | Risk                                                                                                                                                                       |
| ----- | ------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Custom `provider` that wraps a `Map`                          | Add `provider` to `<SWRConfig>` | Yes (27/27, from the very first write)                                                                             | None                                                    | **Crashes in dev with StrictMode** if the app uses `useSWRSubscription` or `useSWRInfinite`: [vercel/swr#2771](https://github.com/vercel/swr/issues/2771), open since 2023 |
| **B** | Poll `cache.keys()` every 250ms and diff                      | None                            | **No**: missed 2 of 16 after start-up. Fast transitions such as `/api/user → validating+data` happen between ticks | ~0.04ms/tick at 10 keys, ~2ms at 1,000 keys (max 4.5ms) | Lag of up to one interval                                                                                                                                                  |
| **C** | Replace SWR's private setter (`SWRGlobalState.get(cache)[5]`) | None                            | Yes                                                                                                                | None                                                    | Undocumented tuple index, can break in any SWR release. Easy to double-patch under StrictMode (saw 96 events for 44 writes)                                                |
| **D** | Middleware (`use` option)                                     | Add `use` to `<SWRConfig>`      | **No**: sees hook mount/unmount only, never the writes                                                             | None                                                    | Useful for observer counts (#21), not for this                                                                                                                             |
| **E** | Wrap `set`/`delete` on the existing cache object              | None                            | Yes, identical to A from install onwards (0 differences, 16/16)                                                    | None                                                    | Depends on SWR calling `provider.set` on that object, which is SWR's public `Cache` interface. Fails if the object is frozen                                               |

Bulk check: `mutate` on 1,000 new keys produced 2,000 writes. A, C and E saw all 2,000. B saw 1,000 (writes between ticks merge).

### The StrictMode crash (approach A)

With only `provider: () => new Map()` (SWR's documented example), React StrictMode and one `useSWRSubscription` hook, the app throws `TypeError: Cannot read properties of undefined (reading '6')` in `createCacheHelper`, and nothing renders. Without StrictMode it works.

StrictMode's dev-only unmount/remount makes `<SWRConfig>` drop its provider's global state, and child hooks re-run their effects before the parent re-registers it. The same error is reported in vercel/swr#2771, including a recent comment from someone using `provider: () => new Map()` in tests. Vite and Next.js templates enable StrictMode by default, so requiring a `provider` would break dev mode for many users.

## Decision

**E as the primary mechanism, B as the fallback.**

- **Zero setup.** `<SWRDevtools />` inside the app's `<SWRConfig>` (or anywhere, for SWR's default global cache) is enough to get live updates. This partly answers open question 2 (#6).
- **Complete.** It sees every write, including infinite and subscription keys.
- **Avoids vercel/swr#2771**, because no new provider is created.
- **Uses SWR's public `Cache` interface** (`get`/`set`/`delete`/`keys`), not private state.

Notes for the implementation (#8):

- **Install it in `core`, not in a React hook.** oxlint's `react(immutability)` rule rejects mutating an object returned by `useSWRConfig()`, and the logic belongs in `core` anyway: `observeCache(cache, listener) → unsubscribe`.
- **Install early and read a snapshot.** In the spike, E was installed ~11ms after the first writes and missed the initial `loading` transitions. The panel should read the current entries on install, then follow changes. Installing during render, not in an effect, also gets it in before child hooks' effects run.
- **Make it idempotent and restorable.** One patch per cache object, shared by any number of listeners, removed when the last listener unsubscribes. That avoids C's double-patching under StrictMode.
- **Fall back to polling** if the patch can't be installed (e.g. a frozen custom cache), and say so in the panel.

## Follow-ups this spike raised

- **#12 / spec 6.2:** "keys disappear as the playground unmounts" is wrong for SWR. Keys stay. The done-when criterion is updated in the spec.
- **#9:** Delete must notify mounted hooks. `cache.delete` alone doesn't.
- **#21:** observer counts and "unmounted" markers need D (middleware, needs user setup) or SWR internals (`EVENT_REVALIDATORS`). Decide there.
