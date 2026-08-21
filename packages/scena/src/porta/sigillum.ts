import type { BindingPath } from '../sdk/component-graph.js';
import type { Scena } from '../sdk/scena.js';
import type { Session } from './provider.js';

export const SIGILLUM_PATHS = {
  session:   '$/sigillum/session'   as BindingPath,
  providers: '$/sigillum/providers' as BindingPath,
  pending:   '$/sigillum/pending'   as BindingPath,
  error:     '$/sigillum/error'     as BindingPath,
  challenge: '$/sigillum/challenge' as BindingPath,
} as const;

export interface Sigillum {
  session(): Session | null;
  /** True if the current session carries `scope`. v0 matcher: equality + trailing `.*` wildcard. */
  has(scope: string): boolean;
  isPending(): boolean;
  error(): string | null;
  signOut(): Promise<unknown>;
}

export function createSigillum(scena: Scena): Sigillum {
  function session(): Session | null {
    return scena.store.get<Session | null>(SIGILLUM_PATHS.session) ?? null;
  }
  return {
    session,
    has(scope: string): boolean {
      const s = session();
      if (!s || !s.permissions) return false;
      return s.permissions.some((p) => matchScope(p, scope));
    },
    isPending(): boolean {
      return Boolean(scena.store.get<boolean>(SIGILLUM_PATHS.pending));
    },
    error(): string | null {
      return scena.store.get<string | null>(SIGILLUM_PATHS.error) ?? null;
    },
    signOut(): Promise<unknown> {
      return scena.commands.execute('sigillum.signout');
    },
  };
}

// Granted `'agents.write'` exactly matches scope `'agents.write'`.
// Granted `'agents.*'` matches any scope starting with `'agents.'`.
// (Permission match rules are flagged PENDING in the plan for upgrade later.)
function matchScope(granted: string, requested: string): boolean {
  if (granted === requested) return true;
  if (granted.endsWith('.*')) {
    return requested.startsWith(granted.slice(0, -1));
  }
  return false;
}
