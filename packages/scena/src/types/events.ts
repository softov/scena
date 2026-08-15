import type { Disposable } from './disposable.js';
import type { ComponentNode, PropValue, BindingPath } from './component-graph.js';
import type { SurfaceName } from './mount-surface.js';
import type { ScenaLayout } from './layout.js';

export type ScenaSystemEvent =
  | 'scena:mount:opened'
  | 'scena:mount:closed'
  | 'scena:mount:focused'
  | 'scena:mount:blurred'
  | 'scena:registry:changed'
  | 'scena:store:changed'
  | 'scena:menu:changed'
  | 'scena:layout:changed'
  | 'scena:shell:changed'
  | 'scena:plugin:contributed'
  | 'scena:plugin:unloaded'
  | 'scena:session:skipped'
  | 'scena:converter:applied'
  | 'scena:permission:denied'
  | 'scena:action:event';

// Declaration-mergeable: plugins augment via TS declaration merging.
export interface ScenaEventMap {
  'scena:mount:opened': { key: string; surface: SurfaceName; component: ComponentNode };
  'scena:mount:closed': { key: string; reason?: string };
  'scena:mount:focused': { key: string; surface: SurfaceName };
  'scena:mount:blurred': { key: string; surface: SurfaceName };
  'scena:registry:changed': {
    registry:
      | 'components'
      | 'commands'
      | 'converters'
      | 'menus'
      | 'keybindings'
      | 'shells'
      | 'layouts';
  };
  'scena:store:changed': { path: string; value: unknown; previous: unknown };
  'scena:menu:changed': { slot: string };
  'scena:layout:changed': ScenaLayout;
  'scena:shell:changed': { shellId: string };
  'scena:plugin:contributed': { sourceId: string; version?: string };
  'scena:plugin:unloaded': { sourceId: string };
  'scena:session:skipped': { key: string; surface: SurfaceName; reason: string };
  'scena:converter:applied': { converterId: string; sourceFormat: string; nodeId?: string };
  'scena:permission:denied': {
    sourceId: string;
    kind: 'read' | 'write' | 'command' | 'surface' | 'register';
    path?: string;
  };
  // Emitted by the dynamic resolver when an Action of `event` form is dispatched.
  // The agent-surface-bridge listens for these and forwards them to the socket.
  'scena:action:event': {
    mountKey: string | null;
    name: string;
    context?: Record<string, PropValue>;
    wantResponse?: boolean;
    responsePath?: BindingPath;
  };
}

export interface EventBus {
  emit<K extends keyof ScenaEventMap>(event: K, payload: ScenaEventMap[K]): void;
  emit(event: string, payload?: unknown): void;
  on<K extends keyof ScenaEventMap>(
    event: K,
    fn: (payload: ScenaEventMap[K]) => void,
  ): Disposable;
  on(event: string, fn: (payload: unknown) => void): Disposable;
  off(event: string, fn: (payload: unknown) => void): void;
}
