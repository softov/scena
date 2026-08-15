# CLAUDE.md

Scena is a graph-mounted reactive UI runtime. A page is data — a graph of
component nodes in a layered reactive store — and the runtime resolves,
mounts and re-renders it. It is not a component library with a store attached.

Read [`README.md`](README.md) first, then [`docs/`](docs/README.md): the
architecture, the vocabulary, and the rules a consumer has to follow.

## The documents

| Document | For |
| --- | --- |
| [`README.md`](README.md) | What it is, the packages, releasing |
| [`docs/architecture.md`](docs/architecture.md) | **The model.** Store, graph, registries, surfaces, shells — what each one owns |
| [`docs/consuming.md`](docs/consuming.md) | Building an app on it: boot order, registration, data providers, the mistakes that cost days |
| [`docs/ui.md`](docs/ui.md) | The component catalog, the theme tokens, and what to reach for |

## Commands

```bash
pnpm dev          # playground on http://localhost:5174
pnpm typecheck    # every workspace
pnpm test         # the runtime's suite
pnpm lint
pnpm build        # emits packages/scena/dist
```

Per-package: `pnpm --filter @softov/scena <script>`. The package manager is
pinned (`pnpm@10.28.0`) — pnpm, not npm or yarn. Node ≥ 22.

## Layout

```
packages/scena/         the runtime and its contracts — published to npm
  src/types/            the contracts. Nothing here imports a runtime value
  src/core/             the store, the registries, the graph, the resolvers
  src/runtime/          mounting and rendering the graph
  src/react/            the React bindings — Scena, ViewMount, SurfaceArea, hooks
  src/ui/               the component catalog, by category
  src/porta/            sign-in: the wall (Limen), the session (Sigillum), providers
  src/controls/         controls with their own storage
  src/converters/       value converters
  src/i18n/             translation
  src/styles/           tokens and themes
packages/playground/    local dev app and showcase. Private, never published
docs/                   the documents above, plus layout prototypes
```

## Conventions

- **`types/` is the contract, and it is source-first.** Every shape lives in
  `src/types/` and nothing there imports a runtime value. A consumer that has
  to reach into `core/` for a type is a contract with a hole in it — fix the
  type, then the runtime.
- **Registries are late-binding.** Components, commands, converters, layouts
  and shells are resolved by name at mount time, never imported by the graph.
  That is what lets a page be data, and it is why a missing registration is a
  runtime miss rather than a compile error.
- **The store is the only state.** Paths are JSON-Pointer-shaped and scoped:
  `$/<scope>/...` is absolute, `/...` is relative to the surrounding data
  context, `..` is forbidden. A component that keeps a copy of store state in
  React state has created a second answer to one question.
- **Additive within 0.x.** The surface is still moving, but a rename is a
  break for every consumer — prefer adding the new shape and deprecating the
  old over editing one in place.
- **CSS ships beside the component.** `sideEffects` covers `**/*.css`, so a
  component's stylesheet is imported by the component, not by the consumer.

## The published package is private

`@softov/scena` goes to **GitHub Packages**, and GitHub Packages inherits the
repository's visibility. A consumer needs `.npmrc` pointing the `@softov`
scope at `https://npm.pkg.github.com` with a token carrying `read:packages`.
Releases are tag-driven — bump `packages/scena/package.json`, tag `v<version>`,
push the tag.

## Where it came from

Scena was extracted from **doop** (`/github/doop`), where it grew as the
next-generation frontend of an agent runtime, and it still carries that
lineage: the chat picker, the activity bar and the surface model are shaped by
what an agent console needs. `doop`'s `packages/web-next/` is the other
consumer, and `opendoop` in a comment means doop.

The first outside consumer is **Advisor** (`/brb_main/src/service_advisor`),
whose `packages/web-next/` is a full application built on this runtime. When a
contract here is unclear, that codebase is the worked example.
