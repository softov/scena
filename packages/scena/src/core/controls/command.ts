import type { Disposable } from '../../sdk/disposable.js';
import type { EventBus } from '../../sdk/events.js';
import type { ReactiveStore, SocketBridge } from '../../sdk/reactive-store.js';
import type { MountSurfaceRegistry } from '../../sdk/mount-surface.js';
import type {
  Command,
  CommandContext,
  CommandListFilter,
  CommandRegistry,
  CommandSource,
  ExecuteOpts,
} from '../../sdk/command.js';
import type { WhenEngine } from '../../sdk/when.js';
import type { Scena } from '../../sdk/scena.js';
import type { KeybindingRegistry } from '../../sdk/keybinding.js';
import { disposableFrom } from '../../sdk/disposable.js';
import { validateArgs } from '../../sdk/args-schema.js';

interface Deps {
  events: EventBus;
  store: ReactiveStore;
  surfaces: MountSurfaceRegistry;
  when: WhenEngine;
  socket?: SocketBridge;
  keybindings: KeybindingRegistry;
  getScena: () => Scena;
}

export function createCommandRegistry(deps: Deps): CommandRegistry {
  const { events, store, surfaces, when, socket, keybindings, getScena } = deps;
  const commands = new Map<string, Command>();

  function announce(): void {
    events.emit('scena:registry:changed', { registry: 'commands' });
  }

  function dispatchModeOf(cmd: Command): 'client' | 'remote' | 'either' {
    if (cmd.dispatch) return cmd.dispatch;
    return cmd.run ? 'client' : 'remote';
  }

  function contextFor(source: CommandSource, opts?: ExecuteOpts): CommandContext {
    const scena = getScena();
    return {
      scena,
      store,
      surfaces,
      commands: scena.commands,
      events,
      source,
      dataContext: opts?.dataContext,
      host: opts?.host,
    };
  }

  async function runRemote(id: string, args: unknown): Promise<unknown> {
    if (!socket) {
      throw new Error(
        `Cannot execute remote command "${id}": no socket bridge configured. ` +
          `Pass a SocketBridge via createScena options or provide a local 'run' on the command.`,
      );
    }
    socket.emit('command:execute', { commandId: id, args: [args] });
    return undefined;
  }

  async function executeFrom(
    source: CommandSource,
    id: string,
    args?: unknown,
    opts?: Omit<ExecuteOpts, 'source'>,
  ): Promise<unknown> {
    const cmd = commands.get(id);
    if (!cmd) throw new Error(`Command "${id}" not registered`);
    // NOTE: cmd.when is intentionally NOT gated here. `when` filters menu
    // visibility (via commands.list({enabled:true})), not invocability. A
    // command shown as enabled and then becoming disabled mid-dispatch is
    // a logic error in the caller — the run() body is responsible for any
    // last-mile guard it actually needs.
    let normalizedArgs = args;
    if (cmd.args) {
      const result = validateArgs(cmd.args, args);
      if (!result.ok) {
        throw new Error(
          `Command "${id}" args invalid: ${result.errors.join('; ')}`,
        );
      }
      normalizedArgs = result.value;
    }
    const mode = dispatchModeOf(cmd);
    if (mode === 'remote') return runRemote(id, normalizedArgs);
    if (mode === 'either' && !cmd.run) return runRemote(id, normalizedArgs);
    if (!cmd.run) throw new Error(`Command "${id}" has no local 'run'`);
    return cmd.run(contextFor(source, { ...opts, source }), normalizedArgs);
  }

  // Title resolver for q matching — dynamic titles get a minimal stub ctx.
  function resolveTitle(cmd: Command): string {
    if (typeof cmd.title === 'string') return cmd.title;
    try {
      return cmd.title(contextFor('programmatic'));
    } catch {
      return cmd.id;
    }
  }

  function matchesQuery(cmd: Command, q: string): boolean {
    if (!q) return true;
    const needle = q.toLowerCase();
    if (cmd.id.toLowerCase().includes(needle)) return true;
    if (resolveTitle(cmd).toLowerCase().includes(needle)) return true;
    if (cmd.keywords?.some((k) => k.toLowerCase().includes(needle))) return true;
    const shortcuts = Array.isArray(cmd.shortcut)
      ? cmd.shortcut
      : cmd.shortcut !== undefined
        ? [cmd.shortcut]
        : [];
    if (shortcuts.some((s) => s.toLowerCase().includes(needle))) return true;
    return false;
  }

  function list(filter?: CommandListFilter): Command[] {
    let out = [...commands.values()];
    if (filter?.category) out = out.filter((c) => c.category === filter.category);
    if (filter?.slot) {
      const slots = Array.isArray(filter.slot) ? filter.slot : [filter.slot];
      // commands.values() iteration order is insertion order, so the array
      // is naturally deduplicated by id even when a command lists multiple
      // matching slots (no need to track seen ids here).
      out = out.filter((c) => c.slots?.some((s) => slots.includes(s)));
    }
    if (filter?.enabled !== undefined) {
      out = out.filter((c) => {
        const enabled = c.when === undefined || when.evaluate(c.when);
        return enabled === filter.enabled;
      });
    }
    if (filter?.q) {
      const q = filter.q;
      out = out.filter((c) => matchesQuery(c, q));
    }
    return out;
  }

  return {
    register<TArgs>(cmd: Command<TArgs>): Disposable {
      commands.set(cmd.id, cmd as Command);
      const kbDisposables: Disposable[] = [];
      if (cmd.keys !== undefined) {
        const keysList = Array.isArray(cmd.keys) ? cmd.keys : [cmd.keys];
        for (const keys of keysList) {
          kbDisposables.push(
            keybindings.register({ keys, commandId: cmd.id, when: cmd.when }),
          );
        }
      }
      announce();
      return disposableFrom(() => {
        if (commands.get(cmd.id) === (cmd as Command)) {
          commands.delete(cmd.id);
          for (const d of kbDisposables) d.dispose();
          announce();
        }
      });
    },
    unregister(id) {
      if (commands.delete(id)) announce();
    },
    get(id) {
      return commands.get(id);
    },
    list,
    listEnabled(filter) {
      return list({ ...filter, enabled: true });
    },
    execute(id, args, opts) {
      return executeFrom(opts?.source ?? 'programmatic', id, args, opts);
    },
    executeFrom,
  };
}
