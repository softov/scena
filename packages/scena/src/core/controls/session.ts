import type { Disposable } from '../../sdk/disposable.js';
import type { EventBus } from '../../sdk/events.js';
import type { ReactiveStore } from '../../sdk/reactive-store.js';
import type {
  MountHandle,
  MountSurfaceRegistry,
  SurfaceName,
} from '../../sdk/mount-surface.js';
import type {
  SessionAPI,
  SessionMount,
  SessionSnapshot,
  SessionStorage,
} from '../../sdk/session.js';
import type { ComponentRegistry } from '../../sdk/component-registry.js';
import { disposableFrom } from '../../sdk/disposable.js';

interface Deps {
  events: EventBus;
  store: ReactiveStore;
  surfaces: MountSurfaceRegistry;
  components: ComponentRegistry;
  storage?: SessionStorage;
}

const ALL_SURFACES: SurfaceName[] = [
  'titlebar',
  'activitybar',
  'sidebar:left',
  'sidebar:right',
  'main',
  'panel:bottom',
  'statusbar',
  'overlay',
  'detached',
];

export function createSessionAPI(deps: Deps): SessionAPI & {
  setStorage(s: SessionStorage | null): void;
} {
  const { events, surfaces, components } = deps;
  let storage: SessionStorage | null = deps.storage ?? null;
  let autoPersistTimer: ReturnType<typeof setTimeout> | null = null;
  let autoPersistSub: Disposable | null = null;

  function snapshot(): SessionSnapshot {
    const mounts: SessionMount[] = [];
    for (const surface of ALL_SURFACES) {
      for (const m of surfaces.listAt(surface)) {
        mounts.push({
          key: m.key,
          surface: m.surface,
          component: m.component,
          state: {},
          openedAt: m.openedAt,
        });
      }
    }
    return {
      version: 1,
      capturedAt: Date.now(),
      mounts,
      surfaces: {},
    };
  }

  async function restore(snap: SessionSnapshot): Promise<{
    restored: MountHandle[];
    skipped: SessionMount[];
  }> {
    const restored: MountHandle[] = [];
    const skipped: SessionMount[] = [];
    for (const sm of snap.mounts) {
      if (!components.get(sm.component.component)) {
        skipped.push(sm);
        events.emit('scena:session:skipped', {
          key: sm.key,
          surface: sm.surface,
          reason: `component "${sm.component.component}" not registered`,
        });
        continue;
      }
      restored.push(
        surfaces.open({
          surface: sm.surface,
          key: sm.key,
          resource: sm.component,
        }),
      );
    }
    return { restored, skipped };
  }

  async function save(): Promise<void> {
    if (!storage) return;
    await storage.save(snapshot());
  }

  function enableAutoPersist(opts?: { debounceMs?: number }): Disposable {
    const debounce = opts?.debounceMs ?? 1000;
    const schedule = (): void => {
      if (autoPersistTimer) clearTimeout(autoPersistTimer);
      autoPersistTimer = setTimeout(() => {
        autoPersistTimer = null;
        void save();
      }, debounce);
    };
    autoPersistSub?.dispose();
    autoPersistSub = events.on('scena:mount:opened', schedule);
    const closedSub = events.on('scena:mount:closed', schedule);
    return disposableFrom(() => {
      autoPersistSub?.dispose();
      closedSub.dispose();
      autoPersistSub = null;
      if (autoPersistTimer) clearTimeout(autoPersistTimer);
      autoPersistTimer = null;
    });
  }

  return {
    snapshot,
    restore,
    save,
    enableAutoPersist,
    setStorage(s) {
      storage = s;
    },
  };
}
