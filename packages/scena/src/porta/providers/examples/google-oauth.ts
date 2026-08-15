import type { PortaProvider, Session } from '../../provider.js';

export interface GoogleOAuthOpts {
  clientId: string;
  // Optional: a real implementation would open a popup, exchange code → token,
  // call Google's userinfo endpoint, etc. The testbed stub just resolves with
  // a synthetic Session so the UI flow can be demonstrated end-to-end.
  signin?: () => Promise<Session>;
}

export function googleOAuthProvider(opts: GoogleOAuthOpts): PortaProvider {
  return {
    id: 'google',
    label: 'Google',
    icon: '🌐',
    kind: 'oauth-button',
    async signin(): Promise<Session> {
      if (opts.signin) return opts.signin();
      // Demo stub
      await new Promise((r) => setTimeout(r, 300));
      return {
        userId: 'demo-google-user',
        displayName: 'Demo User (Google)',
        email: 'demo@google.example',
        permissions: ['session.read'],
        raw: { provider: 'google', clientId: opts.clientId, demo: true },
      };
    },
  };
}
