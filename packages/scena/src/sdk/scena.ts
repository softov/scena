import type { Disposable } from './disposable.js';
import type { BindingPath } from './component-graph.js';
import type { ComponentRegistry } from './component-registry.js';
import type { ReactiveStore, SocketBridge } from './reactive-store.js';
import type { BindingResolver } from './binding-resolver.js';
import type { MountSurfaceRegistry, SurfaceName } from './mount-surface.js';
import type { MountMenuRegistry } from './mount-menu.js';
import type { ConverterRegistry } from './converter-registry.js';
import type { PermissionEngine } from './permissions.js';
import type { CommandRegistry } from './command.js';
import type { KeybindingRegistry } from './keybinding.js';
import type { ShellRegistry } from './shell.js';
import type { SurfaceLayoutState,
  LayoutAPI,
  LayoutRegistry,
  LayoutStorage,
  ScenaLayout,
} from './layout.js';
import type { SessionAPI, SessionStorage } from './session.js';
import type { ManifestAPI } from './manifest.js';
import type { EventBus } from './events.js';
import type { WhenEngine, ContextValue } from './when.js';
import type { ScopeBackendFactory } from './scope-backend.js';

export interface Scena extends Disposable {
  components: ComponentRegistry;
  store: ReactiveStore;
  bindings: BindingResolver;
  surfaces: MountSurfaceRegistry;
  // Per-mount context-menu contributors, keyed by menu slot (e.g.
  // 'tab:context'). Hosts register dynamic rows; layouts surface them.
  mountMenus: MountMenuRegistry;
  layouts: LayoutRegistry;
  converters: ConverterRegistry;
  permissions: PermissionEngine;

  commands: CommandRegistry;
  keybindings: KeybindingRegistry;
  shells: ShellRegistry;
  layout: LayoutAPI;
  session: SessionAPI;
  manifest: ManifestAPI;

  events: EventBus;
  when: WhenEngine;

  open: MountSurfaceRegistry['open'];
  // Resource-level open: resolve the kind's opener (opens metadata) and mount it.
  // Facade over surfaces.openResource — the ergonomic entry callers use.
  openResource: MountSurfaceRegistry['openResource'];
  execute: CommandRegistry['execute'];

  setSessionStorage(s: SessionStorage | null): void;
  setLayoutStorage(s: LayoutStorage | null): void;
}

export interface CreateScenaOptions {
  initialActive?: Record<BindingPath, ContextValue>;
  sessionStorage?: SessionStorage;
  layoutStorage?: LayoutStorage;
  events?: EventBus;
  defaultSurface?: SurfaceName;
  // The surfaces this app has, and how each one starts.
  //
  // REPLACES scena's nine rather than merging over them, which is the whole
  // point: `initialLayout` can change a default but never remove one, so an
  // app with no sidebar was still carrying `sidebar:left` in its layout state,
  // in the store, and in whatever `layoutStorage` persisted.
  //
  // Omit for the nine scena's own DefaultShell draws. Spread
  // DEFAULT_SURFACE_LAYOUTS to start from them and add.
  surfaceDefaults?: Partial<Record<SurfaceName, SurfaceLayoutState>>;
  // Layout state to restore -- a saved session, not a declaration of which
  // surfaces exist. Merges over whichever defaults are in effect.
  initialLayout?: ScenaLayout;
  initialShellId?: string;
  // Per-scope value backends (persistence, Yjs, socket). Absent scopes use the
  // in-memory tree. See types/scope-backend.ts.
  backendFactories?: ScopeBackendFactory[];
  // App transport adapter passed to data providers (provider.load(store, socket)).
  socket?: SocketBridge;
}

export type CreateScena = (opts?: CreateScenaOptions) => Scena;
