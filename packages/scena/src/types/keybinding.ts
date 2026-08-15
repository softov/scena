import type { Disposable } from './disposable.js';
import type { WhenClause } from './when.js';
import type { SurfaceName } from './mount-surface.js';

export interface KeyEventLike {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

export interface Keybinding {
  keys: string;
  commandId: string;
  args?: unknown[];
  when?: WhenClause;
  scope?: { surfaceName?: SurfaceName; viewId?: string };
}

export type KeybindingResolution =
  | { kind: 'none' }
  | { kind: 'chord-pending'; depth: number }
  | { kind: 'fire'; commandId: string; args?: unknown[] };

export interface KeybindingRegistry {
  register(binding: Keybinding): Disposable;
  unregister(keys: string, commandId: string): void;
  list(): Keybinding[];
  resolve(event: KeyEventLike): KeybindingResolution;
}
