import type { Disposable } from './disposable.js';
import type { BindingPath } from './component-graph.js';

export type ScopeName =
  | 'local'
  | 'page'
  | 'workspace'
  | 'global'
  | 'summary'
  | 'active'
  | 'ui'
  | 'layout'
  | `plugins.${string}`
  | (string & {});

export type ComputedDefinition =
  | { from: BindingPath[]; select: string }
  | { from: BindingPath[]; select: (values: Record<string, unknown>) => unknown };

export interface SocketBridge {
  on(event: string, fn: (payload: unknown) => void): Disposable;
  off(event: string, fn: (payload: unknown) => void): void;
  offAll(events: string[]): void;
  emit(event: string, payload?: unknown): void;
}

export interface DataProviderDefinition {
  namespace: string;
  load?: 'lazy' | 'eager';
  unloadAfter?: string | number;
  provider: {
    load(store: ReactiveStore, socket: SocketBridge): Promise<void> | void;
    unload?(store: ReactiveStore, socket: SocketBridge): Promise<void> | void;
    loadOne?(id: string): Promise<unknown>;
  };
}

export interface ReactiveStore {
  get<T = unknown>(path: BindingPath): T | undefined;
  set(path: BindingPath, value: unknown): void;
  patch(path: BindingPath, partial: Record<string, unknown>): void;
  patchMany(entries: Record<string, unknown>): void;
  delete(path: BindingPath): void;
  clearNamespace(scope: ScopeName | string): void;
  subscribe(path: BindingPath, fn: (value: unknown) => void): Disposable;
  subscriberCount(scope: ScopeName | string): number;
  computed(path: BindingPath, def: ComputedDefinition): Disposable;
  registerDataProvider(def: DataProviderDefinition): Disposable;
  listDataProviders(): DataProviderDefinition[];
}
