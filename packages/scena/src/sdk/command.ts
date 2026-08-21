import type { Disposable } from './disposable.js';
import type { WhenClause } from './when.js';
import type { EventBus } from './events.js';
import type { ReactiveStore } from './reactive-store.js';
import type { MountSurfaceRegistry } from './mount-surface.js';
import type { BindingPath } from './component-graph.js';
import type { Scena } from './scena.js';
import type { ResourceColor } from './colors.js';
import type { HostCtx } from './host.js';

export type CommandSource = 'palette' | 'menu' | 'keybinding' | 'graph' | 'programmatic';

export type ArgType =
  | 'string'
  | 'string?'
  | 'number'
  | 'number?'
  | 'boolean'
  | 'boolean?'
  | readonly string[];

export type ArgsSchema = Record<string, ArgType>;

export interface CommandContext {
  scena: Scena;
  store: ReactiveStore;
  surfaces: MountSurfaceRegistry;
  commands: CommandRegistry;
  events: EventBus;
  source: CommandSource;
  // Mount root for relative-path writes inside `run`. Set when invoked from a
  // picker that lives inside a mount (chat panel, etc.); commands write via
  // `joinAbsolute(ctx.dataContext, '/agent')` so two panels stay isolated.
  dataContext?: BindingPath;
  // Picker callbacks. Present when invoked via a picker; undefined for
  // keybinding / programmatic dispatch.
  host?: HostCtx;
}

export interface ExecuteOpts {
  source?: CommandSource;
  dataContext?: BindingPath;
  host?: HostCtx;
}

export interface Command<TArgs = unknown> {
  id: string;
  title: string | ((ctx?: CommandContext) => string);
  description?: string | ((ctx?: CommandContext) => string);
  category?: string;
  icon?: string;
  // One color per command, declared once. Three valid forms:
  //   'violet' (named), '37 99 235' (raw triplet), 'var(--my-token)' (var ref).
  // Per-slot overrides do NOT exist — color is identity, not presentation.
  color?: ResourceColor;
  keywords?: string[];
  // Typed trigger for input-style slots (chat /, @, ...). String or array of
  // aliases. Array's first entry is canonical (used by composer buttons that
  // converge with typing).
  shortcut?: string | string[];
  // Keyboard binding(s). Auto-registered with the keybindings registry on
  // commands.register() and torn down with the same disposable. Uses the
  // same syntax as keybindings.register({ keys }): 'ctrl+shift+p',
  // 'ctrl+k ctrl+t' for chords, array for multiple bindings.
  keys?: string | string[];
  // Open string tags this command publishes itself into. Examples:
  //   'chat:input/', 'chat:input@', 'tab:context', 'resource:context',
  //   'palette', 'titlebar:right', ...
  // Anyone can introduce a new slot tag — no central enum.
  slots?: string[];
  // Checkmark in pickers. Evaluated fresh on each list().
  active?: (ctx: CommandContext) => boolean;
  // Gray out in pickers. Evaluated fresh on each list().
  disabled?: (ctx: CommandContext) => boolean;
  // Gates both running AND listing. Evaluated by commands.list({enabled:true}).
  when?: WhenClause;
  // For input-style slots: on Enter, the typed text after the trigger becomes
  // args.query rather than triggering the keyword filter.
  acceptsQuery?: boolean;
  submenu?: () => Promise<Command[]>;
  args?: ArgsSchema;
  // 'client'  - run() executes locally (default when run is defined).
  // 'remote'  - sends command:execute over socket (default when run is absent).
  // 'either'  - run() locally if defined, else remote.
  dispatch?: 'client' | 'remote' | 'either';
  run?: (ctx: CommandContext, args?: TArgs) => unknown | Promise<unknown>;
}

export interface CommandListFilter {
  category?: string;
  enabled?: boolean;
  // Filter to commands whose `slots` includes ANY of these tags. Pass a
  // single string to keep the legacy single-slot behavior; pass an array
  // to union (e.g. ['tab:context', 'resource:context']). Results stay
  // deduplicated by command id.
  slot?: string | string[];
  // Substring/keyword match against shortcut, keywords, title, id.
  q?: string;
}

export interface CommandRegistry {
  register<TArgs>(cmd: Command<TArgs>): Disposable;
  unregister(id: string): void;
  get(id: string): Command | undefined;
  list(filter?: CommandListFilter): Command[];
  listEnabled(filter?: Omit<CommandListFilter, 'enabled'>): Command[];
  // execute(id, args?, opts?). `args` is the command's argument object (single
  // object, not spread). `opts` carries source / dataContext / host for picker
  // dispatch.
  execute(id: string, args?: unknown, opts?: ExecuteOpts): Promise<unknown>;
  executeFrom(
    source: CommandSource,
    id: string,
    args?: unknown,
    opts?: Omit<ExecuteOpts, 'source'>,
  ): Promise<unknown>;
}
