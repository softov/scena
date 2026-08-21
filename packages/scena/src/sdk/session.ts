import type { ComponentNode, BindingPath } from './component-graph.js';
import type { Disposable } from './disposable.js';
import type { SurfaceName, MountHandle } from './mount-surface.js';
import type { ContextValue } from './when.js';

export interface SessionMount {
  key: string;
  surface: SurfaceName;
  component: ComponentNode;
  state: Record<string, unknown>;
  openedAt: number;
}

export interface SurfaceState {
  visible?: boolean;
  activeKey?: string;
  order?: string[];
}

export interface SessionSnapshot {
  version: 1;
  capturedAt: number;
  mounts: SessionMount[];
  surfaces: Partial<Record<SurfaceName, SurfaceState>>;
  persistedContext?: Record<BindingPath, ContextValue>;
}

export interface SessionStorage {
  load(): Promise<SessionSnapshot | null>;
  save(snapshot: SessionSnapshot): Promise<void>;
  clear(): Promise<void>;
}

export interface SessionAPI {
  snapshot(): SessionSnapshot;
  restore(snapshot: SessionSnapshot): Promise<{ restored: MountHandle[]; skipped: SessionMount[] }>;
  save(): Promise<void>;
  enableAutoPersist(opts?: { debounceMs?: number }): Disposable;
}
