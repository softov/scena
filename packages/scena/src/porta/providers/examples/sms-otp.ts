import type { PortaProvider, Session } from '../../provider.js';

export interface SmsOtpOpts {
  digits?: number;
  label?: string;
  sendLabel?: string;
  // Real impl: text the OTP. Testbed: any 6-digit code accepted.
  sendCode?: (phone: string) => Promise<string>;
  verify?: (challengeId: string, code: string) => Promise<Session>;
}

export function smsOtpProvider(opts: SmsOtpOpts = {}): PortaProvider {
  const digits = opts.digits ?? 6;
  return {
    id: 'sms-otp',
    label: opts.label ?? 'Sign in with SMS',
    icon: '📱',
    kind: 'otp',
    otp: { digits, channel: 'sms', sendLabel: opts.sendLabel },
    async request(phone) {
      if (opts.sendCode) return { challengeId: await opts.sendCode(phone) };
      const id = `sms_${Date.now().toString(36)}`;
      // eslint-disable-next-line no-console
      console.info(
        `[smsOtpProvider] (stub) would SMS ${phone} a ${digits}-digit code — challengeId=${id}`,
      );
      return { challengeId: id };
    },
    async verify(challengeId, code) {
      if (opts.verify) return opts.verify(challengeId, code);
      await new Promise((r) => setTimeout(r, 200));
      if (code.length !== digits) {
        throw new Error(`Expected a ${digits}-digit code`);
      }
      return {
        userId: 'demo-sms-user',
        displayName: 'Demo User (SMS)',
        permissions: ['session.read'],
        raw: { provider: 'sms-otp', challengeId, code, demo: true },
      };
    },
  };
}
