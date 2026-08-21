import type { EventBus } from '../../sdk/events.js';
import type { BindingPath } from '../../sdk/component-graph.js';
import type { ReactiveStore } from '../../sdk/reactive-store.js';
import type { SurfaceName } from '../../sdk/mount-surface.js';
import type {
  DeepPartial,
  LayoutAPI,
  LayoutDefinition,
  LayoutRegistry,
  LayoutStorage,
  ScenaLayout,
  SurfaceLayoutState,
} from '../../sdk/layout.js';
import { disposableFrom } from '../../sdk/disposable.js';

interface LayoutDeps {
  events: EventBus;
  store: ReactiveStore;
  initial?: ScenaLayout;
  storage?: LayoutStorage;
  // Replaces DEFAULT_SURFACE_LAYOUTS. See CreateScenaOptions.surfaceDefaults.
  surfaceDefaults?: Partial<Record<SurfaceName, SurfaceLayoutState>>;
}

/**
 * How the nine surfaces scena's own DefaultShell draws start out.
 *
 * These are a convenience, not a claim about what surfaces exist: an app that
 * has its own set passes `surfaceDefaults` to createScena and these are not
 * used at all. Exported so an app that wants scena's nine *plus* its own can
 * spread rather than retype them.
 *
 * They are deliberately the base rather than something `initialLayout` merges
 * into, because the two answer different questions -- which surfaces this app
 * has, versus what state to restore.
 */
export const DEFAULT_SURFACE_LAYOUTS: Partial<Record<SurfaceName, SurfaceLayoutState>> = {
  titlebar: { visible: true, layout: 'bar' },
  activitybar: { visible: true, layout: 'rail' },
  'sidebar:left': { visible: true, layout: 'single', size: 240 },
  'sidebar:right': { visible: false, layout: 'stack', size: 280 },
  main: { visible: true, layout: 'tab' },
  'panel:bottom': { visible: false, layout: 'tab', size: 200 },
  statusbar: { visible: true, layout: 'bar' },
  overlay: { visible: true, layout: 'floating' },
  detached: { visible: false, layout: 'single' },
};

function defaultLayout(defaults?: Partial<Record<SurfaceName, SurfaceLayoutState>>): ScenaLayout {
  // `?? DEFAULT_SURFACE_LAYOUTS`, not a merge: an app that passes its own set
  // is saying those ARE its surfaces, and merging would put back the ones it
  // just declined. An empty object is therefore a legitimate answer -- no
  // surfaces until something calls setSurface.
  return { surfaces: { ...(defaults ?? DEFAULT_SURFACE_LAYOUTS) } };
}

// Long enough to swallow a gesture, short enough that letting go of a splitter
// and closing the tab keeps the size.
const SAVE_DEBOUNCE_MS = 150;

function applyDeep<T>(base: T, patch: DeepPartial<T>): T {
  if (patch === null || typeof patch !== 'object') return patch as unknown as T;
  if (Array.isArray(patch)) return patch as unknown as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = applyDeep((out[k] ?? {}) as unknown, v as DeepPartial<unknown>);
  }
  return out as T;
}

function surfaceBase(surface: string): string {
  // Surface names can contain `:` (sidebar:left). Per RFC 6901, `:` is a
  // legal segment character, so we use it as-is.
  return `$/layout/surfaces/${surface}`;
}

export function createLayoutAPI(deps: LayoutDeps): LayoutAPI & {
  setStorage(s: LayoutStorage | null): void;
} {
  const { events, store } = deps;
  let storage: LayoutStorage | null = deps.storage ?? null;
  const base = (): ScenaLayout => defaultLayout(deps.surfaceDefaults);
  let state: ScenaLayout = deps.initial
    ? applyDeep(base(), deps.initial as DeepPartial<ScenaLayout>)
    : base();
  const subscribers = new Set<(layout: ScenaLayout) => void>();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  // Only the surfaces that could have changed. `set` and `patch` can touch any
  // of them and pass nothing; `setSurface` names the one it wrote, which keeps a
  // splitter drag from re-announcing all nine every frame.
  function changedSurfaces(only?: SurfaceName): [string, SurfaceLayoutState][] {
    if (only !== undefined) {
      const one = state.surfaces[only];
      return one ? [[only, one]] : [];
    }
    return Object.entries(state.surfaces).filter(
      (entry): entry is [string, SurfaceLayoutState] => entry[1] !== undefined,
    );
  }

  // `store.set` queues a change notification unconditionally, so mirroring a
  // value back over itself still wakes every subscriber on that path. Most of
  // what this writes is unchanged on any given call.
  function setIfChanged(path: string, value: unknown): void {
    if (Object.is(store.get(path as BindingPath), value)) return;
    store.set(path as BindingPath, value);
  }

  function mirrorToStore(only?: SurfaceName): void {
    for (const [surface, surfaceState] of changedSurfaces(only)) {
      const base = surfaceBase(surface);
      setIfChanged(`${base}/visible`, surfaceState.visible);
      if (surfaceState.size !== undefined) {
        setIfChanged(`${base}/size`, surfaceState.size);
      }
      if (surfaceState.layout !== undefined) {
        setIfChanged(`${base}/layout`, surfaceState.layout);
      }
      if (surfaceState.activeContainerKey !== undefined) {
        setIfChanged(`${base}/activeContainerKey`, surfaceState.activeContainerKey);
      }
      if (surfaceState.section !== undefined) {
        setIfChanged(`${base}/section`, surfaceState.section);
      }
      if (surfaceState.split) {
        setIfChanged(`${base}/split`, surfaceState.split);
      }
    }
  }

  function mirrorToCss(only?: SurfaceName): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    for (const [surface, surfaceState] of changedSurfaces(only)) {
      const slug = surface.replace(':', '-');
      if (surfaceState.size !== undefined) {
        root.style.setProperty(`--oo-${slug}-size`, `${surfaceState.size}px`);
      }
      root.style.setProperty(
        `--oo-${slug}-visible`,
        surfaceState.visible ? '1' : '0',
      );
    }
  }

  // Writing the layout means serialising all of it, so a caller that changes
  // something per animation frame would otherwise run a synchronous
  // JSON.stringify + localStorage write on the main thread at 60Hz. Coalesced,
  // the last value of a burst is the one that lands, which is the only one
  // anybody wanted saved.
  function scheduleSave(): void {
    if (!storage) return;
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      if (storage) void storage.save(state);
    }, SAVE_DEBOUNCE_MS);
  }

  function notify(opts?: { surface?: SurfaceName; transient?: boolean }): void {
    events.emit('scena:layout:changed', state);
    for (const fn of [...subscribers]) {
      try {
        fn(state);
      } catch (err) {
        console.error('[scena.layout] subscriber threw:', err);
      }
    }
    // The CSS variables move with the gesture: they are one write per changed
    // property on one element, and a shell that sizes from them rather than
    // from React state gets the frame for free.
    mirrorToCss(opts?.surface);
    // A frame of a drag is not a value anybody should be reading or storing.
    // The next settled call mirrors and persists whatever it ended on.
    if (opts?.transient === true) return;
    mirrorToStore(opts?.surface);
    scheduleSave();
  }

  mirrorToStore();
  mirrorToCss();

  if (storage) {
    void storage.load().then((loaded) => {
      if (loaded) {
        state = applyDeep(base(), loaded as DeepPartial<ScenaLayout>);
        notify();
      }
    });
  }

  return {
    get() {
      return state;
    },
    set(layout) {
      state = layout;
      notify();
    },
    patch(patch) {
      state = applyDeep(state, patch);
      notify();
    },
    setSurface(surface, surfaceState, opts) {
      const current = state.surfaces[surface] ?? { visible: false };
      state = {
        ...state,
        surfaces: {
          ...state.surfaces,
          [surface]: { ...current, ...surfaceState },
        },
      };
      notify({ surface, ...(opts?.transient === true ? { transient: true } : {}) });
    },
    subscribe(fn) {
      subscribers.add(fn);
      return disposableFrom(() => subscribers.delete(fn));
    },
    setStorage(s) {
      storage = s;
    },
  };
}

export function createLayoutRegistry(deps: { events: EventBus }): LayoutRegistry {
  const { events } = deps;
  const layouts = new Map<string, LayoutDefinition>();

  function announce(): void {
    events.emit('scena:registry:changed', { registry: 'layouts' });
  }

  return {
    register(layout) {
      layouts.set(layout.id, layout);
      announce();
      return disposableFrom(() => {
        if (layouts.get(layout.id) === layout) {
          layouts.delete(layout.id);
          announce();
        }
      });
    },
    unregister(id) {
      if (layouts.delete(id)) announce();
    },
    get(id) {
      return layouts.get(id);
    },
    list() {
      return [...layouts.values()];
    },
  };
}
