# swr-devtools-react: Specification

Status: draft · Last updated: 2026-11-27

## 1. Problem

SWR has no in-app devtools comparable to TanStack Query Devtools. The existing options are:

- **koba04/swr-devtools**: a browser-extension tab, plus an embeddable `swr-devtools-panel` that is mostly read-only and depends on `styled-components`.
- **swr-devtools-community**: an in-app panel with revalidate and delete, but no commits for about nine months.

Developers using SWR can't easily see what is in the cache, or revalidate, delete or edit a key without writing throwaway code.

## 2. Goal

A floating, in-app devtools panel for SWR that feels like TanStack Query Devtools. It lets you see every cache key and act on it.

### Non-goals (for now)

- SWR v1 support
- Frameworks other than React. SWR is React-only. The `core` package keeps the door open for other hosts later.
- A browser extension
- Production use. The panel must never ship in production bundles by default.

## 3. Users

Developers building React apps with SWR v2, in Vite/React or Next.js (App Router and Pages Router).

## 4. Decisions

| Decision           | Choice                                                                     | Notes                                                                                                                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SWR support        | v2 only                                                                    |                                                                                                                                                                                                                                                                                                 |
| Delivery           | Standalone first                                                           | The panel is the product. TanStack Devtools and Vite DevTools are thin adapters added later.                                                                                                                                                                                                    |
| Styling            | Plain CSS inside a Shadow DOM                                              | No runtime deps. Host styles can't leak in or out. Design tokens are CSS variables so a later switch to Tailwind is mechanical. Tailwind v4 needs a Shadow DOM workaround, so revisit then.                                                                                                     |
| Next.js            | First-class in MVP                                                         | `'use client'` entry, tested in a Next.js playground                                                                                                                                                                                                                                            |
| Licence            | MIT                                                                        |                                                                                                                                                                                                                                                                                                 |
| Repo / npm name    | `swr-devtools-react`                                                       | Check npm availability before first publish.                                                                                                                                                                                                                                                    |
| Live cache updates | Wrap `set`/`delete` on the existing cache object; poll as a fallback       | No user setup. Avoids a custom `provider`, which crashes under StrictMode with infinite/subscription hooks (vercel/swr#2771). See [docs/spikes/cache-observation.md](spikes/cache-observation.md).                                                                                              |
| Hook counts        | Read SWR's hook registry (`EVENT_REVALIDATORS`) from `swr/_internal`       | No user setup, and counts every hook, not only those under a configured `<SWRConfig>`. Undocumented, so any unexpected shape hides counts instead of showing wrong ones. Unmounts don't write to the cache, so counts are rechecked every 500ms. Middleware was rejected: it needs setup (#21). |
| Docs site          | Starlight (Astro) in `apps/docs`, at `swr-devtools-react.theflyer1983.dev` | Mostly written docs with live panel demos as `client:only` React islands. Production deploys with releases that become npm `latest`; `main` deploys to `next.swr-devtools-react.theflyer1983.dev`. Decided in #30 after the #63 spike.                                                          |

## 5. Package structure

```
packages/
  core/      Reads the SWR cache, subscribes to changes, runs actions. No UI. Internal at first.
  react/     <SWRDevtoolsPanel /> (panel only) and <SWRDevtools /> (panel + floating toggle).
             Published as `swr-devtools-react`.
  tanstack/  (v0.3) Registers <SWRDevtoolsPanel /> as a TanStack Devtools plugin.
playgrounds/
  shared/    Scenarios, fetcher, mock API routes and styles both playgrounds use
  vite/      React + Vite + SWR, using the devtools' source
  next/      Next.js App Router and Pages Router + SWR, using the devtools' built dist
apps/
  docs/      (v0.2) Starlight docs site with live panel demos, using the devtools' built dist
docs/        This spec and spike notes
```

### Setup

One line, with no provider or middleware to add. Place `<SWRDevtools />` inside the app's `<SWRConfig>`:

```tsx
import { SWRConfig } from 'swr';
import { SWRDevtools } from 'swr-devtools-react';

<SWRConfig value={{ fetcher }}>
  <App />
  <SWRDevtools />
</SWRConfig>;
```

- The panel uses the cache of the nearest `<SWRConfig>`, through `useSWRConfig()`. Without an `<SWRConfig>`, that's SWR's default global cache, so `<SWRDevtools />` can go anywhere in the tree.
- Apps with several `<SWRConfig provider>`s get the nearest one only in the MVP. Choosing between caches is #25.
- Live updates and hook counts need no setup (see §4).

## 6. MVP (v0.1) features

### 6.1 Floating toggle and panel

- A floating button opens and closes the panel. Open/closed state persists across reloads.
- Configurable button corner and panel dock position (bottom or right).
- Resizable panel.
- Renders inside a Shadow DOM.

**Done when:** the panel opens and closes in both playgrounds, and its styles are unaffected by an aggressive global CSS reset in the host app.

### 6.2 Cache key list

- Lists every key in the SWR cache.
- Status badge per key: loading, validating, success, error. Colours are designed for SWR's states, not copied from TanStack. An entry with no data, no error and no request in flight (e.g. after `mutate(key, undefined)`) shows as idle.
- Shows time since the data was last fetched successfully or changed. A failed refetch doesn't reset it.
- Serialised array/object keys are displayed readably.
- `useSWRInfinite` (`$inf$`) and `useSWRSubscription` (`$sub$`) keys are labelled as such.
- The list updates live as the cache changes, with no manual refresh.

**Done when:** keys appear and change status in the panel as the playground app fetches, revalidates and errors. SWR keeps keys in the cache after their components unmount, so keys stay listed; marking unused keys comes with observer counts (v0.2).

### 6.3 Search and sort

- Filter keys by text.
- Sort by key, status or last updated.

### 6.4 Key detail view

- Selecting a key shows its full key, status, error (if any) and data as a collapsible JSON tree.

### 6.5 Actions

- **Revalidate** a key (`mutate(key)`)
- **Delete** a key from the cache; mounted hooks are notified. `cache.delete` alone doesn't notify them (see the cache-observation spike). Known limit: a hook using `keepPreviousData` keeps showing its last data until it next fetches, because SWR keeps that copy inside the hook and has no per-key way to drop it.
- **Clear all**, behind a confirmation. On SWR 2.5+ it uses SWR's `unload()`, which also cancels in-flight requests and drops `keepPreviousData` copies. Older SWR removes keys one by one, with the same `keepPreviousData` limit as Delete.
- **Edit data**: edit the JSON and apply it with `mutate(key, data, { revalidate: false })`. Invalid JSON is rejected with a clear message.

**Done when:** each action visibly affects the playground UI as expected.

### 6.6 Production safety

- By default, `<SWRDevtools />` renders nothing when `process.env.NODE_ENV === 'production'`, and the import is tree-shaken out.
- Documented opt-in for forcing it on (e.g. staging).

**Done when:** a production build of each playground contains no devtools code.

## 7. Later milestones

Milestones are releases we've committed to. Ideas that aren't committed stay in the backlog (open issues with no milestone) until they're scheduled.

**v0.2: Docs site and quick wins**

- Docs site (#30): Starlight in `apps/docs`, with focused live demos per page (#70)
- Richer mock API data, shaped like JSONPlaceholder, for the playgrounds and docs demos (#68)
- Observer count per key, read from SWR's hook registry (#21). Keys with no mounted hook are marked unused, and Revalidate is disabled for them.
- Light/dark theme following system preference, with a picker in the panel (#24). A `theme` prop lets a host such as TanStack Devtools set it instead, which hides the picker.

**v0.3: TanStack plugin and deeper inspection**

- TanStack Devtools plugin (#20, `packages/tanstack`)
- Multiple SWR caches (#25)
- Trigger loading / trigger error states (#22 spike to confirm hooks re-render correctly, then #23)

**Backlog**

- Mutations tab (`useSWRMutation`, #26)
- Simulate offline (#27)
- Vite DevTools adapter (#28)
- Open panel in a separate window (#29)
- Drag the toggle button along the screen edge (#40)
- Revalidate all keys (#42)

## 8. Tooling (proposed)

- pnpm workspaces, TypeScript (strict)
- Build: tsdown or tsup (ESM + types; `'use client'` banner preserved)
- Tests: Vitest + React Testing Library; Playwright smoke tests against the playgrounds later
- Lint/format: Oxc (`oxlint` for linting, `oxfmt` for formatting)
- Releases: Changesets
- Docs: Starlight (Astro), static output with Pagefind search
- CI: GitHub Actions (lint, typecheck, test, build)

## 9. Open questions

1. ~~**Live updates:** how to observe cache changes.~~ **Resolved (#5):** wrap `set`/`delete` on the existing cache object, with polling as a fallback. See §4 and [docs/spikes/cache-observation.md](spikes/cache-observation.md).
2. ~~**Setup API:** can `<SWRDevtools />` work just by being placed inside `<SWRConfig>`?~~ **Resolved (#6):** yes. See §5, Setup. Observer counts don't need middleware either (#21).
3. ~~**Multiple SWR caches:** support in MVP or later?~~ **Resolved (#6):** the MVP inspects the nearest `<SWRConfig>` only. Choosing between caches is #25.
4. **Edit-data UX:** raw JSON textarea for MVP, or a proper inline JSON editor?
