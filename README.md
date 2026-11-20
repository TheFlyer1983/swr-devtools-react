# swr-devtools-react

[![npm](https://img.shields.io/npm/v/swr-devtools-react)](https://www.npmjs.com/package/swr-devtools-react)
[![CI](https://github.com/TheFlyer1983/swr-devtools-react/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/TheFlyer1983/swr-devtools-react/actions/workflows/ci.yml)

In-app devtools for [SWR](https://swr.vercel.app): see every cache key, then revalidate, edit or delete it from a floating panel. Inspired by TanStack Query Devtools.

![The devtools panel docked at the bottom of the Vite playground, with a key selected and its data shown as a JSON tree](docs/images/panel.png)

## Features

- Every key in the SWR cache, with a status badge (loading, validating, success, error, idle) and the time since its data last changed. The list updates live.
- Array and object keys shown readably. `useSWRInfinite` and `useSWRSubscription` keys are labelled.
- Search keys by text, and sort by key, status or last updated.
- A detail view with the full key, any error, and the data as a collapsible JSON tree.
- Revalidate, edit or delete a key, or clear the whole cache.
- Renders inside a Shadow DOM, so your app's CSS can't break it and its CSS can't leak into your app.
- Renders nothing in production builds, and the code is tree-shaken out.

## Install

```bash
npm install --save-dev swr-devtools-react
```

```bash
pnpm add --save-dev swr-devtools-react
```

It needs React 18 or 19 and SWR 2 in your app. It's a dev dependency because production builds drop it. If you [force it on for staging](#forcing-it-on-eg-staging), install it as a regular dependency instead.

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

Drag the panel's edge to resize it, or focus the edge and use the arrow keys. The size is saved in `localStorage` too.

The prop types are exported as `SWRDevtoolsProps`, `ButtonPosition` and `PanelPosition`.

### `<SWRDevtoolsPanel />`

The panel on its own, with no toggle button and no props. It fills the element you render it in, so give that element a size. Use it to put the devtools in your own layout, such as a sidebar or a tab in another devtools tool.

```tsx
import { SWRDevtoolsPanel } from 'swr-devtools-react';

<SWRConfig value={{ fetcher }}>
  <App />
  <div style={{ height: 400 }}>
    <SWRDevtoolsPanel />
  </div>
</SWRConfig>;
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

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SWRConfig value={{ fetcher }}>
      <Component {...pageProps} />
      <SWRDevtools />
    </SWRConfig>
  );
}
```

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

## Known limits

- **Deleting a key** removes it from the cache and tells mounted hooks. A hook using `keepPreviousData` keeps showing its last data until it next fetches, because SWR keeps that copy inside the hook.
- **Clear all** on SWR 2.5 or later uses SWR's `unload()`, which also cancels in-flight requests and drops `keepPreviousData` copies. On older SWR it deletes keys one by one, with the same limit as above.
- **Several caches.** Only the nearest `<SWRConfig>`'s cache is shown. Choosing between caches is tracked in [#25](https://github.com/TheFlyer1983/swr-devtools-react/issues/25).

## Roadmap

Next up are a TanStack Devtools plugin, observer counts per key, and a light theme that follows the system setting. The [spec](docs/SPEC.md) lists what's planned, and the [project board](https://github.com/users/TheFlyer1983/projects/7) shows what's in progress.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, the playgrounds and how PRs work.

## Licence

[MIT](LICENSE)
