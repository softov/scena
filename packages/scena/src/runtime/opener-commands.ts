import type { Scena } from '../sdk/scena.js';
import type { Disposable } from '../sdk/disposable.js';
import type { CommandContext } from '../sdk/command.js';
import type { ComponentDefinition } from '../sdk/component-registry.js';
import type { BindingPath } from '../sdk/component-graph.js';
import type { SurfaceName } from '../sdk/mount-surface.js';
import { disposableFrom } from '../sdk/disposable.js';
import { resolveLabel } from '../sdk/label.js';
import { translate } from '../core/i18n/registry.js';

// Generate slot-driven `openWith.*` commands from the components registered
// as openers for a given resource kind. One command per viewer; they appear
// inline in the right-click menu (and any other slot the caller chooses)
// grouped under a single `Open with` section header, gated by the kind +
// the viewer's own opens.selector.
//
// The set is REACTIVE: subscribes to `scena:registry:changed` events for
// the components registry and re-syncs (registers commands for new
// viewers, disposes commands for departed viewers). Plugins / runtime
// `components.register(...)` calls surface in already-open menus on the
// next render — ActionList also subscribes to the commands-changed event
// the new registrations emit.

export interface RegisterOpenerCommandsOptions {
  // Resource kind to enumerate (e.g. 'explorer-file', 'chat', 'channel').
  resourceKind: string;
  // Slots the openWith items appear in. Defaults to ['file:context'] for
  // backwards compatibility with the file-explorer use case.
  slots?: string[];
  // Category label so the items cluster together in the picker.
  // Defaults to 'Open with'.
  category?: string;
  // Prefix for generated command ids. Default: `openWith.${resourceKind}`.
  commandIdPrefix?: string;
  // Surface to open viewers on. Defaults to 'main'.
  surface?: SurfaceName;
  // Build the mount key from (resourceId, viewerComponent). Default:
  // `${resourceKind}:${viewerComponent}:${resourceId}` so the same resource
  // can be open under multiple viewers simultaneously.
  mountKey?: (resourceId: string, viewerComponent: string) => string;
  // Build the viewer's props from the resource id. Default `{ path: id }`
  // matches the file-viewer signature; chat/channel viewers should
  // override (e.g. `{ chatId: id }` or `{ channelId: id }`).
  resourceProps?: (resourceId: string) => Record<string, unknown>;
  // Build the tab/section display name from the resource id. Defaults to
  // the id itself — for file paths a consumer typically passes a basename
  // helper. Icon + color default to the viewer's `opens.icon` /
  // `opens.color`.
  resourceTitle?: (resourceId: string) => string;
  // Optional callback after a viewer opens — useful for event logging.
  onOpen?: (ctx: CommandContext, viewer: ComponentDefinition, resourceId: string) => void;
}

export function registerOpenerCommands(
  scena: Scena,
  opts: RegisterOpenerCommandsOptions,
): Disposable {
  const slots = opts.slots ?? ['file:context'];
  const category = opts.category ?? 'Open with';
  const surface = opts.surface ?? 'main';
  const mountKey = opts.mountKey ?? ((id, comp) => `${opts.resourceKind}:${comp}:${id}`);
  const commandIdPrefix = opts.commandIdPrefix ?? `openWith.${opts.resourceKind}`;
  const resourceProps = opts.resourceProps ?? ((id: string) => ({ path: id }));
  const resourceTitle = opts.resourceTitle ?? ((id: string) => id);

  const kindGuard = `$/resource/kind == "${opts.resourceKind}"`;

  // viewer component id → disposable of its generated command. Used both
  // to dispose departed viewers' commands and to skip re-registering ones
  // that are still around on resync.
  const active = new Map<string, Disposable>();

  function registerFor(def: ComponentDefinition): void {
    // ComponentOpensSpec.selector is a WhenClause (`/...` paths). The when
    // engine reads `$/...` paths, so we rewrite the leading `/` to `$/` if
    // the caller didn't already use the absolute form. A prior version
    // also rewrote later embedded paths but accidentally double-prefixed
    // the leading `$/` to `$$/`, which the when parser couldn't resolve —
    // breaking single-path selectors like `/resource/ext == "md"`.
    const sel = def.opens?.selector;
    const selWhen =
      typeof sel === 'string' ? (sel.startsWith('$/') ? sel : sel.replace(/^\//, '$/')) : null;
    const when = selWhen ? `${kindGuard} && ${selWhen}` : kindGuard;

    const sub = scena.commands.register({
      id: `${commandIdPrefix}.${def.component}`,
      title:
        resolveLabel(def.opens?.title ?? def.component, {
          get: (path) => {
            // Expose the resource's properties for label resolution (e.g.
            // `{ path }` bindings in the title can read `$/resource/path`).
            if (path.startsWith('$/')) return scena.store.get(path as BindingPath);
            return undefined;
          },
          translate: (key) => translate(key),
        }) ?? def.component,
      icon: def.opens?.icon,
      color: def.opens?.color,
      category,
      slots,
      when,
      run: (ctx) => {
        const id = ctx.store.get<string>('$/resource/id');
        if (!id) return;
        ctx.scena.surfaces.open({
          surface,
          key: mountKey(id, def.component),
          resource: { component: def.component, ...resourceProps(id) },
          // Tab/section header gets the resource's display name + the
          // viewer's own icon/color so e.g. a Markdown-opened .md file
          // tab shows the filename in violet with the memo glyph.
          props: {
            title: resourceTitle(id),
            icon: def.opens?.icon,
            color: def.opens?.color,
          },
        });
        opts.onOpen?.(ctx, def, id);
        ctx.host?.closeMenu();
      },
    });
    active.set(def.component, sub);
  }

  function sync(): void {
    const present = new Set<string>();
    for (const def of scena.components.findOpeners(opts.resourceKind)) {
      present.add(def.component);
      if (active.has(def.component)) continue; // already registered
      registerFor(def);
    }
    // Dispose commands for viewers no longer present.
    for (const [comp, sub] of active) {
      if (present.has(comp)) continue;
      sub.dispose();
      active.delete(comp);
    }
  }

  // Initial pass, then subscribe to component-registry changes.
  sync();
  const sub = scena.events.on('scena:registry:changed', (payload) => {
    if ((payload as { registry: string }).registry !== 'components') return;
    sync();
  });

  return disposableFrom(() => {
    sub.dispose();
    for (const s of active.values()) s.dispose();
    active.clear();
  });
}
