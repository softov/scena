import type { Disposable } from './disposable.js';
import type { SurfaceName, ResolvedMount } from './mount-surface.js';
import type { ReactiveStore } from './reactive-store.js';

// ----- Layout state -----

export interface SpatialBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SpatialArrangement = 'cascade' | 'grid' | 'manual';

export interface SpatialViewport {
  scale: number;
  panX: number;
  panY: number;
}

// `tab-panel` layout uses a recursive binary tree. A leaf holds an ordered
// list of mount keys (one tab strip); a split holds two children with a
// resizable divider between them. Direction `row` puts children side by
// side (vertical divider); `column` stacks them (horizontal divider).
//
// The tree is the only source of truth for tab-panel — there is no flat
// fallback. Stable leaf ids let drag-drop address a target without
// threading paths through React props.
export type TabPanelNode = TabPanelLeaf | TabPanelSplit;

export interface TabPanelLeaf {
  kind: 'leaf';
  id: string;
  tabs: string[];
  activeKey?: string;
}

export type TabPanelDirection = 'row' | 'column';

export interface TabPanelSplit {
  kind: 'split';
  direction: TabPanelDirection;
  // First child's share of the split (0..1). Default 0.5.
  ratio?: number;
  first: TabPanelNode;
  second: TabPanelNode;
}

// How a surface occupies space in the shell — a separate axis from whether it
// is visible. A floating sidebar is still open and still reachable; it has just
// stopped competing with `main` for width.
//
//   docked   — flex child, consumes width/height, splitter applies (the default)
//   floating — lifted out of flow over `main`, consumes nothing, splitter moot
//   sheet    — floating from an edge; what `panel:bottom` becomes when narrow
//   bar      — pinned to the cross edge; what `activitybar` becomes when narrow
//
// Deliberately NOT part of SurfaceLayoutState: that interface is persisted
// through LayoutStorage, and presentation is derived from the environment. A
// phone session must not teach a desktop that the sidebar floats.
export type SurfacePresentation = 'docked' | 'floating' | 'sheet' | 'bar';

export interface SurfaceLayoutState {
  visible: boolean;
  size?: number;
  side?: 'left' | 'right' | 'top' | 'bottom';
  // Built-in layout ids:
  //   'tab' | 'split' | 'single' (alias 'page') | 'spatial' |
  //   'stack' | 'rail' | 'inline' | 'floating' | 'tab-panel' (v0.1).
  // Plugins may register additional ids (gated by permissions.registerLayouts).
  layout?: string;
  activeContainerKey?: string;
  // Active "section" for surfaces that swap between when-gated mounts by a
  // single selector (today: sidebar:left's explorer sections). Layout state so
  // it persists via LayoutStorage like visible/size; read from the mirror at
  // `$/layout/surfaces/<surface>/section`, written via layout.setSurface.
  section?: string;
  split?: {
    ratios?: number[];
    order?: string[];
    collapsed?: string[];
    // Mount keys the user has pinned. Layouts that respect pinning swap the
    // × close affordance for a pin icon (clicking unpins).
    pinned?: string[];
  };
  // `tab-panel` layout state. Recursive binary tree; see TabPanelNode.
  tabPanel?: {
    tree: TabPanelNode;
  };
  // SpatialLayout state. `arrangement` controls how new mounts are placed
  // (and how layout-switching re-arranges existing ones in cascade/grid mode).
  // `bounds` holds the per-mount geometry; in `manual` arrangement it's the
  // source of truth, in cascade/grid it's recomputed each render and may be
  // overwritten on user drag (which auto-switches to manual).
  // `selectedKey` is the focused mount in spatial mode — single-select for v0.
  // The selected mount renders with an accent border and is brought to front.
  spatial?: {
    arrangement?: SpatialArrangement;
    bounds?: Record<string, SpatialBounds>;
    selectedKey?: string;
    // Viewport transform applied to the cards container.
    //   scale — 1.0 = world pixel == screen pixel; range clamped to [0.1, 4]
    //   panX, panY — translate in screen pixels applied AFTER scale
    //                (transform: translate(panX, panY) scale(s)).
    // Default is { scale: 1, panX: 0, panY: 0 }. "Fit to view" computes from
    // the union of `bounds`; ctrl+wheel zooms around the cursor.
    viewport?: SpatialViewport;
  };
  // StackLayout state. `container` adds an optional surface-level title
  // strip above the stacked sections (the VS-Code "ViewContainer" pattern:
  // EXPLORER bar with a `[...]` toggle menu listing each pane). `hidden`
  // is the set of mount keys the user has toggled off via that menu.
  stack?: {
    container?: {
      title?: string;
      icon?: string;
      // Plain string keeps this type free of UI-package imports; runtime
      // resolution treats it as an color.
      color?: string;
    };
    hidden?: string[];
  };
}

export interface ScenaLayout {
  surfaces: Partial<Record<SurfaceName, SurfaceLayoutState>>;
}

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export interface LayoutAPI {
  get(): ScenaLayout;
  set(layout: ScenaLayout): void;
  patch(patch: DeepPartial<ScenaLayout>): void;
  setSurface(surface: SurfaceName, state: Partial<SurfaceLayoutState>): void;
  subscribe(fn: (layout: ScenaLayout) => void): Disposable;
}

export interface LayoutStorage {
  load(): Promise<ScenaLayout | null>;
  save(layout: ScenaLayout): Promise<void>;
  clear(): Promise<void>;
}

// ----- LayoutRegistry (surface render strategies) -----

export interface LayoutLifecycleContext {
  surface: SurfaceName;
  mounts: ResolvedMount[];
  store: ReactiveStore;
  previousLayoutId?: string;
}

export interface LayoutProps {
  surface: SurfaceName;
  mounts: ResolvedMount[];
  state: SurfaceLayoutState;
  // How the hosting surface occupies space. A layout whose own axis depends on
  // it — RailLayout stacks vertically when docked, horizontally as a `bar` —
  // reads this instead of hard-coding a direction. Optional so third-party
  // layouts written before presentation existed keep compiling; absent means
  // 'docked'.
  presentation?: SurfacePresentation;
  setState(patch: Partial<SurfaceLayoutState>): void;
  renderMount(mount: ResolvedMount): unknown;
  onActivate(key: string): void;
  onClose(key: string, opts?: { reason?: string }): void;
  onReorder(fromIndex: number, toIndex: number): void;
}

export interface LayoutDefinition {
  id: string;
  title: string;
  // React component; concrete type provided by @softov/scena/react.
  component: unknown;
  appliesTo?: SurfaceName[];
  icon?: string;
  onActivate?(ctx: LayoutLifecycleContext): void;
  onDeactivate?(ctx: LayoutLifecycleContext): void;
}

export interface LayoutRegistry {
  register(layout: LayoutDefinition): Disposable;
  unregister(id: string): void;
  get(id: string): LayoutDefinition | undefined;
  list(): LayoutDefinition[];
}
