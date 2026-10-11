<p align="center">
  <img src="docs/logo.png" alt="scena" width="96" height="96">
</p>

<h1 align="center">scena</h1>

<p align="center">
  A reactive UI runtime that renders pages from data.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@softov/scena"><img src="https://img.shields.io/npm/v/@softov/scena?color=4ec9b0" alt="npm version"></a>
  <a href="https://github.com/softov/scena/actions/workflows/ci.yml"><img src="https://github.com/softov/scena/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@softov/scena"><img src="https://img.shields.io/npm/dm/@softov/scena" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/@softov/scena" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6" alt="TypeScript strict">
  <img src="https://img.shields.io/badge/node-%E2%89%A522-339933" alt="Node 22 or later">
</p>

![The scena playground: the component catalog in tabs, dark theme](docs/screenshots/playground-tabs.png)

## What it is

Scena renders UI from data, not from hand-written component trees.
A page is a graph of component nodes.
The graph lives in a layered reactive store.
The runtime finds each component by name in a registry, mounts it when it is needed, and renders it again when its data changes.
Because no page imports a component, you can save a page, send it over a socket, edit it, or generate it.

> Status: pre-1.0. The public API can still change.

## What you get

- **A reactive store.** One scoped tree of values. Components bind to paths in it.
- **A component graph.** Pages are data. You can persist, transport and generate them.
- **Late-binding registries.** Components, commands, layouts and shells resolve by name when they mount.
- **Surfaces and layouts.** Mount pages into named surfaces. Show them as tabs, tab groups, splits, stacks, or cards on a spatial canvas.
- **A component catalog.** Forms, data tables, charts, menus, markdown, and more.
- **Themes.** Seven built-in themes, each with a light and a dark mode, all driven by CSS tokens.
- **Sign-in.** A sign-in wall and session handling, with pluggable providers.

| Light mode | Spatial layout |
| --- | --- |
| ![The input catalog in the light theme](docs/screenshots/playground-light.png) | ![Pages as cards on the spatial canvas](docs/screenshots/playground-spatial.png) |

## Built with scena

### ahpw

[ahpw](https://github.com/softov/ahpw) is a web UI for [Agent Host Protocol](https://github.com/microsoft/agent-host-protocol) hosts.
It shows sessions, files, terminals and automations from one or more hosts.
It runs on its own with `ahpw serve`, as an ahpd plugin (`@ahpd/web`), or inside the [ahp-desk](https://github.com/softov/ahp-desk) desktop app.
Every view in it is a scena page.

![ahpw showing scena's own source and README side by side](docs/screenshots/ahpw.png)

A page with pending work asks before it closes.
The same question shows in every layout.

| Split layout | Spatial layout, closed with Esc |
| --- | --- |
| ![ahpw asks before it closes a new session with an unsent message](docs/screenshots/ahpw-close-split.png) | ![The same question over a card on the spatial canvas](docs/screenshots/ahpw-close-spatial.png) |

Themes restyle the whole app, not only scena's own parts.
This is ahpw in the built-in `forest` theme, dark mode.

![ahpw in the forest theme, dark mode](docs/screenshots/ahpw-forest-dark.png)

Do you build on scena? Open a pull request to add your project here.

## Install

```bash
pnpm add @softov/scena
```

React is an optional peer dependency.
The store and the runtime work without it.
Add React for the bindings and the component catalog:

```bash
pnpm add react react-dom
```

To build an application, start with [`docs/consuming.md`](docs/consuming.md).

## Documentation

| Document | What it answers |
| --- | --- |
| [`docs/README.md`](docs/README.md) | The words that the other documents use |
| [`docs/architecture.md`](docs/architecture.md) | The model: store, graph, registries, surfaces, shells |
| [`docs/consuming.md`](docs/consuming.md) | How to build an application on scena, and the mistakes to avoid |
| [`docs/ui.md`](docs/ui.md) | The component catalog and the theme tokens |
| [`DEVELOPER.md`](DEVELOPER.md) | How to work on scena itself: setup, checks, testing in an app, releases |

## Packages

| Package | Description |
| --- | --- |
| [`@softov/scena`](packages/scena) | The runtime and its contracts. Published to npm. |
| `@softov/scena-playground` | A dev app and component showcase. It reads `packages/scena/src` directly. Private. |
| [`@softov/scena-demo`](packages/demo) | A small reference app. It uses the published exports, so it finds packaging errors that the playground hides. Private. |

`@softov/scena` is one package with layered entry points:

| Entry | What it is |
| --- | --- |
| `@softov/scena` | The root: core, with the runtime on top |
| `@softov/scena/sdk` | The contracts and the pure functions over them. No dependencies |
| `@softov/scena/core` | The store, the graph, the resolvers and the registries |
| `@softov/scena/runtime` | The surface bridge, sockets, and the layout and opener commands |
| `@softov/scena/react` | The React bindings. `/react/core` is the small boot entry |
| `@softov/scena/ui` | The component catalog. `/ui/<section>` loads one section |
| `@softov/scena/porta` | Sign-in |
| `@softov/scena/styles` | The theme registry and the stylesheets |

`@softov/scena/types` is the old name of `/sdk`. It still works.

## Contributing

Read [`DEVELOPER.md`](DEVELOPER.md) to set up, run the checks, and try a change in an app before a release.
Agents and their humans: read [`AGENTS.md`](AGENTS.md) for the conventions.

## License

[MIT](LICENSE)
