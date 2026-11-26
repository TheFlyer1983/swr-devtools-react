# swr-devtools-react

The source of the [`swr-devtools-react`](https://www.npmjs.com/package/swr-devtools-react) package: in-app devtools for [SWR](https://swr.vercel.app) that let you see, revalidate, edit and delete every cache key from a floating panel.

## Install

```bash
npm install --save-dev swr-devtools-react
```

```bash
pnpm add --save-dev swr-devtools-react
```

It needs React 18 or 19 and SWR 2 in your app. Install it as a regular dependency instead if you force it on for staging, or if a Next.js app using the Pages Router runs its server with only production dependencies installed. [Production and staging](https://swr-devtools-react.theflyer1983.dev/production/) explains both.

## Setup

Add `<SWRDevtools />` inside your `<SWRConfig>`:

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

A button labelled "SWR" appears in the corner. Click it to open the panel. It renders nothing in production builds.

## Docs

Next.js setup, props, staging builds and known limits are on the [docs site](https://swr-devtools-react.theflyer1983.dev) and in the [repository README](https://github.com/TheFlyer1983/swr-devtools-react#readme). The published package ships that README in place of this file.

Release notes are in [CHANGELOG.md](CHANGELOG.md).
