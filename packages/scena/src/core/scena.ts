import type { BindingPath } from '../sdk/component-graph.js';
import type { CreateScena, CreateScenaOptions, Scena } from '../sdk/scena.js';
import type { SocketBridge } from '../sdk/reactive-store.js';
import type { SurfaceName } from '../sdk/mount-surface.js';

import { createEventBus } from './controls/events.js';
import { createWhenEngine } from './controls/when.js';
import { createCommandRegistry } from './controls/command.js';
import { createKeybindingRegistry } from './controls/keybinding.js';
import { createLayoutAPI, createLayoutRegistry } from './controls/layout.js';
import { createSessionAPI } from './controls/session.js';
import { createShellRegistry } from './controls/shell.js';
import { createManifestAPI } from './controls/manifest.js';

import { createPermissionEngine } from './resolve/permissions.js';
import { createReactiveStore } from './store/reactive-store.js';
import { createBindingResolver } from './resolve/binding-resolver.js';
import { createComponentRegistry } from './registry/component-registry.js';
import { createConverterRegistry } from './registry/converter-registry.js';
import { createMountSurfaceRegistry } from './graph/mount-surface.js';
import { createMountMenuRegistry } from './graph/mount-menu.js';
import { registerBuiltinFunctions } from './builtins.js';

interface CreateScenaInternalOptions extends CreateScenaOptions {
  socket?: SocketBridge;
}

export const createScena: CreateScena = (
  opts: CreateScenaInternalOptions = {},
): Scena => {
  const events = opts.events ?? createEventBus();
  const permissions = createPermissionEngine();
  const store = createReactiveStore({
    events,
    socket: opts.socket,
    backendFactories: opts.backendFactories,
  });
  const bindings = createBindingResolver({ store });
  const when = createWhenEngine({ store });
  const components = createComponentRegistry({ events });
  const converters = createConverterRegistry();
  const surfaces = createMountSurfaceRegistry({ events, when, bindings, store, components });
  const mountMenus = createMountMenuRegistry();
  const layouts = createLayoutRegistry({ events });
  const shells = createShellRegistry({ events, initialId: opts.initialShellId });
  const layout = createLayoutAPI({
    events,
    store,
    initial: opts.initialLayout,
    storage: opts.layoutStorage,
  });

  const scenaRef: { current: Scena | null } = { current: null };
  const keybindings = createKeybindingRegistry({ events, when });
  const commands = createCommandRegistry({
    events,
    store,
    surfaces,
    when,
    socket: opts.socket,
    keybindings,
    getScena: () => {
      if (!scenaRef.current) {
        throw new Error('Scena instance accessed before createScena() returned');
      }
      return scenaRef.current;
    },
  });
  const session = createSessionAPI({
    events,
    store,
    surfaces,
    components,
    storage: opts.sessionStorage,
  });
  const manifest = createManifestAPI({
    events,
    store,
    components,
    commands,
    keybindings,
    surfaces,
    converters,
    permissions,
  });

  if (opts.initialActive) {
    for (const [path, value] of Object.entries(opts.initialActive)) {
      store.set(path as BindingPath, value);
    }
  }

  events.on('scena:mount:focused', (payload) => {
    const ev = payload as { key: string; surface: SurfaceName };
    layout.setSurface(ev.surface, { activeContainerKey: ev.key });
  });

  const scena: Scena = {
    components,
    store,
    bindings,
    surfaces,
    mountMenus,
    layouts,
    converters,
    permissions,
    commands,
    keybindings,
    shells,
    layout,
    session,
    manifest,
    events,
    when,
    open: surfaces.open.bind(surfaces),
    openResource: surfaces.openResource.bind(surfaces),
    execute: commands.execute.bind(commands),
    setSessionStorage(s) {
      session.setStorage(s);
    },
    setLayoutStorage(s) {
      layout.setStorage(s);
    },
    dispose() {
      // Per-source disposable tracking lives at the registration site.
    },
  };
  scenaRef.current = scena;

  // The a2ui v0.10 basic-catalog functions are always available.
  registerBuiltinFunctions(scena);

  return scena;
};
