import type { Disposable } from './disposable.js';
import type { BindingPath } from './component-graph.js';

export type ContextValue = unknown;

export type ContextSnapshot = Partial<Record<BindingPath, ContextValue>>;

export type WhenClause = string | ((ctx: ContextSnapshot) => boolean);

export interface WhenEngine {
  evaluate(clause: WhenClause, ctx?: ContextSnapshot): boolean;
  watch(clause: WhenClause, fn: (value: boolean) => void): Disposable;
  dependencies(clause: WhenClause): BindingPath[];
}
