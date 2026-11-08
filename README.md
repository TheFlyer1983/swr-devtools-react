# swr-devtools-react

In-app devtools for [SWR](https://swr.vercel.app): see every cache key, then revalidate, edit or delete it from a floating panel, the way TanStack Query Devtools works.

> **Work in progress.** Nothing is published yet. See the [spec](docs/SPEC.md) and the [project board](https://github.com/users/TheFlyer1983/projects/7) for what's planned.

## Development

Requires Node 22.18+ and Corepack (`corepack enable`), which provides the pinned pnpm version.

```bash
pnpm install
pnpm check   # lint, format check, typecheck, test, build
```

| Script                         | What it does                              |
| ------------------------------ | ----------------------------------------- |
| `pnpm lint`                    | oxlint                                    |
| `pnpm format` / `format:check` | oxfmt                                     |
| `pnpm typecheck`               | `tsc --noEmit` in every package           |
| `pnpm test` / `test:watch`     | Vitest                                    |
| `pnpm build`                   | Builds the published packages with tsdown |

## Licence

[MIT](LICENSE)
