import type {
  PermissionEngine,
  PermissionKind,
  Permissions,
} from '../types/permissions.js';

export function createPermissionEngine(): PermissionEngine {
  const grants = new Map<string, Permissions>();

  function matches(pattern: string, target: string): boolean {
    if (pattern === target) return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return target.startsWith(prefix);
    }
    return false;
  }

  function pathsFor(perms: Permissions, kind: PermissionKind): string[] | undefined {
    switch (kind) {
      case 'read':
        return perms.read;
      case 'write':
        return perms.write;
      case 'command':
        return perms.commands;
      case 'surface':
        return perms.surfaces;
      case 'register':
        return undefined;
    }
  }

  return {
    grant(sourceId, perms) {
      grants.set(sourceId, perms);
    },
    revoke(sourceId) {
      grants.delete(sourceId);
    },
    permissionsFor(sourceId) {
      return grants.get(sourceId);
    },
    allows(sourceId, kind, target) {
      const perms = grants.get(sourceId);
      if (!perms) return false;
      if (kind === 'register') return perms.registerComponents !== false;
      if (!target) return false;
      const list = pathsFor(perms, kind);
      if (!list) return false;
      return list.some((p) => matches(p, target));
    },
  };
}
