import type { Scena } from '../types/scena.js';
import type { PortaProvider } from './provider.js';
import { SIGILLUM_PATHS, createSigillum, type Sigillum } from './sigillum.js';
import { registerSigillumCommands } from './commands.js';

export interface CreatePortaOpts {
  providers: PortaProvider[];
}

export interface Porta {
  /** Read-only ordered list of registered providers (preserves opts order). */
  providers: PortaProvider[];
  /** Lookup a provider by id. */
  getProvider(id: string): PortaProvider | undefined;
  /** Sigillum facade — `session()`, `has(scope)`, `isPending()`, `signOut()`. */
  sigillum: Sigillum;
}

// One-shot setup. Call after createScena():
//   const porta = createPorta(scena, { providers: [...] });
// Then wrap the app in <PortaProvider porta={porta}>.
export function createPorta(scena: Scena, opts: CreatePortaOpts): Porta {
  const providerMap = new Map<string, PortaProvider>();
  const seen = new Set<string>();
  for (const p of opts.providers) {
    if (seen.has(p.id)) {
      throw new Error(`Duplicate PortaProvider id "${p.id}".`);
    }
    seen.add(p.id);
    providerMap.set(p.id, p);
  }

  scena.store.patchMany({
    [SIGILLUM_PATHS.providers]: opts.providers.map((p) => p.id),
    [SIGILLUM_PATHS.pending]: false,
    [SIGILLUM_PATHS.error]: null,
    [SIGILLUM_PATHS.challenge]: null,
  });
  if (scena.store.get(SIGILLUM_PATHS.session) === undefined) {
    scena.store.set(SIGILLUM_PATHS.session, null);
  }

  registerSigillumCommands(scena, providerMap);

  return {
    providers: opts.providers,
    getProvider: (id) => providerMap.get(id),
    sigillum: createSigillum(scena),
  };
}
