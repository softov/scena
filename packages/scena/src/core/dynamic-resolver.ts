import type {
  Action,
  BindingPath,
  DataBinding,
  DynamicBoolean,
  DynamicNumber,
  DynamicString,
  DynamicStringList,
  DynamicValue,
  FunctionCall,
  PropValue,
} from '../types/component-graph.js';
import {
  isAction,
  isDataBinding,
  isFunctionCall,
} from '../types/component-graph.js';
import type { CommandContext } from '../types/command.js';
import type { Scena } from '../types/scena.js';
import { readPath, writePath } from './path-resolver.js';

// Resolves a DynamicValue to its concrete value.
//   literal       → returned as-is
//   DataBinding   → store.get(joinAbsolute(dataCtx, path))
//   FunctionCall  → look up command, resolve args, invoke run() synchronously
export function resolveDynamicValue(
  value: PropValue,
  dataContext: BindingPath | undefined,
  scena: Scena,
): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (isDataBinding(value)) {
    return readPath(scena.store, dataContext, value.path);
  }
  if (isFunctionCall(value)) {
    return resolveFunctionCall(value, dataContext, scena);
  }
  return value;
}

function resolveArgs(
  args: Record<string, PropValue> | undefined,
  dataContext: BindingPath | undefined,
  scena: Scena,
): Record<string, unknown> {
  if (!args) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    out[k] = resolveDynamicValue(v, dataContext, scena);
  }
  return out;
}

function valueCallContext(scena: Scena): CommandContext {
  return {
    scena,
    store: scena.store,
    surfaces: scena.surfaces,
    commands: scena.commands,
    events: scena.events,
    source: 'graph',
  };
}

// Synchronous FunctionCall resolution — bypasses the async command bus so
// `{ call: 'required', args: {...} }` returns a value, not a Promise.
//
// The command bus (`scena.commands.executeFrom`) is for fire-and-forget
// dispatch (palette, menu, keybinding). FunctionCall as a DynamicValue source
// needs a real value back in the same render tick.
export function resolveFunctionCall(
  fc: FunctionCall,
  dataContext: BindingPath | undefined,
  scena: Scena,
): unknown {
  const cmd = scena.commands.get(fc.call);
  if (!cmd) {
    if (fc.callableFrom === 'clientOnly') {
      throw new Error(
        `FunctionCall "${fc.call}" callableFrom=clientOnly has no registered handler`,
      );
    }
    throw new Error(`FunctionCall "${fc.call}" not registered`);
  }
  if (!cmd.run) {
    throw new Error(
      `FunctionCall "${fc.call}" has no client run — remote-only commands ` +
        `cannot serve as DynamicValue sources`,
    );
  }
  const args = resolveArgs(fc.args, dataContext, scena);
  return cmd.run(valueCallContext(scena), args);
}

// Async dispatch — used by Action.functionCall (click handlers). Returns
// a Promise so awaitable side-effects work as expected.
function dispatchFunctionCall(
  fc: FunctionCall,
  dataContext: BindingPath | undefined,
  scena: Scena,
): Promise<unknown> {
  const args = resolveArgs(fc.args, dataContext, scena);
  return scena.commands.executeFrom('graph', fc.call, args);
}

function narrow<T>(
  value: unknown,
  predicate: (v: unknown) => v is T,
  expected: string,
): T {
  if (predicate(value)) return value;
  throw new Error(`Dynamic value type mismatch: expected ${expected}, got ${typeof value}`);
}

export function resolveDynamicString(
  v: DynamicString,
  dataContext: BindingPath | undefined,
  scena: Scena,
): string {
  if (typeof v === 'string') return v;
  const resolved = resolveDynamicValue(v as PropValue, dataContext, scena);
  return narrow(resolved, (x): x is string => typeof x === 'string', 'string');
}

export function resolveDynamicNumber(
  v: DynamicNumber,
  dataContext: BindingPath | undefined,
  scena: Scena,
): number {
  if (typeof v === 'number') return v;
  const resolved = resolveDynamicValue(v as PropValue, dataContext, scena);
  return narrow(resolved, (x): x is number => typeof x === 'number', 'number');
}

export function resolveDynamicBoolean(
  v: DynamicBoolean,
  dataContext: BindingPath | undefined,
  scena: Scena,
): boolean {
  if (typeof v === 'boolean') return v;
  const resolved = resolveDynamicValue(v as PropValue, dataContext, scena);
  return narrow(resolved, (x): x is boolean => typeof x === 'boolean', 'boolean');
}

export function resolveDynamicStringList(
  v: DynamicStringList,
  dataContext: BindingPath | undefined,
  scena: Scena,
): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v;
  const resolved = resolveDynamicValue(v as PropValue, dataContext, scena);
  return narrow(
    resolved,
    (x): x is string[] => Array.isArray(x) && x.every((y) => typeof y === 'string'),
    'string[]',
  );
}

// Returns a 0-arg async callable that performs the Action when invoked.
//   { event: { name, context, ... } }  → emits 'scena:action:event' on the bus
//   { functionCall: { call, args } }   → dispatches through the command bus
export function resolveAction(
  action: Action,
  dataContext: BindingPath | undefined,
  scena: Scena,
  mountKey: string | null,
): () => Promise<unknown> {
  if ('functionCall' in action) {
    const fc = action.functionCall;
    return () => dispatchFunctionCall(fc, dataContext, scena);
  }
  const ev = action.event;
  return async () => {
    const resolvedContext = ev.context
      ? Object.fromEntries(
          Object.entries(ev.context).map(([k, v]) => [
            k,
            resolveDynamicValue(v, dataContext, scena),
          ]),
        )
      : undefined;
    scena.events.emit('scena:action:event', {
      mountKey,
      name: ev.name,
      context: resolvedContext as Record<string, PropValue> | undefined,
      wantResponse: ev.wantResponse,
      responsePath: ev.responsePath,
    });
  };
}

// Write-back for bidirectional widgets. Accepts only DataBinding form;
// throws on FunctionCall, on `#/` indirection, and on wildcard paths.
export function writeDynamic(
  value: PropValue,
  dataContext: BindingPath | undefined,
  scena: Scena,
  next: unknown,
): void {
  if (!isDataBinding(value)) {
    if (isFunctionCall(value)) {
      throw new Error('writeDynamic: FunctionCall values are read-only');
    }
    if (isAction(value)) {
      throw new Error('writeDynamic: Action values are not writable');
    }
    throw new Error('writeDynamic: only DataBinding values are writable');
  }
  writePath(scena.store, dataContext, value.path, next);
}

export function isWritableDynamic(v: PropValue): v is DataBinding {
  return isDataBinding(v);
}

export type { DynamicValue };
