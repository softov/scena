import type { EventBus } from '../types/events.js';
import type { BindingPath } from '../types/component-graph.js';
import type { ReactiveStore } from '../types/reactive-store.js';
import type { SurfaceName } from '../types/mount-surface.js';
import type {
  DeepPartial,
  LayoutAPI,
  LayoutDefinition,
  LayoutRegistry,
  LayoutStorage,
  ScenaLayout,
  SurfaceLayoutState,
} from '../types/layout.js';
import { disposableFrom } from '../core/disposable.js';

interface LayoutDeps {
  events: EventBus;
  store: ReactiveStore;
  initial?: ScenaLayout;
  storage?: LayoutStorage;
}

const DEFAULT_SURFACE_LAYOUTS: Partial<Record<SurfaceName, SurfaceLayoutState>> = {
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

function defaultLayout(): ScenaLayout {
  return { surfaces: { ...DEFAULT_SURFACE_LAYOUTS } };
}

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
  let state: ScenaLayout = deps.initial
    ? applyDeep(defaultLayout(), deps.initial as DeepPartial<ScenaLayout>)
    : defaultLayout();
  const subscribers = new Set<(layout: ScenaLayout) => void>();

  function mirrorToStore(): void {
    for (const [surface, surfaceState] of Object.entries(state.surfaces)) {
      if (!surfaceState) continue;
      const base = surfaceBase(surface);
      store.set(`${base}/visible` as BindingPath, surfaceState.visible);
      if (surfaceState.size !== undefined) {
        store.set(`${base}/size` as BindingPath, surfaceState.size);
      }
      if (surfaceState.layout !== undefined) {
        store.set(`${base}/layout` as BindingPath, surfaceState.layout);
      }
      if (surfaceState.activeContainerKey !== undefined) {
        store.set(
          `${base}/activeContainerKey` as BindingPath,
          surfaceState.activeContainerKey,
        );
      }
      if (surfaceState.section !== undefined) {
        store.set(`${base}/section` as BindingPath, surfaceState.section);
      }
      if (surfaceState.split) {
        store.set(`${base}/split` as BindingPath, surfaceState.split);
      }
    }
  }

  function mirrorToCss(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    for (const [surface, surfaceState] of Object.entries(state.surfaces)) {
      if (!surfaceState) continue;
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

  function notify(): void {
    events.emit('scena:layout:changed', state);
    for (const fn of [...subscribers]) {
      try {
        fn(state);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[scena.layout] subscriber threw:', err);
      }
    }
    mirrorToStore();
    mirrorToCss();
    if (storage) {
      void storage.save(state);
    }
  }

  mirrorToStore();
  mirrorToCss();

  if (storage) {
    void storage.load().then((loaded) => {
      if (loaded) {
        state = applyDeep(defaultLayout(), loaded as DeepPartial<ScenaLayout>);
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
    setSurface(surface, surfaceState) {
      const current = state.surfaces[surface] ?? { visible: false };
      state = {
        ...state,
        surfaces: {
          ...state.surfaces,
          [surface]: { ...current, ...surfaceState },
        },
      };
      notify();
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
