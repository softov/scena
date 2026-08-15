# scena

Graph-mounted reactive UI runtime.

Scena renders UI from data, not from hand-written component trees.
A page is a graph of component nodes held in a layered reactive store; components are resolved through a late-binding registry and mounted lazily.

> Status: pre-1.0. The public surface is still moving.

## Packages

| Package | Description |
| --- | --- |
| [`@softov/scena`](packages/scena) | The runtime and its contracts. Published to npm. |
| `@softov/scena-playground` | Local dev app and component showcase. Private, never published. |

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

`.github/workflows/release.yml` runs typecheck, tests and build, then publishes to npm with provenance.

## License

MIT
