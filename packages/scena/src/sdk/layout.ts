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

/**
 * Which edge of itself a surface closes on — the one facing `main`.
 *
 * Stamped by the shell, because only the shell knows its own arrangement: the
 * same surface is `inline-end` in one app and `inline-start` in another, and a
 * surface scena has never heard of has no name to look up.
 *
 * Logical rather than physical, so chrome flips under `dir="rtl"` without the
 * shell restating it.
 *
 * This exists so scena's own CSS can stop matching surface NAMES. Rules keyed
 * on `.oo-surface--sidebar-left` work only for the nine and silently skip
 * whatever an app defined; rules keyed on `[data-surface-edge]` work for
 * anything the shell places.
 */
export type SurfaceEdge = 'inline-start' | 'inline-end' | 'block-start' | 'block-end';

/**
 * What kind of region a surface is, for styling that is about the kind rather
 * than the identity — a bar's buttons are small and quiet whether that bar is
 * the title bar, the status bar, or an app's own `alert:top`.
 *
 * Also stamped by the shell. scena's CSS matches this; an APP's CSS is free to
 * match `data-surface` by name, because an app does know its own surfaces.
 */
export type SurfaceRole = 'bar' | 'rail' | 'panel' | 'main' | 'overlay';

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

export interface SetSurfaceOptions {
  // A frame of a continuous gesture (a splitter drag, a spatial pan) rather
  // than a settled value.
  //
  // Subscribers and `scena:layout:changed` still fire, because they are what
  // moves the pixels. What is skipped is everything only a settled value needs:
  // mirroring into the reactive store, which wakes every `useStore` in the app,
  // and persisting, which serialises the whole layout. Both happen on the next
  // non-transient call, so the gesture ends by committing once.
  transient?: boolean;
}

export interface LayoutAPI {
  get(): ScenaLayout;
  set(layout: ScenaLayout): void;
  patch(patch: DeepPartial<ScenaLayout>): void;
  setSurface(
    surface: SurfaceName,
    state: Partial<SurfaceLayoutState>,
    opts?: SetSurfaceOptions,
  ): void;
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
