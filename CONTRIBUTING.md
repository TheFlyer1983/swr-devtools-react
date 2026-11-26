# Contributing

Thanks for helping out. This file covers setting up the repo, running the playgrounds and getting a PR merged.

The [spec](docs/SPEC.md) decides what's in scope and records the decisions made so far. Read it before starting on a feature. If you want to change something it settles, open an issue first.

## Local setup

You need:

- Node 24 (24.11 or later) or Node 26+. Node 25 isn't supported. `.node-version` and `.nvmrc` pin 24, for `fnm`, `nvm` and similar version managers. `pnpm install` fails on other versions.
- Corepack, which provides the pnpm version pinned in `package.json`. Run `corepack enable` once.

Then:

```bash
pnpm install
pnpm check
```

`pnpm check` runs lint, the format check, typecheck, tests and the build. If it passes locally, CI's quality and test jobs should too.

## Repo layout

```text
packages/
  core/         Framework-agnostic cache reading, observing and actions. Private, bundled into react.
  react/        The published `swr-devtools-react` package.
playgrounds/
  shared/       The demo app and its scenarios, used by both playgrounds.
  vite/         Vite + React playground.
  next/         Next.js playground, with App Router and Pages Router pages.
apps/
  docs/         The docs site, built with Starlight.
scripts/        Repo scripts, such as the production bundle check.
docs/           The spec and spike write-ups.
```

## Scripts

| Script                         | What it does                                                         |
| ------------------------------ | -------------------------------------------------------------------- |
| `pnpm dev`                     | Vite playground at http://localhost:5173                             |
| `pnpm dev:next`                | Next.js playground at http://localhost:3100 (run `pnpm build` first) |
| `pnpm dev:docs`                | Docs site at http://localhost:4321 (run `pnpm build` first)          |
| `pnpm build:docs`              | Builds the docs site to `apps/docs/dist` (run `pnpm build` first)    |
| `pnpm lint`                    | oxlint                                                               |
| `pnpm format` / `format:check` | oxfmt                                                                |
| `pnpm typecheck`               | `tsc --noEmit` in every package                                      |
| `pnpm test` / `test:watch`     | Vitest                                                               |
| `pnpm build`                   | Builds the published packages with tsdown                            |
| `pnpm check`                   | Lint, format check, typecheck, test and build                        |
| `pnpm check:prod`              | Fails if production playground builds contain the devtools' labels   |
| `pnpm check:package`           | Packs the built package and checks it with publint and attw          |
| `pnpm changeset`               | Records a change for the next release's changelog                    |

## Running the playgrounds

Both playgrounds run the same demo app from `playgrounds/shared`. Each scenario exercises part of SWR the panel has to handle: a slow request, an error, a ticker that refreshes, a search with changing keys, infinite loading and so on. A mock API inside each playground serves the data, so there's no backend to run.

The mock API's routes are in `playgrounds/shared/src/mock-routes.ts`. They serve users, posts, comments and todos shaped like [JSONPlaceholder](https://jsonplaceholder.typicode.com)'s, plus `/api/error` (always a 500) and `/api/slow` (2 seconds). The data is in `playgrounds/shared/src/fixtures`. It's hand-written or generated with a fixed seed, so it's identical on every run and screenshots stay stable. User 1 (`/api/users/1`) is a large, deeply nested object for trying the JSON tree and the edit view.

### Vite

```bash
pnpm dev
```

The Vite playground imports the package's source, not its build, so edits in `packages/react` and `packages/core` hot-reload. Use it for day-to-day work.

### Next.js

```bash
pnpm build
pnpm dev:next
```

The Next.js playground uses the built `dist`, the same files that get published. That catches problems the source alias hides, like a missing `'use client'` banner. Run `pnpm build` again after changing a package.

It has two pages. `/` uses the App Router and renders `<SWRDevtools />` from a server component layout. `/pages-router` uses the Pages Router, which renders on the server and then hydrates. Check both when you change how the panel mounts.

### Production builds

`pnpm check:prod` builds both playgrounds for production and fails if either bundle contains the panel's labels ("Open SWR Devtools", "Resize SWR Devtools"), which only the devtools code has. CI runs the same check. Run it locally if you touch `packages/react/src/index.ts`, `production.ts` or the build config.

## Running the docs site

```bash
pnpm build
pnpm dev:docs
```

The docs site in `apps/docs` uses [Starlight](https://starlight.astro.build). Pages are MDX files in `src/content/docs`, and the sidebar is set in `astro.config.ts`.

Like the Next.js playground, it uses the package's built `dist`, so run `pnpm build` again after changing a package. Demos import from `swr-devtools-react/production`, because the site is a production build and the main entry renders nothing there. Demos render on the client only (`client:only="react"`), and their modules are still imported during the build, so keep browser-only code such as `window` inside components rather than at module level.

The site has no server, so demos get their data from the playgrounds' mock API (`playgrounds/shared/src/mock-routes.ts`), answered in the browser by `apps/docs/src/components/demo/mock-fetch.ts`.

`pnpm check` typechecks the docs but doesn't build them. CI builds them on every PR, and Vercel posts a preview deployment for PRs that change them (a Vercel login is needed to view it). Merges to `main` update [next.swr-devtools-react.theflyer1983.dev](https://next.swr-devtools-react.theflyer1983.dev). Production only changes with a release: see [RELEASING.md](RELEASING.md#docs-site).

## Making a change

1. **Find or open an issue.** Every PR closes one. If you're unsure whether something fits, ask in the issue before writing code.
2. **Branch from `main`.** Name it after the issue: `feat/16-edit-data`, `fix/52-resize-jump`, `docs/18-readme`.
3. **Write tests.** Vitest tests sit next to the code they test, as `*.test.ts` or `*.test.tsx`. Add or update tests for what you change.
4. **Add a changeset** if the change affects the published package: run `pnpm changeset` and commit the file it creates. [RELEASING.md](RELEASING.md) explains how releases work.
5. **Run `pnpm check`** before pushing.
6. **Open a PR** against `main`. Put `Closes #N` in the description, and say what changed and how you checked it. For UI changes, include a screenshot.

### PR titles

PRs are squash merged, so the PR title becomes the commit message on `main`. Use [Conventional Commits](https://www.conventionalcommits.org) with the package as the scope and the issue number at the end:

```text
feat(react): edit cached data (#16)
fix(core): keep the key order stable after a delete (#52)
docs: README and usage docs (#18)
```

### Review

- CI runs three jobs: lint, format and typecheck; then test and build on Node 24 and Node 26, including the production bundle check and the docs build. All three must pass before merging.
- CodeRabbit reviews every PR. Its comments are suggestions. Reply to each one, either with a fix or a reason for leaving it.
- A maintainer reviews and merges.

## Code style

oxfmt formats the code and oxlint lints it. Run `pnpm format` to fix formatting. Comments explain why the code does something when that isn't obvious; there's no need to put a doc comment on every function.
