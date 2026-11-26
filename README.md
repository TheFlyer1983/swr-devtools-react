# swr-devtools-react

[![npm](https://img.shields.io/npm/v/swr-devtools-react)](https://www.npmjs.com/package/swr-devtools-react)
[![CI](https://github.com/TheFlyer1983/swr-devtools-react/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/TheFlyer1983/swr-devtools-react/actions/workflows/ci.yml)

In-app devtools for [SWR](https://swr.vercel.app): see every cache key, then revalidate, edit or delete it from a floating panel. Inspired by TanStack Query Devtools.

The full docs, with a live demo, are at [swr-devtools-react.theflyer1983.dev](https://swr-devtools-react.theflyer1983.dev).

![The devtools panel docked at the bottom of the Vite playground, with a key selected and its data shown as a JSON tree](https://raw.githubusercontent.com/TheFlyer1983/swr-devtools-react/main/docs/images/panel.png)

## Features

- Every key in the SWR cache, with a status badge (loading, validating, success, error, idle), how many mounted hooks use it, and the time since it was last updated. Keys no hook uses any more are marked Unused. The list updates live.
- Array and object keys shown readably. `useSWRInfinite` and `useSWRSubscription` keys are labelled.
- Search keys by text, and sort by key, status or last updated.
- A detail view with the full key, any error, and the data as a collapsible JSON tree.
- Revalidate, edit or delete a key, or clear the whole cache.
- Renders inside a Shadow DOM, so your app's CSS can't break it and its CSS can't leak into your app.
- Light and dark themes. It follows the system setting until you pick one in the panel.
- Renders nothing in production builds, and its code is left out of the browser bundle.

## Install

```bash
npm install --save-dev swr-devtools-react
```

```bash
pnpm add --save-dev swr-devtools-react
```

It needs React 18 or 19 and SWR 2 in your app. It's a dev dependency because production builds drop it. Install it as a regular dependency instead if you [force it on for staging](#forcing-it-on-eg-staging), or if a Next.js app using the Pages Router runs its server with only production dependencies installed. [Dev dependency or regular dependency](#dev-dependency-or-regular-dependency) explains both.

## Setup

Add `<SWRDevtools />` inside your `<SWRConfig>`. There's no provider or middleware to add.

```tsx
import { SWRConfig } from 'swr';
import { SWRDevtools } from 'swr-devtools-react';

export function Root() {
  return (
    <SWRConfig value={{ fetcher }}>
      <App />
      <SWRDevtools />
    </SWRConfig>
  );
}
```

A button labelled "SWR" appears in the corner. Click it to open the panel.

The panel shows the cache of the nearest `<SWRConfig>`. If your app has no `<SWRConfig>`, it shows SWR's default global cache, and `<SWRDevtools />` can go anywhere in the tree. With several `<SWRConfig provider>`s, it sees only the nearest one.

## Props

### `<SWRDevtools />`

| Prop             | Type                                                                 | Default          | Description                                                                                                                          |
| ---------------- | -------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `initialIsOpen`  | `boolean`                                                            | `false`          | Start with the panel open. Once the user opens or closes the panel, their choice is saved in `localStorage` and wins over this prop. |
| `buttonPosition` | `'top-left'` \| `'top-right'` \| `'bottom-left'` \| `'bottom-right'` | `'bottom-right'` | Which corner of the viewport the toggle button sits in.                                                                              |
| `position`       | `'bottom'` \| `'right'`                                              | `'bottom'`       | Where the panel docks.                                                                                                               |
| `theme`          | `'system'` \| `'light'` \| `'dark'`                                  | none             | Sets the theme from your app and hides the panel's theme picker. See [Theme](#theme).                                                |

Drag the panel's edge to resize it, or focus the edge and use the arrow keys. The size is saved in `localStorage` too.

The prop types are exported as `SWRDevtoolsProps`, `ButtonPosition`, `PanelPosition` and `Theme`.

### `<SWRDevtoolsPanel />`

The panel on its own, with no toggle button. Its only prop is `theme`, as above. It fills the element you render it in, so give that element a size. Use it to put the devtools in your own layout, such as a sidebar or a tab in another devtools tool.

```tsx
import { SWRDevtoolsPanel } from 'swr-devtools-react';

<SWRConfig value={{ fetcher }}>
  <App />
  <div style={{ height: 400 }}>
    <SWRDevtoolsPanel />
  </div>
</SWRConfig>;
```

### Theme

The panel follows your OS or browser's light or dark setting. A picker in its header switches between System, Light and Dark, and the choice is saved in `localStorage`.

If your app or devtools host already has a theme setting, pass `theme` to use it instead. The panel then hides its picker, so the two settings can't disagree:

```tsx
<SWRDevtoolsPanel theme={isDark ? 'dark' : 'light'} />
```

## Next.js

Both routers work. The package starts with `'use client'`, so you don't need to wrap it in a client component yourself.

### App Router

Render `<SWRDevtools />` in your root layout, inside the client component that holds your `<SWRConfig>`:

```tsx
// app/providers.tsx
'use client';

import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Providers({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ fetcher }}>{children}</SWRConfig>;
}
```

```tsx
// app/layout.tsx (a server component)
import type { ReactNode } from 'react';
import { SWRDevtools } from 'swr-devtools-react';
import { Providers } from './providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <SWRDevtools />
        </Providers>
      </body>
    </html>
  );
}
```

`<SWRConfig>` with a fetcher has to live in a client component, because a server component can't pass a function as a prop. `<SWRDevtools />` can sit in the server layout as long as it's inside `<Providers>`.

### Pages Router

Put it in `pages/_app.tsx`, so every page gets it:

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app';
import { SWRConfig } from 'swr';
import { SWRDevtools } from 'swr-devtools-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SWRConfig value={{ fetcher }}>
      <Component {...pageProps} />
      <SWRDevtools />
    </SWRConfig>
  );
}
```

The Pages Router loads `swr-devtools-react` from `node_modules` when it renders a page on the server. If your server installs only production dependencies, for example with `npm ci --omit=dev` in a Docker image, those pages fail with a 500. See [Dev dependency or regular dependency](#dev-dependency-or-regular-dependency). The App Router isn't affected.

The devtools render only in the browser, after hydration, so they don't cause hydration mismatches.

## Production builds

`<SWRDevtools />` and `<SWRDevtoolsPanel />` render nothing when `process.env.NODE_ENV` is `production`. Your bundler (Vite, Next.js, webpack) replaces that check at build time, so a production build contains no devtools code. You don't need to wrap them in your own check.

### Forcing it on (e.g. staging)

Staging builds usually have `NODE_ENV=production` too. To keep the devtools there, import from `swr-devtools-react/production`, which skips the check. Gate the import behind your own build-time flag, so it stays out of the real production bundle:

```tsx
import { lazy, Suspense } from 'react';
import { SWRDevtools } from 'swr-devtools-react';

// The flag must be replaced at build time (here, Vite's `import.meta.env`), and
// the `import()` must sit inside the check. Then a build with the flag off
// drops the devtools.
const SWRDevtoolsProduction =
  import.meta.env.VITE_ENABLE_SWR_DEVTOOLS === 'true'
    ? lazy(() =>
        import('swr-devtools-react/production').then((module) => ({
          default: module.SWRDevtools
        }))
      )
    : null;

export function Devtools() {
  if (!SWRDevtoolsProduction) return <SWRDevtools />;
  return (
    <Suspense fallback={null}>
      <SWRDevtoolsProduction />
    </Suspense>
  );
}
```

Render `<Devtools />` inside your `<SWRConfig>`, where `<SWRDevtools />` would go. In Next.js, use a `NEXT_PUBLIC_` variable through `process.env` instead of `import.meta.env`.

Two things keep the devtools in the bundle:

- **A runtime flag**, such as a query param. It only controls whether the devtools load. The bundler can't know its value, so the devtools stay in the build.
- **A `lazy()` call outside the check.** Bundlers keep it even when the flag is off. In a Vite build this put the whole panel in the main bundle.

A static `import ... from 'swr-devtools-react/production'` also ships the devtools in every build that includes it.

### Dev dependency or regular dependency

A dev dependency is right for most apps, and always right for apps with no server of their own, such as a Vite app served as static files. Install it as a regular dependency instead in two cases.

**You force it on for staging.** The staging build needs the package, so it has to be installed wherever that build runs.

**A Next.js app on the Pages Router runs its server with only production dependencies.** This is common in Docker images, which often run `npm ci --omit=dev` before `next start`. The Pages Router doesn't bundle packages into its server build. It loads them from `node_modules` when it renders a page, so any page that imports `swr-devtools-react`, or every page if it's in `pages/_app.tsx`, fails with a 500 (`Cannot find package 'swr-devtools-react'`, or `Failed to load external module swr-devtools-react-<hash>` with Turbopack). Pages Next.js prerendered at build time still load until they're rendered again.

To keep it a dev dependency, tell Next.js to bundle it into the server build:

```ts
// next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['swr-devtools-react']
};

export default config;
```

`bundlePagesRouterDependencies: true` does the same for every package. The App Router isn't affected: it bundles the packages that server and client components import.

Either way, the browser gets the same production bundle. Installing the package as a regular dependency doesn't put any devtools code in it.

## Known limits

- **Deleting a key** removes it from the cache and tells mounted hooks. A hook using `keepPreviousData` keeps showing its last data until it next fetches, because SWR keeps that copy inside the hook.
- **Clear all** on SWR 2.5 or later uses SWR's `unload()`, which also cancels in-flight requests and drops `keepPreviousData` copies. On older SWR it deletes keys one by one, with the same limit as above.
- **Several caches.** Only the nearest `<SWRConfig>`'s cache is shown. Choosing between caches is tracked in [#25](https://github.com/TheFlyer1983/swr-devtools-react/issues/25).
- **Revalidate needs a mounted hook with a fetcher.** `mutate(key)` refetches through a hook using the key, so Revalidate is disabled for keys no mounted hook uses, such as `useSWRInfinite`'s page keys. It's also disabled for Subscription keys, because `useSWRSubscription` hooks have no fetcher.
- **Hook counts read SWR internals.** SWR has no public way to count the hooks using a key, so the panel reads SWR's internal list of them. If a future SWR release changes that list, the panel stops showing counts rather than showing wrong ones. Unmounting a hook doesn't write to the cache, so the panel checks for unmounts every 500 ms.
- **Polling mode.** If the cache object can't be changed, for example because it's frozen, the panel checks it every 250 ms instead of seeing each write. The header shows `(poll)` instead of `(patch)`. States that last less than a check, such as a very fast request, can be missed.
- **Data that isn't JSON** can't be edited if it has circular references or BigInts. Dates, Maps and similar values can be edited, but applying the edit saves them as plain JSON.

## Roadmap

Next up is a TanStack Devtools plugin. The [spec](https://github.com/TheFlyer1983/swr-devtools-react/blob/main/docs/SPEC.md) lists what's planned, and the [project board](https://github.com/users/TheFlyer1983/projects/7) shows what's in progress.

## Contributing

See [CONTRIBUTING.md](https://github.com/TheFlyer1983/swr-devtools-react/blob/main/CONTRIBUTING.md) for local setup, the playgrounds and how PRs work.

## Licence

[MIT](https://github.com/TheFlyer1983/swr-devtools-react/blob/main/LICENSE)
