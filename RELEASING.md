# Releasing

Pushing a version tag publishes `swr-devtools-react` to npm. Merging to `main` never does. [`.github/workflows/release.yml`](.github/workflows/release.yml) does the publishing:

```text
tag v0.1.0 pushed
  verify   the tagged commit is on main, and the tag matches packages/react/package.json
  check    pnpm check
  publish  pack, check the tarball with publint and arethetypeswrong, then npm publish --provenance
  docs     deploy the docs site to production, if this version became npm's `latest`
  release  GitHub Release with the version's CHANGELOG.md section as notes
```

There's no `NPM_TOKEN`. The publish job signs in to npm with [trusted publishing](https://docs.npmjs.com/trusted-publishers), using a short-lived OIDC token GitHub issues to that job, and npm attaches a provenance statement to the release.

## Recording changes

Every PR that changes the published package adds a changeset:

```bash
pnpm changeset
```

Pick `swr-devtools-react`, choose the bump (patch, minor or major) and write a line for the changelog. Commit the file it creates in `.changeset/`. Docs, CI and playground changes don't need one.

`packages/core` is private and bundled into `swr-devtools-react`, so a change in core gets a changeset for `swr-devtools-react`.

Changesets only versions and writes the changelog here. It never publishes.

## Cutting a release

1. Branch from `main` and run:

   ```bash
   pnpm changeset version
   ```

   This consumes the pending changesets, bumps `packages/react/package.json` and adds the new section to `packages/react/CHANGELOG.md`. Check both, then open a PR titled `chore: release vX.Y.Z`.

2. Merge it once CI is green.

3. Tag the merge commit on `main` and push the tag:

   ```bash
   git switch main
   git pull
   git tag v0.1.0
   git push origin v0.1.0
   ```

   Or create a Release in the GitHub UI with a new `v0.1.0` tag on `main`. Leave its notes empty: the workflow fills them in from the changelog.

4. Approve the `npm` environment deployment when the workflow asks, if the environment requires a reviewer.

The workflow stops before publishing if the tag points at a commit that isn't on `main` or a `release/*` branch, if the tag and `packages/react/package.json` disagree, or if `packages/react/CHANGELOG.md` has no section for the version. Delete the tag locally and on GitHub, fix the cause, then tag again:

```bash
git tag -d v0.1.0
git push origin :refs/tags/v0.1.0
```

## Prereleases

A version with a prerelease part (`1.0.0-beta.0`, `1.0.0-rc.1`) publishes to the npm `next` dist-tag, so `npm install swr-devtools-react` keeps getting the latest stable version. Its GitHub Release is marked as a prerelease.

```bash
pnpm changeset pre enter beta
pnpm changeset version   # 1.0.0-beta.0
# ...release PR, merge, tag v1.0.0-beta.0
pnpm changeset pre exit  # when the stable release is ready
```

## Hotfixes

Release fixes from `main` when you can: merge the fix, then cut a normal release. Changesets takes the biggest pending bump, so unreleased features ship alongside the fix.

When `main` has work that can't ship yet, fix the released version on a release branch instead. The workflow publishes tags on `release/*` branches as well as `main`.

1. Create the release branch from the version's tag, if it doesn't exist yet. Name it after the release line:

   ```bash
   git switch -c release/0.1.x v0.1.2
   git push -u origin release/0.1.x
   ```

   Branch from `v0.1.2` or later. Earlier tags have a release workflow that only accepts tags on `main`, and a tag runs the workflow from its own commit.

2. Branch from `release/0.1.x`, fix the bug, and run `pnpm changeset` with a patch bump. Open the PR against `release/0.1.x`. CI runs on it as it does for `main`.

3. Cut the release on the release branch, as in [Cutting a release](#cutting-a-release), but with PRs against `release/0.1.x` and the tag on its merge commit.

4. Bring the fix to `main`. `main` only takes squash and rebase merges, so open a PR from a branch off `main` that cherry-picks the fix and release commits:

   ```bash
   git switch -c fix/NN-port-hotfix main
   git cherry-pick <fix commit> <release commit>
   ```

   When resolving conflicts:
   - **`packages/react/package.json`:** keep the higher of the two versions. If `main` is still on the version the hotfix branched from, that's the hotfix version, so the next release bumps from it. If `main` has already released something newer (`0.2.0` against a `0.1.3` hotfix), keep `main`'s version, or the next release would try to publish a version that already exists.
   - **`packages/react/CHANGELOG.md`:** keep both, with the hotfix's section in version order.
   - **`.changeset/`:** leave `main`'s pending changesets alone. The hotfix's own changeset is added by the fix commit and removed by the release commit, so it doesn't carry over.

If the hotfix version is older than npm's current `latest`, for example `0.1.3` after `0.2.0` is out, the workflow publishes it to a `release-0.1` dist-tag instead of `latest`, and doesn't mark its GitHub Release as the latest. Users on `^0.1.0` still get it, and `npm install swr-devtools-react` keeps installing `0.2.0`.

The publish job decides this just before publishing, after any approval, and publish jobs run one at a time across releases. Because npm can briefly report an old `latest` just after a publish, it also counts the repo's `vX.Y.Z` tags: once `v0.2.0` is tagged, a `0.1.x` hotfix never takes `latest`, even if `0.2.0` hasn't published yet. If the npm registry can't be reached, the job stops rather than guessing: re-run it once the registry responds. The GitHub Release job makes the same check separately when it runs, against the same tags, and release jobs also run one at a time. So a delayed or re-run release job never marks an older version as latest.

## Docs site

The docs at [swr-devtools-react.theflyer1983.dev](https://swr-devtools-react.theflyer1983.dev) describe the version npm installs, so production only changes with a release. [`.github/workflows/docs-deploy.yml`](.github/workflows/docs-deploy.yml) deploys `apps/docs` to Vercel with the Vercel CLI:

| When                                    | Deploys to                                                                                                       | From                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------ |
| A release publishes to npm's `latest`   | Production                                                                                                       | The release tag          |
| A merge to `main` that touches the docs | Preview, aliased to [next.swr-devtools-react.theflyer1983.dev](https://next.swr-devtools-react.theflyer1983.dev) | The merge commit         |
| Run by hand (Actions, Deploy docs)      | Production                                                                                                       | A ref, or npm's `latest` |
| A pull request                          | A Vercel preview URL (Vercel login needed)                                                                       | The PR branch            |

Prereleases and hotfixes to older lines don't deploy the docs, so production stays on the newest stable version. The `release` job runs whether or not the docs deploy succeeds.

Vercel's own Git integration still builds pull request previews, but `apps/docs/vercel.json` turns off its deploys from `main`, and skips preview builds when nothing under `apps/docs`, `packages/`, `playgrounds/shared` or the lockfile changed.

**Docs-only fixes between releases.** Merge the fix, then check it on `next.`. To publish it without a package release, run Deploy docs by hand with the merge commit as the ref. Only do this when nothing unreleased has gone into the docs since the last release. Otherwise wait for the release, or cherry-pick the fix onto a `release/*` branch and deploy that.

**Rolling back.** Run Deploy docs by hand with the previous good ref (an earlier tag), or promote an earlier production deployment in the Vercel dashboard.

## One-time setup

Done once per repository. Listed here so it can be checked or redone.

**npm package.** Trusted publishing is set up from the package's settings page, so the package has to exist on npm first. `swr-devtools-react` already does: a `0.0.0` placeholder reserves the name. For a new package name, create it first, for example with `npm stage publish`, which publishes a `0.0.0-stage` placeholder when the package doesn't exist yet. See npm's [staged publishing](https://docs.npmjs.com/staged-publishing) docs.

**npm trusted publisher.** On npmjs.com, open the package's Settings, then Trusted Publisher, and add GitHub Actions with:

| Field             | Value                |
| ----------------- | -------------------- |
| Organization/user | `TheFlyer1983`       |
| Repository        | `swr-devtools-react` |
| Workflow filename | `release.yml`        |
| Environment       | `npm`                |
| Allowed actions   | allow `npm publish`  |

New trusted publishers only allow `npm stage publish` unless you also allow `npm publish`. The workflow runs `npm publish`, so without it the publish job is rejected. Settings can't be edited after saving: delete the entry and add it again to change them.

A new trusted publisher expires if nothing is published through it within 2 days. Add it when the release PR is ready to tag, not before.

Then, under Publishing access, choose "Require two-factor authentication and disallow tokens". Trusted publishing keeps working, and a leaked token can't publish.

**GitHub `npm` environment.** In the repo's Settings, then Environments, create `npm`. Add a deployment tag rule for `v*`, so only version tags can deploy to it. Adding yourself as a required reviewer is optional: it pauses each publish until you approve it.

**Vercel project.** The `swr-devtools-react` project is connected to this repo with Root Directory `apps/docs`, the Astro preset, Node.js 24.x, and the build command `pnpm --filter "@swr-devtools-react/docs..." run build`. Its domains are `swr-devtools-react.theflyer1983.dev` (production) and `next.swr-devtools-react.theflyer1983.dev` (set by the workflow's alias). Deployment Protection stays on for preview URLs; custom domains are public.

**Repository secrets.** `VERCEL_TOKEN` (an access token scoped to the Vercel team), `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (from the project's settings, or `.vercel/project.json` after `vercel link`).

**Cloudflare DNS.** `CNAME swr-devtools-react` and `CNAME next.swr-devtools-react`, both pointing at the target Vercel shows for the domain, with proxy status DNS only (grey cloud). Proxying through Cloudflare interferes with Vercel's certificates.

**Release branch protection.** In the repo's Settings, then Rules, the "Protect release branches" ruleset covers `release/**` with the same rules as `main`: changes go through PRs, the three CI checks must pass, and the branch can't be force-pushed or deleted.

## If a step fails

- **verify or check failed.** Nothing was published. Delete the tag, fix the cause on `main`, tag again.
- **publish failed.** Check the error. A trusted publishing error usually means the npm settings above don't match the workflow file name or environment. Re-run the failed job once fixed.
- **docs failed after publishing.** The package is on npm and the docs still show the previous release. Re-run only the `docs` job, or run Deploy docs by hand with the tag as the ref. A Vercel error usually means an expired `VERCEL_TOKEN` or changed project settings.
- **release failed after publishing.** The package is on npm. Re-run only the `release` job. Don't re-run `publish`: npm rejects a version that already exists. If re-running can't fix it, write the release by hand with the version's changelog section as notes:

  ```bash
  gh release create v0.1.0 --verify-tag --title v0.1.0 --notes-file notes.md
  ```

  Use `gh release edit v0.1.0 --notes-file notes.md` if the release already exists.
