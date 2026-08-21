import type { Disposable } from './disposable.js';
import type { BindingPath, ComponentNode } from './component-graph.js';
import type { WhenClause } from './when.js';
import type { ResourceColor } from './colors.js';
import type { MountDisplay, SurfaceName } from './mount-surface.js';
import type { ReactiveStore } from './reactive-store.js';
import type { Scena } from './scena.js';
import type { Label } from './label.js';

export type ComponentCategory = 'chrome' | 'page' | 'inline' | 'statusbar' | 'picker';

// Opener metadata — declares that this component can render a given resource
// kind. Used by `findOpeners` for "Open with…" submenus + as the default for
// double-click open in explorers. The picker shows one row per opener.
export interface ComponentOpensSpec {
  resourceKinds?: string[];
  selector?: WhenClause;
  title?: Label;
  icon?: string;
  color?: ResourceColor;
  priority?: number;
  preferredSurface?: SurfaceName;
  // Store namespace holding the record (e.g. 'users'). `openResource` sets the
  // mount's dataContext to `$/<namespace>/byId/<id>`, so `opens.title` and the
  // mounted component can use relative paths (`{ path: '/name' }`) that resolve
  // against this record — no per-id interpolation needed.
  namespace?: string;
}

// Lifecycle hook for a mounted component instance. Runs once when the
// component mounts (useEffect-style) and the returned function — if any — runs
// on unmount. Imperative setup only: register timers, subscribe to events, seed
// the store. It is NOT a React component, so it cannot call hooks; hold state in
// `ctx.store` (templates bind to it) instead.
export interface ComponentMountContext {
  scena: Scena;
  store: ReactiveStore;
  mountKey: string | null;
  dataContext?: BindingPath;
}
export type ComponentMountHandler = (ctx: ComponentMountContext) => (() => void) | void;

export type PropsSchema = Record<string, string | readonly string[]>;

export interface EditorMetadata {
  insertable?: boolean;
  acceptsChildren?: boolean;
}

export type RendererKind =
  | { kind: 'react'; load: () => Promise<{ default: unknown }> }
  | { kind: 'template'; template: ComponentNode }
  | { kind: 'html'; mount: (host: HTMLElement, props: unknown) => Disposable };

export interface ComponentDefinition {
  component: string;
  renderer: RendererKind;
  propsSchema?: PropsSchema;
  category?: ComponentCategory;
  editor?: EditorMetadata;
  fallback?: ComponentNode;
  // Mount lifecycle — timers / subscriptions / store seeding for this
  // component. Runs once per mounted instance; return a cleanup for unmount.
  onMount?: ComponentMountHandler;
  opens?: ComponentOpensSpec;
  // Default display props (title / icon / color) for tabs and section
  // headers. Acts as the fallback when a mount of this component doesn't
  // supply its own `props`. Layouts merge per-field: mount.props wins
  // where defined; component.props fills the rest.
  props?: MountDisplay;
}

export interface ResolvedRenderer {
  component: string;
  renderer: RendererKind;
  definition: ComponentDefinition;
}

export interface ComponentRegistry {
  register(def: ComponentDefinition): Disposable;
  unregister(component: string): void;
  get(component: string): ComponentDefinition | undefined;
  list(): ComponentDefinition[];
  // Find components whose `opens` declaration accepts the given resource kind.
  // Sorted by descending priority. Selector (if any) is NOT evaluated here —
  // callers that have a store available should re-filter via when.evaluate.
  findOpeners(resourceKind: string): ComponentDefinition[];
  resolve(component: string, options?: { timeoutMs?: number }): Promise<ResolvedRenderer>;
  pending(): string[];
}
