import type { Disposable } from '../../sdk/disposable.js';
import type { ComponentNode } from '../../sdk/component-graph.js';
import { isDataBinding } from '../../sdk/component-graph.js';
import type { EventBus } from '../../sdk/events.js';
import type {
  MountDeclaration,
  MountDisplay,
  MountHandle,
  MountPolicy,
  MountSurfaceRegistry,
  MountTarget,
  OpenResourceArgs,
  ResolvedMount,
  SurfaceName,
} from '../../sdk/mount-surface.js';
import type { ComponentRegistry } from '../../sdk/component-registry.js';
import type { WhenEngine } from '../../sdk/when.js';
import type { BindingResolver } from '../../sdk/binding-resolver.js';
import type { ReactiveStore } from '../../sdk/reactive-store.js';
import { combineDisposables, disposableFrom } from '../../sdk/disposable.js';
import { clearMountLocal } from '../store/reactive-store.js';

interface Deps {
  events: EventBus;
  when: WhenEngine;
  bindings: BindingResolver;
  store: ReactiveStore;
  components: ComponentRegistry;
}

interface InternalMount extends ResolvedMount {
  decl?: MountDeclaration;
  targetSub?: Disposable;
}

const MISSING_NODE: ComponentNode = {
  component: 'MissingComponent',
  reason: 'unbound',
};

export function createMountSurfaceRegistry(deps: Deps): MountSurfaceRegistry {
  const { events, when, store, components } = deps;
  const mountsByKey = new Map<string, InternalMount>();
  const visibleByKey = new Set<string>();

  function resolveTarget(t: MountTarget): ComponentNode {
    if (isDataBinding(t)) {
      const value = store.get(t.path);
      if (!value || typeof value !== 'object' || !('component' in (value as object))) {
        return MISSING_NODE;
      }
      return value as ComponentNode;
    }
    return t;
  }

  function attachTargetSub(internal: InternalMount, target: MountTarget): void {
    if (!isDataBinding(target)) return;
    internal.targetSub?.dispose();
    internal.targetSub = store.subscribe(target.path, () => {
      internal.component = resolveTarget(target);
      if (visibleByKey.has(internal.key)) {
        events.emit('scena:mount:opened', {
          key: internal.key,
          surface: internal.surface,
          component: internal.component,
        });
      }
    });
  }

  function setVisible(key: string, mount: InternalMount, next: boolean): void {
    const was = visibleByKey.has(key);
    if (next === was) return;
    if (next) {
      visibleByKey.add(key);
      events.emit('scena:mount:opened', {
        key,
        surface: mount.surface,
        component: mount.component,
      });
    } else {
      visibleByKey.delete(key);
      events.emit('scena:mount:closed', { key });
    }
  }

  function mount(decl: MountDeclaration): Disposable {
    const internal: InternalMount = {
      key: decl.key,
      surface: decl.surface,
      component: resolveTarget(decl.resource),
      props: decl.props,
      policy: decl.policy ?? {},
      dataContext: decl.dataContext,
      openedAt: Date.now(),
      decl,
    };
    mountsByKey.set(decl.key, internal);
    attachTargetSub(internal, decl.resource);

    let whenSub: Disposable | undefined;
    if (decl.when !== undefined) {
      whenSub = when.watch(decl.when, (visible) => setVisible(decl.key, internal, visible));
    } else {
      setVisible(decl.key, internal, true);
    }

    return combineDisposables(
      whenSub,
      disposableFrom(() => {
        if (mountsByKey.get(decl.key) === internal) {
          internal.targetSub?.dispose();
          if (visibleByKey.has(decl.key)) setVisible(decl.key, internal, false);
          mountsByKey.delete(decl.key);
          clearMountLocal(store, decl.key);
        }
      }),
    );
  }

  function open(opts: {
    surface: SurfaceName;
    key: string;
    resource: MountTarget;
    props?: MountDisplay;
    policy?: MountPolicy;
    dataContext?: `$/${string}`;
  }): MountHandle {
    const existing = mountsByKey.get(opts.key);
    if (existing) {
      existing.surface = opts.surface;
      existing.policy = opts.policy ?? existing.policy;
      existing.dataContext = opts.dataContext ?? existing.dataContext;
      // Re-opening an existing mount with a fresh display overrides;
      // otherwise we keep what was there so silent re-opens (e.g. focus)
      // don't drop the title.
      if (opts.props) existing.props = opts.props;
      existing.targetSub?.dispose();
      existing.component = resolveTarget(opts.resource);
      attachTargetSub(existing, opts.resource);
      if (!visibleByKey.has(opts.key)) setVisible(opts.key, existing, true);
      focus(opts.key);
    } else {
      const internal: InternalMount = {
        key: opts.key,
        surface: opts.surface,
        component: resolveTarget(opts.resource),
        props: opts.props,
        policy: opts.policy ?? {},
        dataContext: opts.dataContext,
        openedAt: Date.now(),
      };
      mountsByKey.set(opts.key, internal);
      attachTargetSub(internal, opts.resource);
      setVisible(opts.key, internal, true);
      focus(opts.key);
    }
    return {
      key: opts.key,
      surface: opts.surface,
      close: (closeOpts) => close(opts.key, closeOpts),
      focus: () => focus(opts.key),
    };
  }

  function openResource(kind?: string, args?: OpenResourceArgs) {
    if (!kind) return null;
    const id = args?.resourceId ?? store.get('$/resource/id');
    const argsOpts = {
      ...args?.options,
    };
    const extraProps = args?.extraProps ?? {};
    if (!id) return null;
    const def = components.findOpeners(kind)[0];
    if (!def) return null;
    store.patchMany({
      '$/resource/kind': kind,
      '$/resource/id': id,
      '$/active/kind': kind,
      '$/active/id': id,
    });
    const key = argsOpts?.mountKey ?? `${kind}:${id}`;
    // Data context = the record root (`$/<namespace>/byId/<id>`), built from the
    // declared namespace. With it set, `opens.title` and the mounted component's
    // bindings can be RELATIVE (`{ path: '/name' }`) and resolve against this
    // record — every open path (row-click, the generic resource.open command,
    // cross-links) gets the record-name title from one declaration, no per-id
    // string interpolation.
    const ns = def.opens?.namespace;
    const dataContext = ns ? (`$/${ns}/byId/${String(id)}` as `$/${string}`) : argsOpts?.dataContext;
    return open({
      surface: argsOpts?.surface ?? def.opens?.preferredSurface ?? 'main',
      key,
      dataContext,
      resource: { component: def.component, resourceId: id, ...extraProps },
      props: {
        title: argsOpts?.title ?? def.opens?.title,
        icon: def.opens?.icon,
        color: def.opens?.color,
      },
    });
  }

  function close(key: string, opts?: { reason?: string }): void {
    const mount = mountsByKey.get(key);
    if (!mount) return;
    mount.targetSub?.dispose();
    if (visibleByKey.has(key)) {
      visibleByKey.delete(key);
      events.emit('scena:mount:closed', { key, reason: opts?.reason });
    }
    mountsByKey.delete(key);
    clearMountLocal(store, key);
  }

  function focus(key: string): void {
    const m = mountsByKey.get(key);
    if (!m) return;
    events.emit('scena:mount:focused', { key, surface: m.surface });
  }

  // Which surfaces currently hold a visible mount.
  //
  // Anything that needs to sweep every surface has to ask, rather than iterate
  // a list of names it was compiled with: a surface is whatever an app mounts
  // to, so a hardcoded list silently skips the ones it has not heard of. The
  // session snapshot used to do exactly that.
  //
  // Ordered by first mount, so a caller sweeping surfaces is deterministic.
  function listSurfaces(): SurfaceName[] {
    const seen = new Set<SurfaceName>();
    const out: SurfaceName[] = [];
    for (const m of [...mountsByKey.values()].sort((a, b) => a.openedAt - b.openedAt)) {
      if (!visibleByKey.has(m.key) || seen.has(m.surface)) continue;
      seen.add(m.surface);
      out.push(m.surface);
    }
    return out;
  }

  function listAt(surface: SurfaceName): ResolvedMount[] {
    const out: ResolvedMount[] = [];
    for (const m of mountsByKey.values()) {
      if (m.surface === surface && visibleByKey.has(m.key)) {
        const { decl: _decl, targetSub: _targetSub, ...resolved } = m;
        void _decl;
        void _targetSub;
        out.push(resolved);
      }
    }
    return out.sort((a, b) => a.openedAt - b.openedAt);
  }

  function move(opts: { key: string; toSurface: SurfaceName; fromSurface?: SurfaceName }): void {
    const m = mountsByKey.get(opts.key);
    if (!m) return;
    if (opts.fromSurface && m.surface !== opts.fromSurface) return;
    if (m.surface === opts.toSurface) return;
    const prev = m.surface;
    m.surface = opts.toSurface;
    if (visibleByKey.has(opts.key)) {
      events.emit('scena:mount:closed', { key: opts.key, reason: `move:from:${prev}` });
      events.emit('scena:mount:opened', {
        key: opts.key,
        surface: opts.toSurface,
        component: m.component,
      });
    }
  }

  return { mount, open, openResource, close, focus, listAt, listSurfaces, move };
}
