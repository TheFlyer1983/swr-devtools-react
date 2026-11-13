# swr-devtools-react: Specification

Status: draft · Last updated: 2026-11-12

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

| Decision           | Choice                                                               | Notes                                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SWR support        | v2 only                                                              |                                                                                                                                                                                                    |
| Delivery           | Standalone first                                                     | The panel is the product. TanStack Devtools and Vite DevTools are thin adapters added later.                                                                                                       |
| Styling            | Plain CSS inside a Shadow DOM                                        | No runtime deps. Host styles can't leak in or out. Design tokens are CSS variables so a later switch to Tailwind is mechanical. Tailwind v4 needs a Shadow DOM workaround, so revisit then.        |
| Next.js            | First-class in MVP                                                   | `'use client'` entry, tested in a Next.js playground                                                                                                                                               |
| Licence            | MIT                                                                  |                                                                                                                                                                                                    |
| Repo / npm name    | `swr-devtools-react`                                                 | Check npm availability before first publish.                                                                                                                                                       |
| Live cache updates | Wrap `set`/`delete` on the existing cache object; poll as a fallback | No user setup. Avoids a custom `provider`, which crashes under StrictMode with infinite/subscription hooks (vercel/swr#2771). See [docs/spikes/cache-observation.md](spikes/cache-observation.md). |

## 5. Package structure

```
packages/
  core/      Reads the SWR cache, subscribes to changes, runs actions. No UI. Internal at first.
  react/     <SWRDevtoolsPanel /> (panel only) and <SWRDevtools /> (panel + floating toggle).
             Published as `swr-devtools-react`.
  tanstack/  (v0.2) Registers <SWRDevtoolsPanel /> as a TanStack Devtools plugin.
playgrounds/
  vite/      React + Vite + SWR with mock endpoints
  next/      Next.js App Router + SWR
docs/
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
- Live updates need no setup (see §4). Observer counts (v0.2) may justify optional middleware; that's decided in #21, and the one-line setup above must keep working without it.

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
- **Delete** a key from the cache; mounted hooks are notified. `cache.delete` alone doesn't notify them (see the cache-observation spike).
- **Clear all**, behind a confirmation.
- **Edit data**: edit the JSON and apply it with `mutate(key, data, { revalidate: false })`. Invalid JSON is rejected with a clear message.

**Done when:** each action visibly affects the playground UI as expected.

### 6.6 Production safety

- By default, `<SWRDevtools />` renders nothing when `process.env.NODE_ENV === 'production'`, and the import is tree-shaken out.
- Documented opt-in for forcing it on (e.g. staging).

**Done when:** a production build of each playground contains no devtools code.

## 7. Later milestones

**v0.2**

- TanStack Devtools plugin (`packages/tanstack`)
- Observer count per key (via middleware)
- Trigger loading / trigger error states (needs a spike to confirm hooks re-render correctly)
- Light/dark theme following system preference

**v0.3+**

- Mutations tab (`useSWRMutation`)
- Simulate offline
- Vite DevTools adapter
- Open panel in a separate window
- Docs site. The approach is undecided; options are Starlight, Fumadocs, VitePress, or a custom site.

## 8. Tooling (proposed)

- pnpm workspaces, TypeScript (strict)
- Build: tsdown or tsup (ESM + types; `'use client'` banner preserved)
- Tests: Vitest + React Testing Library; Playwright smoke tests against the playgrounds later
- Lint/format: Oxc (`oxlint` for linting, `oxfmt` for formatting)
- Releases: Changesets
- CI: GitHub Actions (lint, typecheck, test, build)

## 9. Open questions

1. ~~**Live updates:** how to observe cache changes.~~ **Resolved (#5):** wrap `set`/`delete` on the existing cache object, with polling as a fallback. See §4 and [docs/spikes/cache-observation.md](spikes/cache-observation.md).
2. ~~**Setup API:** can `<SWRDevtools />` work just by being placed inside `<SWRConfig>`?~~ **Resolved (#6):** yes. See §5, Setup. Whether observer counts justify optional middleware is decided in #21.
3. ~~**Multiple SWR caches:** support in MVP or later?~~ **Resolved (#6):** the MVP inspects the nearest `<SWRConfig>` only. Choosing between caches is #25.
4. **Edit-data UX:** raw JSON textarea for MVP, or a proper inline JSON editor?
