import type { PortaProvider, Session } from '../../provider.js';

export interface MagicLinkOpts {
  // Real impl: send an email containing a link with a one-time token.
  // Testbed: returns the would-be challenge id immediately.
  label?: string;
  sendLabel?: string;
  sendLink?: (email: string) => Promise<string>;
  verify?: (challengeId: string, token: string) => Promise<Session>;
}

export function magicLinkProvider(opts: MagicLinkOpts = {}): PortaProvider {
  return {
    id: 'magic-link',
    label: opts.label ?? 'Email a sign-in link',
    icon: '✉',
    kind: 'magic-link',
    magicLink: {
      channel: 'email',
      sendLabel: opts.sendLabel,
    },
    async request(email) {
      if (opts.sendLink) return { challengeId: await opts.sendLink(email) };
      // Demo stub — just echoes a synthetic id
      const id = `magic_${Date.now().toString(36)}`;
      // eslint-disable-next-line no-console
      console.info(`[magicLinkProvider] (stub) would email ${email} — challengeId=${id}`);
      return { challengeId: id };
    },
    async verify(challengeId, token) {
      if (opts.verify) return opts.verify(challengeId, token);
      await new Promise((r) => setTimeout(r, 200));
      return {
        userId: 'demo-magic-user',
        displayName: 'Demo User (Magic link)',
        permissions: ['session.read'],
        raw: { provider: 'magic-link', challengeId, token, demo: true },
      };
    },
  };
}
