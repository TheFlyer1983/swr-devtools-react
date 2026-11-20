# swr-devtools-react

[![CI](https://github.com/TheFlyer1983/swr-devtools-react/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/TheFlyer1983/swr-devtools-react/actions/workflows/ci.yml)

In-app devtools for [SWR](https://swr.vercel.app): see every cache key, then revalidate, edit or delete it from a floating panel, the way TanStack Query Devtools works.

> **Work in progress.** Nothing is published yet. See the [spec](docs/SPEC.md) and the [project board](https://github.com/users/TheFlyer1983/projects/7) for what's planned.

## Production builds

`<SWRDevtools />` and `<SWRDevtoolsPanel />` render nothing when `process.env.NODE_ENV` is `production`. Your bundler (Vite, Next.js, webpack) replaces that check at build time, so a production build contains no devtools code. You don't need to wrap them in your own check.

### Forcing it on (e.g. staging)

Staging builds usually have `NODE_ENV=production` too. To keep the devtools there, import from `swr-devtools-react/production`, which skips the check. Load it lazily behind your own flag so it stays out of the real production bundle:

```tsx
import { lazy, Suspense } from 'react';
import { SWRDevtools } from 'swr-devtools-react';

const SWRDevtoolsProduction = lazy(() =>
  import('swr-devtools-react/production').then((module) => ({ default: module.SWRDevtools }))
);

// Your own flag, e.g. a build-time env var (`import.meta.env` in Vite) or a
// query param read at runtime.
const forceDevtools = import.meta.env.VITE_ENABLE_SWR_DEVTOOLS === 'true';

export function Devtools() {
  if (!forceDevtools) return <SWRDevtools />;
  return (
    <Suspense fallback={null}>
      <SWRDevtoolsProduction />
    </Suspense>
  );
}
```

Render `<Devtools />` inside your `<SWRConfig>`, where `<SWRDevtools />` would go. A static `import ... from 'swr-devtools-react/production'` works too, but then the devtools ship in every build that includes it.

## Development

Requires Node 24 (24.11 or later) or Node 26+. Node 25 isn't supported. `.node-version` pins 24. You also need Corepack (`corepack enable`), which provides the pinned pnpm version.

```bash
pnpm install
pnpm check   # lint, format check, typecheck, test, build
```

| Script                         | What it does                                                         |
| ------------------------------ | -------------------------------------------------------------------- |
| `pnpm dev`                     | Vite playground at http://localhost:5173                             |
| `pnpm dev:next`                | Next.js playground at http://localhost:3100 (run `pnpm build` first) |
| `pnpm lint`                    | oxlint                                                               |
| `pnpm format` / `format:check` | oxfmt                                                                |
| `pnpm typecheck`               | `tsc --noEmit` in every package                                      |
| `pnpm test` / `test:watch`     | Vitest                                                               |
| `pnpm build`                   | Builds the published packages with tsdown                            |
| `pnpm check:prod`              | Builds everything for production and checks no devtools code ships   |

## Licence

[MIT](LICENSE)
