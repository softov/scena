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

/**
 * What each command takes, keyed by the command's id.
 *
 * Empty here, and deliberately so: scena registers no commands of its own, and
 * a list written in this file could not know what an app added. Whoever
 * registers a command augments this instead -
 *
 *   declare module '@softov/scena/sdk' {
 *     interface CommandArgs {
 *       'sessions.open': { uri?: string; host?: string };
 *     }
 *   }
 *
 * - and from then on `execute` and `run` are checked against the declaration
 * rather than against `unknown`. An id nobody has declared keeps the untyped
 * overload and behaves exactly as it did, so this costs nothing to ignore.
 *
 * The declaration exists because `execute(id, args?: unknown)` puts the caller
 * and the handler in different files with nothing between them: a call sending
 * `hostId` to a handler reading `host` compiled, ran, and silently did
 * nothing.
 */
// Empty by design - it is a merge target, and every augmentation adds a key.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CommandArgs {}

/** The ids somebody has declared arguments for. `never` until one is. */
export type KnownCommand = keyof CommandArgs & string;

/**
 * `[args?]` when every declared argument is optional, `[args]` when one is not.
 *
 * A command whose arguments are all optional is callable with none - which is
 * the ordinary case, since most read their fallback from the store - and one
 * that needs an argument should not compile without it.
 */
export type CommandArgsFor<K extends KnownCommand> =
  // `{} extends T` is the test for "every property is optional": only a type
  // with nothing required is satisfied by an object literal with nothing in it.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {} extends CommandArgs[K] ? [args?: CommandArgs[K]] : [args: CommandArgs[K]];

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
  // A declared id types its own `run` handler, so `args` arrives as the
  // declaration rather than as `unknown` and the handler needs no cast. An
  // undeclared one takes the second overload and is what it always was.
  register<K extends KnownCommand>(cmd: Command<CommandArgs[K]> & { id: K }): Disposable;
  register<TArgs>(cmd: Command<TArgs>): Disposable;
  unregister(id: string): void;
  get(id: string): Command | undefined;
  list(filter?: CommandListFilter): Command[];
  listEnabled(filter?: Omit<CommandListFilter, 'enabled'>): Command[];
  // execute(id, args?, opts?). `args` is the command's argument object (single
  // object, not spread). `opts` carries source / dataContext / host for picker
  // dispatch.
  //
  // One signature, branching on whether the id was declared - not two
  // overloads. Overloads would be worse than nothing here: a call that failed
  // the declared signature would simply fall through to the untyped one and
  // compile anyway, which is the exact silence this is meant to break.
  //
  // A declared id checks its argument object against the declaration. That
  // type has no index signature, so an object literal gets excess-property
  // checking and a misspelled key is an error rather than a value nobody
  // reads. An undeclared id resolves to `[args?: unknown, ...]`, which is
  // what the signature has always been.
  execute<K extends string>(
    id: K,
    ...rest: K extends KnownCommand
      ? [...CommandArgsFor<K>, opts?: ExecuteOpts]
      : [args?: unknown, opts?: ExecuteOpts]
  ): Promise<unknown>;
  executeFrom<K extends string>(
    source: CommandSource,
    id: K,
    ...rest: K extends KnownCommand
      ? [...CommandArgsFor<K>, opts?: Omit<ExecuteOpts, 'source'>]
      : [args?: unknown, opts?: Omit<ExecuteOpts, 'source'>]
  ): Promise<unknown>;
}
