import type { Disposable } from './disposable.js';
import type { ScenaLayout } from './layout.js';
import type { SurfaceName } from './mount-surface.js';
import type { Scena } from './scena.js';

export interface ShellProps {
  scena: Scena;
  layout: ScenaLayout;
  renderSurface(surface: SurfaceName): unknown;
}

export interface ShellDefinition {
  id: string;
  title?: string;
  // React component; concrete type provided by @softov/scena/react.
  component: unknown;
}

export interface ShellRegistry {
  register(def: ShellDefinition): Disposable;
  unregister(id: string): void;
  list(): ShellDefinition[];
  setActive(id: string): void;
  getActive(): ShellDefinition | null;
}
