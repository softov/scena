import type { ComponentNode } from './component-graph.js';
import type { Disposable } from './disposable.js';

export type SchemaMatcher =
  | { header: string; value?: string }
  | ((input: unknown) => boolean);

export interface Converter {
  id: string;
  accepts: SchemaMatcher;
  translate(input: unknown): ComponentNode;
}

export interface ConverterRegistry {
  register(converter: Converter): Disposable;
  unregister(id: string): void;
  list(): Converter[];
  translate(input: unknown): ComponentNode;
}
