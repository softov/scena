import type { Disposable } from './disposable.js';
import type {
  CheckedNode,
  ComponentNode,
  ComponentProps,
  DataBinding,
  OpenedComponent,
} from './component-graph.js';
import type { WhenClause } from './when.js';
import type { ResourceColor } from './colors.js';
import type { Label } from './label.js';

/**
 * Where something mounts.
 *
 * The nine below are the ones scena's own DefaultShell renders and the ones
 * `layout` seeds defaults for — they are a convention, not the set. An app
 * mounts to whatever names its shell draws: a second status bar, an
 * `alert:top` band, four sidebars, or no sidebar at all.
 *
 * The runtime never had an opinion here — mounts, layout state and store paths
 * are all keyed by the string — but this type used to say otherwise, which made
 * the contract narrower than the thing it described. The `(string & {})` arm
 * keeps editor completion for the nine while admitting any other name.
 *
 * Consequence for anything that sweeps surfaces: ask
 * `surfaces.listSurfaces()`. A list of names written here cannot know what an
 * app defined.
 */
export type SurfaceName =
  | 'titlebar'
  | 'activitybar'
  | 'sidebar:left'
  | 'sidebar:right'
  | 'main'
  | 'panel:bottom'
  | 'statusbar'
  | 'overlay'
  | 'detached'
  | (string & {});

// A mount target: either an inline ComponentNode (which may be a full page
// tree) or a DataBinding whose value is a ComponentNode (late-resolved
// against the store).
export type MountTarget = ComponentNode | DataBinding;

export type EditTier = 'basic' | 'content' | 'binding' | 'structure' | 'schema';

export interface MountPolicy {
  editable?: boolean;
  editTier?: EditTier;
  persistent?: boolean;
  transient?: boolean;
  customizable?: boolean;
}

// Display metadata for a mount — used by layouts (TabLayout, TabPanelLayout,
// StackLayout) to render the tab / section header. Per-mount so two
// instances of the same component can show different names ("Chat A" vs
// "Chat B"); falls through to `ComponentDefinition.props` when omitted,
// and finally to the raw `key` when neither is set.
export interface MountDisplay {
  // string | { path } | { t } — section/tab headers resolve it (the `{ t }`
  // form re-translates on locale switch). See types/label.ts.
  title?: Label;
  icon?: string;
  color?: ResourceColor;
  // Header actions for the section/tab header: `[icon Title] [actions…] [⋯]`.
  // Each runs a registered command. `when` is reserved (not yet evaluated).
  actions?: MountAction[];
}

// A button in a section header — e.g. an explorer's "New" / "Refresh".
export interface MountAction {
  command: string;
  label?: Label; // string | { path } | { t }
  icon?: string;
  when?: WhenClause;
}

export interface MountDeclaration<TResource extends MountTarget = MountTarget> {
  surface: SurfaceName;
  key: string;
  when?: WhenClause;
  resource: TResource;
  props?: MountDisplay;
  policy?: MountPolicy;
  // Absolute data-context root for `/...` relative paths inside this mount's
  // component tree. Bindings without `$/` are joined against this prefix.
  dataContext?: `$/${string}`;
}

export interface ResolvedMount {
  key: string;
  surface: SurfaceName;
  component: ComponentNode;
  // Already merged: mount.props ?? component.props ?? undefined.
  // Layouts read `mount.props?.title ?? mount.key` for the strip.
  props?: MountDisplay;
  policy: MountPolicy;
  dataContext?: `$/${string}`;
  openedAt: number;
}

export interface MountHandle {
  key: string;
  surface: SurfaceName;
  close(opts?: { reason?: string }): void;
  focus(): void;
}

export interface MountSurfaceRegistry {
  // `T & CheckedNode<T>` rather than plain `MountTarget`: T is inferred from
  // the resource that was written, and then checked against what its
  // component declared. A component nobody declared props for makes
  // `CheckedNode<T>` equal to T, which is no constraint at all - so this is
  // additive and every existing mount still compiles.
  mount<T extends MountTarget>(decl: MountDeclaration<T & CheckedNode<T>>): Disposable;
  open<T extends MountTarget>(opts: {
    surface: SurfaceName;
    key: string;
    resource: T & CheckedNode<T>;
    props?: MountDisplay;
    policy?: MountPolicy;
    dataContext?: `$/${string}`;
  }): MountHandle;
  /*
   * `extraProps` is what actually becomes the mounted component's props -
   * `openResource` spreads it into the node beside `resourceId` and nothing
   * else - and it was `Record<string, unknown>`, so a misspelled key was
   * carried into the tree and dropped in silence.
   *
   * When the kind has been indexed in `ResourceOpeners` and its component's
   * props declared in `ComponentProps`, it is checked against those. Neither
   * declared, and this is the signature it has always had. `resourceId` is
   * omitted because the call names it in its own field, and two ways to set
   * one thing is how they come to disagree.
   */
  openResource<K extends string>(
    kind: K,
    args?: [OpenedComponent<K>] extends [never]
      ? OpenResourceArgs
      : Omit<OpenResourceArgs, 'extraProps'> & {
          extraProps?: Omit<ComponentProps[OpenedComponent<K>], 'resourceId'>;
        },
  ): MountHandle | null;
  // Closes at once. This is the close for code: nothing is asked.
  close(key: string, opts?: { reason?: string }): void;
  /*
   * The close a person starts: the tab's x, the card menu, Esc. A mount with
   * pending work declares it with `guardClose`. When a guard gives a reason,
   * the close waits for an answer (`closeAsked`, then `answerClose`).
   * Without a reason, it is `close`.
   */
  requestClose(key: string, opts?: { reason?: string }): void;
  // `guard` returns why closing now loses work, or null when nothing is lost.
  guardClose(key: string, guard: () => string | null): Disposable;
  // The close that waits for an answer, or null.
  closeAsked(): CloseAsk | null;
  // true closes the asked mount, false keeps it open.
  answerClose(close: boolean): void;
  focus(key: string): void;
  listAt(surface: SurfaceName): ResolvedMount[];
  // Surfaces that currently hold a visible mount, ordered by first mount.
  // Sweep with this rather than with a list of names — an app defines its
  // own surfaces, so a hardcoded list skips whatever it predates.
  listSurfaces(): SurfaceName[];
  move(opts: { key: string; toSurface: SurfaceName; fromSurface?: SurfaceName }): void;
}

// A close that waits for an answer: the mount, and what closing it loses.
export interface CloseAsk {
  key: string;
  title?: Label;
  reason: string;
}

export interface OpenResourceOptions {
  surface?: SurfaceName;          // default: opens.preferredSurface ?? 'main'
  mountKey?: string;              // default: `${kind}:${resourceId}`
  title?: Label;                  // default: opens.title; else undefined → layout shows mount.key
  dataContext?: `$/${string}`;    // default: `$/<opens.namespace>/byId/<id>` (record root for relative paths)
  focus?: boolean;                // default: true (surfaces.open already focuses)
}

export interface OpenResourceArgs {
  resourceId?: string;            // falls back to $/resource/id (menu-driven opens)
  options?: OpenResourceOptions;
  extraProps?: Record<string, unknown>;  // merged into the mounted component's props
}