# AGENTS.md

Rules and context for anyone who changes scena: people and coding agents.

Scena is a graph-mounted reactive UI runtime.
A page is data: a graph of component nodes in a layered reactive store.
The runtime resolves the graph, mounts it, and renders it again when the data changes.
Scena is not a component library with a store attached.

Read [`README.md`](README.md) first.
Then read [`docs/`](docs/README.md): the architecture, the words, and the rules for a consumer.
[`DEVELOPER.md`](DEVELOPER.md) has the setup, the checks and the release steps.

## The documents

| Document | For |
| --- | --- |
| [`README.md`](README.md) | What scena is, the packages, the projects built on it |
| [`DEVELOPER.md`](DEVELOPER.md) | Setup, commands, testing in an app, releases |
| [`docs/architecture.md`](docs/architecture.md) | **The model.** Store, graph, registries, surfaces, shells, and what each one owns |
| [`docs/consuming.md`](docs/consuming.md) | How to build an app on scena: boot order, registration, data providers, the mistakes that cost days |
| [`docs/ui.md`](docs/ui.md) | The component catalog, the theme tokens, and what to use when |

## Commands

```bash
pnpm dev          # the playground on http://localhost:5174
pnpm demo         # builds scena, then the demo app on http://localhost:5175
pnpm typecheck    # every workspace
pnpm test         # the runtime's suite
pnpm lint
pnpm build        # builds packages/scena/dist
```

For one package: `pnpm --filter @softov/scena <script>`.
The package manager is pinned (`pnpm@10.28.0`). Use pnpm, not npm or yarn.
Node 22 or later.

## Layout

```
packages/scena/         the runtime and its contracts, published to npm
  src/index.ts          the root export: core and runtime, assembled
  src/sdk/              the contracts, and the pure functions over them
  src/core/             the runtime that implements the sdk
    store/              the reactive store, the computed DSL, scope backends
    graph/              the component graph, mount surfaces, presentation
    resolve/            path, binding, dynamic and permission resolution
    registry/           the component and converter registries
    controls/           commands, keybindings, layout, session, shell, manifest
    i18n/               the translation registry and the `$/t` backend
    converters/         value converters
    scena.ts            the composition root
  src/runtime/          behaviour wired onto a live scena: bridge, sockets,
                        the layout and opener command sets
  src/react/            the React bindings: Scena, ViewMount, SurfaceArea, hooks
  src/ui/               the component catalog, by category
  src/porta/            sign-in: the wall (Limen), the session (Sigillum), providers
  src/styles/           tokens and stylesheets
  src/themes/           the built-in themes
packages/playground/    the dev app and showcase. Aliases to scena/src. Private
packages/demo/          the reference app. It uses the PUBLISHED exports, with no
                        src aliases, so it finds export-map and packaging errors
                        that the playground hides. Private
docs/                   the documents, the screenshots, and layout prototypes
```

## Conventions

- **`sdk/` is the contract, and it comes first.**
  Every shape lives in `src/sdk/`, and so does the pure function over it.
  `Disposable` sits beside `combineDisposables`, and `Label` beside `resolveLabel`.
  Nothing in `sdk/` imports from a layer above it.
  If a consumer must reach into `core/` for a type, the contract has a hole.
  Fix the sdk first, then the runtime.
- **The layers point down only.**
  The order is `sdk → core → runtime → react → ui`. Nothing points back.
  `core/` never imports `runtime/`.
  When the root export needs both, `src/index.ts` assembles them.
  An import that points up means the two modules are really one. Merge them.
- **A surface is whatever an app mounts to.**
  The nine names in `SurfaceName` are what `DefaultShell` draws and what `layout` seeds defaults for.
  They are a convention, not the full set.
  An app can define `alert:top`, a second status bar, four sidebars, or no sidebar.
  Code that goes through all surfaces must ask `surfaces.listSurfaces()`.
  A hardcoded list of names skips the surfaces an app defined. That is how the session snapshot once lost mounts.
  An app declares its own set with `surfaceDefaults`, which replaces the defaults.
  `initialLayout` is different: it restores and merges.
  scena's own CSS keys on the `role` and `edge` that a shell stamps, never on a surface name.
  An app's CSS can use names, because an app knows its own surfaces.
- **Registries bind late.**
  Components, commands, converters, layouts and shells resolve by name when they mount.
  The graph never imports them.
  That is what lets a page be data.
  It is also why a missing registration fails at run time, not at compile time.
- **The store is the only state.**
  Paths have the shape of a JSON Pointer, with a scope.
  `$/<scope>/...` is absolute. `/...` is relative to the data context around it. `..` is not allowed.
  A component that keeps a copy of store state in React state gives one question two answers.
- **Add, do not edit, within 0.x.**
  The API can still change, but a rename breaks every consumer.
  Add the new shape and deprecate the old one.
- **CSS ships beside its component.**
  `sideEffects` covers `**/*.css`.
  A component imports its own stylesheet. The consumer does not.
- **Tests run on Windows too.**
  Compare paths with `/`. On Windows, `path.relative` returns `\`.

## Publishing

`@softov/scena` is public on **npmjs.org**. Consumers install it with no configuration.
Each release also goes to GitHub Packages.
A release is tag-driven: `pnpm release <patch|minor|major|X.Y.Z>` checks, bumps, commits and tags, and the pushed tag publishes in CI.
[`DEVELOPER.md`](DEVELOPER.md#releases) has the full steps.
Never publish from a local machine. The workflow does it.

## Where it came from

Scena grew inside **doop**, as the next-generation frontend of an agent runtime.
It still shows that origin: the chat picker, the activity bar and the surface model are shaped by what an agent console needs.
doop's `packages/web-next/` is a consumer. In a comment, `opendoop` means doop.

Other consumers:

- **[ahpw](https://github.com/softov/ahpw)**, a web UI for Agent Host Protocol hosts. Every view is a scena page. It can run on a scena checkout's source with `AHPW_SCENA` (see [`DEVELOPER.md`](DEVELOPER.md#try-a-change-in-an-app-before-a-release)).
- **Advisor**, whose `packages/web-next/` is a full application on this runtime.

When a contract here is not clear, those codebases are the worked examples.
