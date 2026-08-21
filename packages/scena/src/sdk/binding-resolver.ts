import type { Disposable } from './disposable.js';
import type { BindingPath, PropValue } from './component-graph.js';
import type { ScopeName } from './reactive-store.js';

// Compiled form of a single PropValue. The resolver compiles once at attach time,
// then `resolve` (sync read) and `watch` (subscription) operate on the compiled form.
export type CompiledBinding =
  | { kind: 'literal'; value: unknown }
  | { kind: 'path'; scope: ScopeName; segments: string[]; wildcard: boolean; raw: BindingPath }
  | {
      kind: 'functionCall';
      call: string;
      argBindings: Record<string, CompiledBinding>;
      callableFrom?: 'clientOnly';
      returnType?: string;
    }
  | {
      kind: 'event';
      name: string;
      contextBindings?: Record<string, CompiledBinding>;
      wantResponse?: boolean;
      responsePath?: BindingPath;
    };

export interface BindingResolver {
  compile(prop: PropValue): CompiledBinding;
  watch(binding: CompiledBinding, fn: (value: unknown) => void): Disposable;
  resolve(binding: CompiledBinding): unknown;
}
