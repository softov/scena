# Developing scena

This document is for people who work on scena itself.
To build an application on scena, read [`docs/consuming.md`](docs/consuming.md) instead.

## What you need

- Node 22 or later.
- pnpm 10.28.0. The version is pinned in `package.json`. Use pnpm, not npm or yarn.
- Git.

## Set up

```bash
git clone https://github.com/softov/scena.git
cd scena
pnpm install
```

## Commands

Run these from the repository root.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the playground on http://localhost:5174. Sign in with `demo@scena.dev` / `demo`. |
| `pnpm demo` | Builds scena, then starts the demo app on http://localhost:5175. |
| `pnpm typecheck` | Type-checks every workspace. |
| `pnpm test` | Runs the runtime's test suite. |
| `pnpm lint` | Runs ESLint. `pnpm lint:fix` fixes what it can. |
| `pnpm build` | Builds `packages/scena/dist`. |
| `pnpm build:apps` | Builds scena, the playground and the demo. |

To run one package's script: `pnpm --filter @softov/scena <script>`.

## The two apps

The **playground** (`packages/playground`) reads `packages/scena/src` through Vite aliases.
An edit in the library shows at once, with no build.
Use it to work on a component or a layout.

The **demo** (`packages/demo`) uses the published exports, as a real consumer does.
It finds what the playground hides: an export that points at a file the build did not emit, or a stylesheet that is not in the package.
Run it before a release.

## Repository layout

```
packages/scena/         the runtime and its contracts, published to npm
  src/sdk/              the contracts, and the pure functions over them
  src/core/             the runtime that implements the sdk
  src/runtime/          behaviour wired onto a live scena
  src/react/            the React bindings
  src/ui/               the component catalog, by category
  src/porta/            sign-in
  src/styles/           tokens and stylesheets
  src/themes/           the built-in themes
  test/                 the test suite
packages/playground/    the dev app and showcase (private)
packages/demo/          the reference app on the published exports (private)
docs/                   the documentation, the screenshots, and layout prototypes
scripts/publish.mjs     cuts a release
```

[`AGENTS.md`](AGENTS.md) explains the rules for each layer.

## Try a change in an app before a release

A change in scena often shows its problems only in a real app.
Test it there before you release.

The app must resolve `@softov/scena` from your checkout's source, not from `node_modules`.
Map each entry point to its file in `packages/scena/src`, as the playground does in [`packages/playground/vite.config.ts`](packages/playground/vite.config.ts).
Also tell Vite to keep one copy of React: `resolve.dedupe: ['react', 'react-dom']`.

[ahpw](https://github.com/softov/ahpw) has this built in.
Set `AHPW_SCENA` to a scena checkout:

```bash
cd ../ahpw
AHPW_SCENA=../scena pnpm dev     # the dev server on your scena source
AHPW_SCENA=../scena pnpm build   # a build on your scena source
AHPW_SCENA=../scena pnpm test    # ahpw's tests on your scena source
```

Run `pnpm install` in the scena checkout first.
The source imports scena's own dependencies from there.

## Continuous integration

`.github/workflows/ci.yml` runs on each push to `main` and on each pull request.
It runs `typecheck`, `lint`, `test` and `build`.
Then it runs `npm pack --dry-run` in `packages/scena`.
That step finds an export that points at a file the build did not emit.

## Releases

A release publishes `@softov/scena` to two registries:

1. **npmjs.org.** This is the registry that consumers use. It needs no configuration.
2. **GitHub Packages.** A copy. Every read from it needs a token, also for a public package.

You cannot overwrite a version in either registry.
Do every check before you push the tag.

### Cut a release

`scripts/publish.mjs` does the work before the tag.
It runs the same checks as the release workflow, so a release that would fail in CI fails on your machine first.
Your working tree must be clean, and your branch must not be behind `origin`.

```bash
pnpm release:check patch     # a dry run: checks and the next version, no changes
pnpm release patch           # 0.5.1 -> 0.5.2: checks, bump, commit, tag
pnpm release minor           # 0.5.1 -> 0.6.0
pnpm release 1.0.0-rc.1      # an exact version
pnpm release patch --push    # also push the commit and the tag
```

Without `--push`, look at the commit and the tag, then push both:

```bash
git push origin main
git push origin v0.5.2
```

The script does not publish.
The tag starts the publish in CI.

### What the release workflow does

`.github/workflows/release.yml` runs on each `v*` tag:

1. It checks that the tag matches the version in `packages/scena/package.json`. If they differ, it stops.
2. It runs `typecheck`, `lint`, `test` and `build`.
3. It publishes to npmjs.org with trusted publishing (OIDC). There is no npm token to keep or rotate.
4. It publishes to GitHub Packages with the workflow's own `GITHUB_TOKEN`.

npm trusts this repository and the workflow file name `release.yml`.
If you rename the file, update the package's Trusted Publisher settings on npmjs.org, or the publish fails.

### After a release

- Check the version on https://www.npmjs.com/package/@softov/scena.
- Move each consumer to the new version, and remove the workarounds that the release makes unnecessary.

### Read from GitHub Packages

Only if you need the GitHub Packages copy: point the `@softov` scope at it, with a token that has `read:packages`.

```
@softov:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```
