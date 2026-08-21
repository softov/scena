# scena

Graph-mounted reactive UI runtime.

Scena renders UI from data, not from hand-written component trees.
A page is a graph of component nodes held in a layered reactive store; components are resolved through a late-binding registry and mounted lazily.

> Status: pre-1.0. The public surface is still moving.

## Documentation

| Document | What it answers |
| --- | --- |
| [`docs/README.md`](docs/README.md) | The vocabulary everything else assumes |
| [`docs/architecture.md`](docs/architecture.md) | The model: store, graph, registries, surfaces, shells |
| [`docs/consuming.md`](docs/consuming.md) | Building an application on it, and the mistakes that cost days |
| [`docs/ui.md`](docs/ui.md) | The component catalog and the theme tokens |

## Packages

| Package | Description |
| --- | --- |
| [`@softov/scena`](packages/scena) | The runtime and its contracts. Published to npm. |
| `@softov/scena-playground` | Local dev app and component showcase. Aliases to `packages/scena/src`. Private. |
| [`@softov/scena-demo`](packages/demo) | Small reference app. Resolves the package through its published exports, so it catches what the playground's src aliases hide. Private. |

`@softov/scena` ships one package with layered entry points:

| Entry | What it is |
| --- | --- |
| `@softov/scena` | The root surface — core plus the runtime wired on top |
| `@softov/scena/sdk` | The contracts, and the pure functions over them. Depends on nothing |
| `@softov/scena/core` | The store, graph, resolvers and registries |
| `@softov/scena/runtime` | Surface bridge, sockets, layout and opener commands |
| `@softov/scena/react` | React bindings (`/react/core` is the narrow boot entry) |
| `@softov/scena/ui` | The component catalog (`/ui/<category>` per section) |
| `@softov/scena/porta` | Sign-in |
| `@softov/scena/styles` | Theme registry and stylesheets |

`@softov/scena/types` is the former name of `/sdk` and still resolves to it.

## Development

```bash
pnpm install
pnpm dev          # playground on http://localhost:5174
pnpm typecheck
pnpm test
pnpm lint
pnpm build        # emits packages/scena/dist
```

## Releasing

Releases are tag-driven. Bump the version in `packages/scena/package.json`, then:

```bash
git tag v0.1.0
git push origin v0.1.0
```

`.github/workflows/release.yml` runs typecheck, tests and build, then publishes to **GitHub Packages**.
The package stays private for as long as the repository is - GitHub Packages inherits repository visibility.

Consumers need a `.npmrc` pointing the `@softov` scope at the GitHub registry, with a personal access token carrying `read:packages`:

```
@softov:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```


## License

MIT
