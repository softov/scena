import type { SurfaceName } from './mount-surface.js';

// Absolute path with `$/` root-escape; trailing `*` allowed for wildcards.
export type PermissionPath = `$/${string}`;

export interface Permissions {
  read?: PermissionPath[];
  write?: PermissionPath[];
  commands?: string[];
  surfaces?: SurfaceName[];
  registerComponents?: boolean;
  registerConverters?: boolean;
  registerLayouts?: boolean;
}

export type PermissionKind = 'read' | 'write' | 'command' | 'surface' | 'register';

export interface PermissionEngine {
  allows(sourceId: string, kind: PermissionKind, target?: string): boolean;
  grant(sourceId: string, permissions: Permissions): void;
  revoke(sourceId: string): void;
  permissionsFor(sourceId: string): Permissions | undefined;
}
