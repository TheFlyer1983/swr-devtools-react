# Releasing

Pushing a version tag publishes `swr-devtools-react` to npm. Merging to `main` never does. [`.github/workflows/release.yml`](.github/workflows/release.yml) does the publishing:

```text
tag v0.1.0 pushed
  verify   the tagged commit is on main, and the tag matches packages/react/package.json
  check    pnpm check
  publish  pack, check the tarball with publint and arethetypeswrong, then npm publish --provenance
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

The workflow stops before publishing if the tag points at a commit that isn't on `main`, if the tag and `packages/react/package.json` disagree, or if `packages/react/CHANGELOG.md` has no section for the version. Delete the tag locally and on GitHub, fix the cause, then tag again:

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

## If a step fails

- **verify or check failed.** Nothing was published. Delete the tag, fix the cause on `main`, tag again.
- **publish failed.** Check the error. A trusted publishing error usually means the npm settings above don't match the workflow file name or environment. Re-run the failed job once fixed.
- **release failed after publishing.** The package is on npm. Re-run only the `release` job. Don't re-run `publish`: npm rejects a version that already exists. If re-running can't fix it, write the release by hand with the version's changelog section as notes:

  ```bash
  gh release create v0.1.0 --verify-tag --title v0.1.0 --notes-file notes.md
  ```

  Use `gh release edit v0.1.0 --notes-file notes.md` if the release already exists.
