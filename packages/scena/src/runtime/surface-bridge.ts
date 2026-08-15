import type { Disposable } from '../types/disposable.js';
import type { BindingPath, ComponentNode } from '../types/component-graph.js';
import type { EventBus } from '../types/events.js';
import type {
  ReactiveStore,
  SocketBridge,
} from '../types/reactive-store.js';
import type {
  MountSurfaceRegistry,
  SurfaceName,
} from '../types/mount-surface.js';
import type { ConverterRegistry } from '../types/converter-registry.js';
import { combineDisposables } from '../core/disposable.js';

interface Deps {
  store: ReactiveStore;
  surfaces: MountSurfaceRegistry;
  converters: ConverterRegistry;
  socket: SocketBridge;
  events: EventBus;
  defaultSurface?: SurfaceName;
}

// Wires the socket bridge to scena's surface registry.
//
// Scena has no notion of "agent" — anyone (an agent, the user, a plugin, a
// remote peer) can emit a surface event. If a sender wants to namespace its
// surfaces, it does so by encoding scope into the surfaceId itself (e.g.
// `<agentId>:<localId>`, `<sessionId>:<formId>`). Scena treats surfaceId as
// an opaque key.
//
// Inbound events:
//   surface:open    → translate(payload) → store.set page + data → surfaces.open
//   surface:update  → either set one data path OR re-translate the page
//   surface:delete  → close mount + clear surface scope
//
// Outbound events:
//   surface:event   → emitted by the dynamic resolver when an Action of `event`
//                     form fires; the bridge forwards it to the socket so the
//                     originating sender can react.
//
// Path layout:
//   $/surfaces/<surfaceId>/page        — translated ComponentNode tree
//   $/surfaces/<surfaceId>/data/<key>  — mutable data model
//
// Mount key: `surface:<surfaceId>`.
export function createSurfaceBridge(deps: Deps): Disposable {
  const { store, surfaces, converters, socket, events } = deps;
  const defaultSurface = deps.defaultSurface ?? 'main';

  function surfaceBase(surfaceId: string): string {
    return `$/surfaces/${surfaceId}`;
  }

  function dataContextOf(surfaceId: string): `$/${string}` {
    return `${surfaceBase(surfaceId)}/data` as `$/${string}`;
  }

  function pagePath(surfaceId: string): `$/${string}` {
    return `${surfaceBase(surfaceId)}/page` as `$/${string}`;
  }

  function mountKey(surfaceId: string): string {
    return `surface:${surfaceId}`;
  }

  function parseMountKey(key: string): string | null {
    if (!key.startsWith('surface:')) return null;
    return key.slice('surface:'.length);
  }

  function writePageAndData(
    surfaceId: string,
    page: ComponentNode,
    dataModel?: Record<string, unknown>,
  ): void {
    const writes: Record<string, unknown> = {
      [pagePath(surfaceId)]: page,
    };
    for (const [k, v] of Object.entries(dataModel ?? {})) {
      writes[`${dataContextOf(surfaceId)}/${k}`] = v;
    }
    store.patchMany(writes);
  }

  const subs: Disposable[] = [
    socket.on('surface:open', (raw) => {
      const ev = raw as {
        surfaceId: string;
        schema?: string;
        preferredSurface?: SurfaceName;
        payload: {
          components: Record<string, unknown>;
          root: string;
          dataModel?: Record<string, unknown>;
        };
      };
      const schema = ev.schema ?? 'a2ui/v0.10';
      const page = converters.translate({
        schema,
        surfaceId: ev.surfaceId,
        payload: ev.payload,
      });
      writePageAndData(ev.surfaceId, page, ev.payload.dataModel);

      surfaces.open({
        surface: ev.preferredSurface ?? defaultSurface,
        key: mountKey(ev.surfaceId),
        resource: { path: pagePath(ev.surfaceId) },
        policy: { editable: false, transient: true },
        dataContext: dataContextOf(ev.surfaceId),
      });
    }),

    socket.on('surface:update', (raw) => {
      const ev = raw as {
        surfaceId: string;
        schema?: string;
        path?: string;
        value?: unknown;
        payload?: {
          components: Record<string, unknown>;
          root: string;
          dataModel?: Record<string, unknown>;
        };
      };

      if (ev.path !== undefined) {
        const segment = ev.path.startsWith('/') ? ev.path.slice(1) : ev.path;
        store.set(
          `${dataContextOf(ev.surfaceId)}/${segment}` as BindingPath,
          ev.value,
        );
        return;
      }
      if (ev.payload) {
        const page = converters.translate({
          schema: ev.schema ?? 'a2ui/v0.10',
          surfaceId: ev.surfaceId,
          payload: ev.payload,
        });
        writePageAndData(ev.surfaceId, page, ev.payload.dataModel);
      }
    }),

    socket.on('surface:delete', (raw) => {
      const ev = raw as { surfaceId: string };
      surfaces.close(mountKey(ev.surfaceId), { reason: 'surface-deleted' });
      const base = surfaceBase(ev.surfaceId);
      const internal = store as unknown as { _internalKeys?: () => string[] };
      const keys = internal._internalKeys?.() ?? [];
      for (const k of keys) {
        if (k === base || k.startsWith(`${base}/`)) {
          store.delete(k as BindingPath);
        }
      }
    }),

    events.on('scena:action:event', (ev) => {
      if (!ev.mountKey) return;
      const surfaceId = parseMountKey(ev.mountKey);
      if (!surfaceId) return;
      socket.emit('surface:event', {
        surfaceId,
        name: ev.name,
        context: ev.context,
        wantResponse: ev.wantResponse,
        responsePath: ev.responsePath,
      });
    }),
  ];

  return combineDisposables(...subs);
}
