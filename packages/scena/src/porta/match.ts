import type { Session } from './provider.js';

// Permission matcher used by Sigillum (runtime) + the three React gates.
// v0 rule: equality + trailing `.*` wildcard. See plan doc PENDING note for
// the broader rule set (RBAC, namespace separator alternatives).
//
// hasScope(session, undefined) → "any session exists"
// hasScope(session, 'agents.write')   matches a granted 'agents.write'
// hasScope(session, 'agents.write')   matches a granted 'agents.*'
export function hasScope(
  session: Session | null,
  scope: string | undefined,
): boolean {
  if (!scope) return Boolean(session);
  if (!session?.permissions) return false;
  return session.permissions.some((p) => {
    if (p === scope) return true;
    if (p.endsWith('.*')) return scope.startsWith(p.slice(0, -1));
    return false;
  });
}
