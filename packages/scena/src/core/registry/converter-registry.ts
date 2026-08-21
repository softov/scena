import type { ComponentNode } from '../../sdk/component-graph.js';
import type {
  SchemaMatcher,
  Converter,
  ConverterRegistry,
} from '../../sdk/converter-registry.js';
import { disposableFrom } from '../../sdk/disposable.js';

export function createConverterRegistry(): ConverterRegistry {
  const converters = new Map<string, Converter>();

  function inputMatches(matcher: SchemaMatcher, input: unknown): boolean {
    if (typeof matcher === 'function') return matcher(input);
    if (!input || typeof input !== 'object') return false;
    const value = (input as Record<string, unknown>)[matcher.header];
    if (matcher.value === undefined) return value !== undefined;
    return value === matcher.value;
  }

  return {
    register(t) {
      converters.set(t.id, t);
      return disposableFrom(() => {
        if (converters.get(t.id) === t) converters.delete(t.id);
      });
    },
    unregister(id) {
      converters.delete(id);
    },
    list() {
      return [...converters.values()];
    },
    translate(input): ComponentNode {
      for (const t of converters.values()) {
        if (inputMatches(t.accepts, input)) {
          return t.translate(input);
        }
      }
      throw new Error('No registered converter accepts this input');
    },
  };
}
