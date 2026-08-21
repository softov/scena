import type { Disposable } from '../../sdk/disposable.js';
import type {
  Action,
  BindingPath,
  DataBinding,
  FunctionCall,
  PropValue,
} from '../../sdk/component-graph.js';
import {
  isAction,
  isDataBinding,
  isFunctionCall,
} from '../../sdk/component-graph.js';
import type {
  BindingResolver,
  CompiledBinding,
} from '../../sdk/binding-resolver.js';
import type { ReactiveStore, ScopeName } from '../../sdk/reactive-store.js';
import { combineDisposables, disposableFrom } from '../../sdk/disposable.js';
import { parsePath } from './path-resolver.js';

interface Deps {
  store: ReactiveStore;
}

export function createBindingResolver(deps: Deps): BindingResolver {
  const { store } = deps;

  function compilePath(path: BindingPath): CompiledBinding {
    const parsed = parsePath(path);
    if (!parsed.absolute) {
      // Relative paths can't be compiled without a data context; consumers that
      // need them go through dynamic-resolver.readPath instead. Return a path
      // form with the literal segments so subscribers at least see the shape.
      return {
        kind: 'path',
        scope: '' as ScopeName,
        segments: parsed.segments,
        wildcard: parsed.segments.includes('*'),
        raw: path,
      };
    }
    const scope = (parsed.segments[0] ?? '') as ScopeName;
    return {
      kind: 'path',
      scope,
      segments: parsed.segments,
      wildcard: parsed.segments.includes('*'),
      raw: path,
    };
  }

  function compileFunctionCall(fc: FunctionCall): CompiledBinding {
    const argBindings: Record<string, CompiledBinding> = {};
    for (const [k, v] of Object.entries(fc.args ?? {})) {
      argBindings[k] = compile(v);
    }
    return {
      kind: 'functionCall',
      call: fc.call,
      argBindings,
      callableFrom: fc.callableFrom,
      returnType: fc.returnType,
    };
  }

  function compileAction(action: Action): CompiledBinding {
    if ('functionCall' in action) {
      return compileFunctionCall(action.functionCall);
    }
    const ev = action.event;
    const contextBindings = ev.context
      ? Object.fromEntries(
          Object.entries(ev.context).map(([k, v]) => [k, compile(v)]),
        )
      : undefined;
    return {
      kind: 'event',
      name: ev.name,
      contextBindings,
      wantResponse: ev.wantResponse,
      responsePath: ev.responsePath,
    };
  }

  function compile(prop: PropValue): CompiledBinding {
    if (prop === null || typeof prop !== 'object') {
      return { kind: 'literal', value: prop };
    }
    if (isDataBinding(prop)) {
      return compilePath((prop as DataBinding).path);
    }
    if (isFunctionCall(prop)) {
      return compileFunctionCall(prop as FunctionCall);
    }
    if (isAction(prop)) {
      return compileAction(prop as Action);
    }
    return { kind: 'literal', value: prop };
  }

  function resolve(binding: CompiledBinding): unknown {
    switch (binding.kind) {
      case 'literal':
        return binding.value;
      case 'path':
        if (binding.wildcard) return {};
        return store.get(binding.raw);
      case 'functionCall':
      case 'event':
        // Handlers; resolved by dynamic-resolver at click time.
        return binding;
    }
  }

  function watch(
    binding: CompiledBinding,
    fn: (value: unknown) => void,
  ): Disposable {
    switch (binding.kind) {
      case 'literal':
        return disposableFrom(() => {});
      case 'path':
        return store.subscribe(binding.raw, fn);
      case 'functionCall': {
        const subs = Object.values(binding.argBindings).map((b) =>
          watch(b, () => fn(binding)),
        );
        return combineDisposables(...subs);
      }
      case 'event': {
        if (!binding.contextBindings) return disposableFrom(() => {});
        const subs = Object.values(binding.contextBindings).map((b) =>
          watch(b, () => fn(binding)),
        );
        return combineDisposables(...subs);
      }
    }
  }

  return { compile, watch, resolve };
}
