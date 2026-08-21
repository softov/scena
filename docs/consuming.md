# Building an application on Scena

Read [`architecture.md`](architecture.md) first — this assumes its vocabulary.

The worked example throughout is **Advisor**
(`/brb_main/src/service_advisor/packages/web-next`), which is a full
application on this runtime: a dozen resources, an activity bar, a right
sidebar carrying live agent sessions, and a sign-in wall.

## The shape of an app

```
src/
  main.tsx                 mounts <App/>
  App.tsx                  the Scena root, boot-time registration, the wall
  api.ts                   how this app talks to its server
  lib/                     transport and small shared utilities
  shell/                   chrome: titlebar, status bar, activity bar, the shell itself
  resources/<thing>/       one folder per thing the app is about
    data.ts                the data provider
    Explorer.tsx           the list
    Panel.tsx              the detail
    Form.tsx               creating and editing
    commands.ts            every action, registered
    index.ts               registers all of the above as one unit
  themes/
```

A **resource** is the unit of composition, not a route. `resources/tickets/`
owns its provider, its explorer, its panel, its commands, its activity-bar item
and its sidebar mount, and `registerTickets(scena)` returns one disposable that
takes all of it away. Adding a thing the app is about is adding a folder and
one line in `registerShell`.

## Boot order, and why it matters

There are two registration phases and confusing them is the first thing that
goes wrong.

```tsx
export default function App(): ReactElement {
  function onRender(scena: Scena): void {
    // Phase 1 — boot. Nothing here may need a signed-in session.
    registerLayoutCommands(scena);
    registerBuiltins(scena);
    registerBuiltinLayouts(scena);
  }

  return (
    <ScenaRoot options={scenaOptions} onRender={onRender}>
      <PortaBridge>
        <Limen permission="advisor.read" title="Advisor">
          <AppShell />
        </Limen>
      </PortaBridge>
    </ScenaRoot>
  );
}
```

**Phase 1, `onRender`**: the component catalog, the layout strategies, the
layout commands. These are pure registration — no fetching.

**Phase 2, after sign-in**: everything that needs a token. Advisor calls
`registerShell(scena)` in an effect keyed on the session, and disposes it on
sign-out. Registering data providers at boot means a screenful of 401s behind
the wall, because a lazy provider still loads the moment something reads it —
and the wall is not what stops a read.

The options object must have a **stable identity**:

```ts
// Module scope. An inline object re-initializes scena on every App render,
// which clears the store and refetches every list.
const scenaOptions = { layoutStorage, backendFactories, socket };
```

## Data providers

A provider owns a store namespace. The contract is small:

```ts
export const ticketsProvider: DataProviderDefinition = {
  namespace: 'tickets',
  load: 'lazy',
  provider: {
    async load(store, socket) { /* fill $/tickets/*, subscribe to socket */ },
    unload(store) { store.clearNamespace('tickets'); },
    async loadOne(id) { /* one record */ },
  },
};
```

Advisor factors the repeated parts into a `createResourceProvider` helper that
models every list the same way — a `query` path drives a `view` path
(`{ ids, total, loading, error }`) while the records themselves sit at
`byId/<id>`. Explorers, filters and paginators then read `view` and know
nothing about where the data came from. When one route later grows real server
paging, that is a change inside the helper.

Three things are worth copying from it:

**A URL that depends on store state is a function.** A host's sessions have no
URL until a host is picked; `list: (store) => hostId === null ? null : url`
returns `null`, and `null` is "nothing to ask for yet" rather than an error.

**Declare what makes you stale.** `dependsOn: [SELECTED_HOST]` refetches when
the picker moves. `events: ['change']` refetches when the transport says so.

**Coalesce the stream.** A change feed carries one frame per event, and a
busy backend emits them continuously; each one means the same thing to a list
("re-read"). One fetch per burst, trailing edge — per frame it is a list
permanently mid-fetch showing state from several fetches ago.

## Commands, not handlers

Register the action once and let every affordance run it:

```ts
scena.commands.register({
  id: 'session.archive',
  title: 'Archive session',
  slots: ['palette', 'resource:context'],
  when: '$/session/uri',
  async run() { /* ... */ },
});
```

A button then calls `scena.commands.execute('session.archive')`. A pill, a
slash command in a composer, a keybinding and a context-menu row are four ways
into the same registration, and none of them can drift from it. `slots` is what
puts a command into pickers without the picker knowing it exists.

`when` is evaluated against the store, so a command that should not be
available is absent rather than disabled.

## Talking to the store from React

```tsx
const scena = useScena();
const view = useStore<ListView>('$/tickets/view' as BindingPath);
```

`useStore` subscribes to one path. Read the store; do not copy it into
`useState` and edit the copy — the copy is a second answer to a question the
store already answers. Local state is for what has not been committed: the text
in a composer before it is sent, a form before it is submitted.

Publishing *into* the store is how a panel tells commands what it is looking
at:

```tsx
useEffect(() => {
  scena.store.patchMany({ [SESSION_HOST]: host, [SESSION_URI]: uri });
}, [scena, host, uri]);
```

The commands are registered once for the application and read the reference
when they run, which is what lets one registration answer to a button, a typed
`/`, and the palette.

## The mistakes that cost days

**Unstable identities in hooks that memoize on them.** `useChatPicker`
memoizes the active token on the identity of its `prefixes` array, and that
token feeds the picker's host and root frame. An inline `['/']` is a fresh
array every render, so the picker rebuilt itself continuously and threw away
the submenu a click had just opened. Hoist arrays and option objects to module
scope.

**Re-registering commands on every re-render.** Settings that arrive with live
data tempt you into `useEffect(..., [setup])`, and a panel that re-reads on
every backend change then tears down the rows somebody is choosing from. Key
the effect on the *shape* — which settings exist — and read the values from the
store when the command runs.

**A value import of a module that touches Node.** Advisor's `@advisor/core`
root re-exports a config module that reads `node:fs`; a value import from the
browser is a white screen. Types are erased, so `import type` is safe, and
runtime values come from pure subpaths. If your shared package has this shape,
put a test on it — Advisor's `imports.test.ts` fails the build rather than the
page.

**Assuming a surface is visible.** A mount is not a render. `sidebar:right`
can be collapsed, and on a phone the presentation policy may not mount it at
all. Anything that must be seen belongs somewhere that is always mounted, or
behind a command that reveals its surface first.

**Reaching into `core/` for a type.** If a contract is only expressible by
importing a runtime module, the contract has a hole. Fix `sdk/`.

## Theming

Everything is a CSS custom property, and the two themes set the same names:

```
--oo-color-canvas   --oo-color-surface   --oo-color-border
--oo-color-text     --oo-color-muted     --oo-color-accent
--oo-color-primary  --oo-color-danger    --oo-color-warning
--oo-color-hover    --oo-color-active    --oo-color-scrim
--oo-font-family    --oo-font-mono       --oo-font-size-sm
--oo-radius-sm      --oo-<surface>-size  --oo-<surface>-visible
```

Application styles should use them rather than literals, with a fallback where
a token may be absent: `var(--oo-color-success, #6ec46e)`. The surface size and
visibility variables are written by the layout, which is what lets CSS respond
to a collapsed sidebar without JavaScript.
