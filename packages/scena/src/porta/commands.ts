import type { Scena } from '../types/scena.js';
import type { PortaProvider, Session } from './provider.js';
import { SIGILLUM_PATHS } from './sigillum.js';

// Registers the four sigillum.* commands. The composer (`LoginForm`) and the
// app dispatch these — providers don't talk to commands directly, they're
// invoked here by id lookup.
export function registerSigillumCommands(
  scena: Scena,
  providers: Map<string, PortaProvider>,
): void {
  scena.commands.register({
    id: 'sigillum.signin',
    title: 'Sign in',
    dispatch: 'client',
    run: async (ctx, args) => {
      const a = (args ?? {}) as {
        providerId: string;
        credentials: Record<string, unknown>;
      };
      const provider = providers.get(a.providerId);
      if (!provider) throw new Error(`Unknown provider "${a.providerId}"`);
      if (!provider.signin) throw new Error(`Provider "${a.providerId}" has no signin()`);
      ctx.store.patchMany({
        [SIGILLUM_PATHS.pending]: true,
        [SIGILLUM_PATHS.error]: null,
      });
      try {
        const session = await provider.signin(a.credentials);
        ctx.store.patchMany({
          [SIGILLUM_PATHS.session]: { ...session, _providerId: a.providerId } as Session,
          [SIGILLUM_PATHS.pending]: false,
          [SIGILLUM_PATHS.challenge]: null,
        });
      } catch (err) {
        ctx.store.patchMany({
          [SIGILLUM_PATHS.pending]: false,
          [SIGILLUM_PATHS.error]: err instanceof Error ? err.message : 'Sign-in failed',
        });
      }
    },
  });

  scena.commands.register({
    id: 'sigillum.signout',
    title: 'Sign out',
    dispatch: 'client',
    run: async (ctx) => {
      const session = ctx.store.get<(Session & { _providerId?: string }) | null>(
        SIGILLUM_PATHS.session,
      );
      if (session?._providerId) {
        const provider = providers.get(session._providerId);
        try {
          await provider?.signout?.(session);
        } catch {
          // Best-effort cleanup; never block sign-out on provider failure.
        }
      }
      ctx.store.patchMany({
        [SIGILLUM_PATHS.session]: null,
        [SIGILLUM_PATHS.challenge]: null,
        [SIGILLUM_PATHS.error]: null,
      });
    },
  });

  scena.commands.register({
    id: 'sigillum.requestOtp',
    title: 'Request code',
    dispatch: 'client',
    run: async (ctx, args) => {
      const a = (args ?? {}) as { providerId: string; value: string };
      const provider = providers.get(a.providerId);
      if (!provider) throw new Error(`Unknown provider "${a.providerId}"`);
      if (!provider.request) throw new Error(`Provider "${a.providerId}" has no request()`);
      ctx.store.patchMany({
        [SIGILLUM_PATHS.pending]: true,
        [SIGILLUM_PATHS.error]: null,
      });
      try {
        const { challengeId } = await provider.request(a.value);
        ctx.store.patchMany({
          [SIGILLUM_PATHS.challenge]: { providerId: a.providerId, id: challengeId },
          [SIGILLUM_PATHS.pending]: false,
        });
      } catch (err) {
        ctx.store.patchMany({
          [SIGILLUM_PATHS.pending]: false,
          [SIGILLUM_PATHS.error]: err instanceof Error ? err.message : 'Request failed',
        });
      }
    },
  });

  scena.commands.register({
    id: 'sigillum.verifyOtp',
    title: 'Verify code',
    dispatch: 'client',
    run: async (ctx, args) => {
      const a = (args ?? {}) as { providerId: string; code: string };
      const provider = providers.get(a.providerId);
      if (!provider) throw new Error(`Unknown provider "${a.providerId}"`);
      if (!provider.verify) throw new Error(`Provider "${a.providerId}" has no verify()`);
      const challenge = ctx.store.get<{ providerId: string; id: string } | null>(
        SIGILLUM_PATHS.challenge,
      );
      if (!challenge || challenge.providerId !== a.providerId) {
        ctx.store.set(SIGILLUM_PATHS.error, 'No active challenge for this provider');
        return;
      }
      ctx.store.patchMany({
        [SIGILLUM_PATHS.pending]: true,
        [SIGILLUM_PATHS.error]: null,
      });
      try {
        const session = await provider.verify(challenge.id, a.code);
        ctx.store.patchMany({
          [SIGILLUM_PATHS.session]: { ...session, _providerId: a.providerId } as Session,
          [SIGILLUM_PATHS.pending]: false,
          [SIGILLUM_PATHS.challenge]: null,
        });
      } catch (err) {
        ctx.store.patchMany({
          [SIGILLUM_PATHS.pending]: false,
          [SIGILLUM_PATHS.error]: err instanceof Error ? err.message : 'Verify failed',
        });
      }
    },
  });
}
