import type { Disposable } from '../../sdk/disposable.js';
import type { EventBus } from '../../sdk/events.js';
import type { ReactiveStore } from '../../sdk/reactive-store.js';
import type { ComponentRegistry } from '../../sdk/component-registry.js';
import type { CommandRegistry } from '../../sdk/command.js';
import type { KeybindingRegistry } from '../../sdk/keybinding.js';
import type { MountSurfaceRegistry } from '../../sdk/mount-surface.js';
import type { ConverterRegistry } from '../../sdk/converter-registry.js';
import type { PermissionEngine } from '../../sdk/permissions.js';
import type {
  ManifestAPI,
  ManifestComponent,
  ManifestLoader,
  RuntimeManifestJSON,
  ScenaManifest,
  ScenaManifestSource,
} from '../../sdk/manifest.js';
import { combineDisposables, disposableFrom } from '../../sdk/disposable.js';
import { isPermissionPath } from '../../sdk/args-schema.js';

interface Deps {
  events: EventBus;
  store: ReactiveStore;
  components: ComponentRegistry;
  commands: CommandRegistry;
  keybindings: KeybindingRegistry;
  surfaces: MountSurfaceRegistry;
  converters: ConverterRegistry;
  permissions: PermissionEngine;
}

// Validates an AuthorManifest. Returns a list of errors; empty = ok.
//   - plugin component names must be `<slug>.<TypeName>`
//   - plugin command ids must be `<slug>.<...>`
//   - permission read/write paths must use `$/scope/...` syntax
function validateManifest(manifest: ScenaManifest): string[] {
  const errors: string[] = [];
  const slug = manifest.source.id;
  const c = manifest.contributes;

  for (const comp of c?.components ?? []) {
    if (!comp.component.includes('.')) {
      errors.push(
        `component "${comp.component}": plugin component names must be namespaced ` +
          `(expected "${slug}.${comp.component}")`,
      );
    } else if (!comp.component.startsWith(`${slug}.`)) {
      errors.push(
        `component "${comp.component}": namespace must match plugin slug "${slug}"`,
      );
    }
  }

  for (const cmd of c?.commands ?? []) {
    if (!cmd.id.startsWith(`${slug}.`)) {
      errors.push(
        `command "${cmd.id}": id must be prefixed with plugin slug "${slug}"`,
      );
    }
  }

  for (const p of manifest.permissions?.read ?? []) {
    if (!isPermissionPath(p)) {
      errors.push(`permissions.read "${p}": not a valid path (expected "$/scope/...")`);
    }
  }
  for (const p of manifest.permissions?.write ?? []) {
    if (!isPermissionPath(p)) {
      errors.push(`permissions.write "${p}": not a valid path`);
    }
  }

  return errors;
}

export function createManifestAPI(deps: Deps): ManifestAPI {
  const loaded = new Map<string, { source: ScenaManifestSource; dispose: Disposable }>();

  async function load(
    manifest: ScenaManifest,
    _loader: ManifestLoader,
  ): Promise<Disposable> {
    const sourceId = manifest.source.id;
    if (loaded.has(sourceId)) {
      throw new Error(`Manifest "${sourceId}" already loaded`);
    }

    const errors = validateManifest(manifest);
    if (errors.length > 0) {
      throw new Error(
        `Manifest "${sourceId}" rejected:\n  - ${errors.join('\n  - ')}`,
      );
    }

    if (manifest.permissions) {
      deps.permissions.grant(sourceId, manifest.permissions);
    }

    const subs: Disposable[] = [];
    const c = manifest.contributes;
    const allowedSurfaces = manifest.permissions?.surfaces;

    if (c) {
      for (const def of c.components ?? []) subs.push(deps.components.register(def));
      for (const t of c.converters ?? []) subs.push(deps.converters.register(t));
      for (const dp of c.dataProviders ?? []) subs.push(deps.store.registerDataProvider(dp));
      for (const cp of c.computedPaths ?? []) subs.push(deps.store.computed(cp.path, cp.def));

      for (const cmd of c.commands ?? []) {
        subs.push(
          deps.commands.register({
            id: cmd.id,
            title: cmd.title,
            category: cmd.category,
            icon: cmd.icon,
            keywords: cmd.keywords,
            slots: cmd.slots,
            args: cmd.args,
            dispatch: cmd.dispatch,
            run: undefined,
          }),
        );
      }

      for (const kb of c.keybindings ?? []) {
        subs.push(
          deps.keybindings.register({
            keys: kb.keys,
            commandId: kb.commandId,
            args: kb.args,
            when: kb.when,
            scope: kb.scope,
          }),
        );
      }

      for (const ck of c.contextKeys ?? []) {
        deps.store.set(ck.key, ck.value);
      }

      for (const view of c.views ?? []) {
        if (allowedSurfaces && !allowedSurfaces.includes(view.surface)) {
          deps.events.emit('scena:permission:denied', {
            sourceId,
            kind: 'surface',
            path: view.surface,
          });
          continue;
        }
        const component =
          typeof view.component === 'string'
            ? {
                component: 'MissingComponent',
                reason: 'graph-module-not-resolved',
              }
            : view.component;
        subs.push(
          deps.surfaces.mount({
            surface: view.surface,
            key: view.key,
            when: view.when,
            resource: component,
            policy: view.policy,
          }),
        );
      }
    }

    const dispose = combineDisposables(
      ...subs,
      disposableFrom(() => {
        deps.permissions.revoke(sourceId);
        loaded.delete(sourceId);
        deps.events.emit('scena:plugin:unloaded', { sourceId });
      }),
    );
    loaded.set(sourceId, { source: manifest.source, dispose });
    deps.events.emit('scena:plugin:contributed', {
      sourceId,
      version: manifest.source.version,
    });
    return dispose;
  }

  // Bridges RuntimeManifestJSON → AuthorManifest by lifting module specifiers
  // into lazy loader.resolve() calls, then delegates to load().
  async function loadRuntime(
    manifest: RuntimeManifestJSON,
    loader: ManifestLoader,
  ): Promise<Disposable> {
    const c = manifest.contributes;
    const components: ManifestComponent[] = (c?.components ?? []).map((rc) => {
      if (rc.renderer.kind === 'template') {
        return {
          component: rc.component,
          category: rc.category,
          propsSchema: rc.propsSchema,
          fallback: rc.fallback,
          renderer: { kind: 'template', template: rc.renderer.template },
        };
      }
      if (rc.renderer.kind === 'react') {
        const moduleSpec = rc.renderer.module;
        return {
          component: rc.component,
          category: rc.category,
          propsSchema: rc.propsSchema,
          fallback: rc.fallback,
          renderer: {
            kind: 'react',
            load: async () => {
              const mod = await loader.resolve(moduleSpec, manifest.source);
              return mod as { default: unknown };
            },
          },
        };
      }
      const moduleSpec = rc.renderer.module;
      return {
        component: rc.component,
        category: rc.category,
        propsSchema: rc.propsSchema,
        fallback: rc.fallback,
        renderer: {
          kind: 'html',
          mount: (host, props) => {
            let disposed = false;
            let inner: Disposable | null = null;
            void loader.resolve(moduleSpec, manifest.source).then((mod) => {
              if (disposed) return;
              const fn =
                (mod as { default?: unknown }).default ??
                (mod as unknown);
              const result = (fn as (host: HTMLElement, props: unknown) => Disposable)(
                host,
                props,
              );
              inner = result ?? null;
            });
            return disposableFrom(() => {
              disposed = true;
              inner?.dispose();
            });
          },
        },
      };
    });

    const bridged: ScenaManifest = {
      source: manifest.source,
      requires: manifest.requires,
      engine: manifest.engine,
      permissions: manifest.permissions,
      contributes: c
        ? {
            components,
            commands: c.commands?.map((cmd) => ({
              id: cmd.id,
              title: cmd.title,
              category: cmd.category,
              icon: cmd.icon,
              keywords: cmd.keywords,
              slots: cmd.slots,
              when: cmd.when,
              args: cmd.args,
              dispatch: cmd.dispatch,
              run: cmd.run,
            })),
            keybindings: c.keybindings,
            contextKeys: c.contextKeys,
            views: c.views,
          }
        : undefined,
    };

    return load(bridged, loader);
  }

  return {
    load,
    loadRuntime,
    unload(sourceId) {
      loaded.get(sourceId)?.dispose.dispose();
    },
    listSources() {
      return [...loaded.values()].map((e) => e.source);
    },
  };
}
