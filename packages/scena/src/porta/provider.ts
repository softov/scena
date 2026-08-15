import type { ReactNode } from 'react';
import type { DataBinding } from '../types/component-graph.js';

// A label that is either literal text or a store binding (e.g.
// `{ path: '$/t/auth/usernameLabel' }`, resolved by the i18n $/t backend).
// LoginForm resolves bindings reactively, so labels follow locale switches.
export type ProviderLabel = string | DataBinding;

export type PortaProviderKind = 'oauth-button' | 'form-fields' | 'otp' | 'magic-link';

export interface AuthField {
  name: string;
  // Literal text OR a store binding (`{ path: '$/t/...' }`). A binding is
  // resolved reactively by LoginForm via the i18n $/t backend, so the label
  // follows locale switches. Same model as any other scena prop.
  label: ProviderLabel | { t: string; args?: Record<string, unknown> };
  type: 'text' | 'email' | 'password' | 'tel';
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}

export interface Session {
  userId: string;
  displayName?: string;
  email?: string;
  expiresAt?: number;
  permissions?: string[];
  // Provider-specific payload (token, baseUrl, refreshToken, …). Read by the
  // provider's signout(), by app code that needs the raw token, and by any
  // future API-client layer that wants to derive a base URL from the session.
  raw?: Record<string, unknown>;
}

// Passed to a provider's optional render() override. Lets the override
// reuse the composer's pending/error/challenge state instead of inventing
// its own.
export interface ProviderRenderContext {
  pending: boolean;
  error: string | null;
  challenge: { providerId: string; id: string } | null;
  fieldState: Record<string, string>;
  setField(name: string, value: string): void;
  signin(creds: Record<string, unknown>): Promise<void>;
  request(value: string): Promise<void>;
  verify(code: string): Promise<void>;
}

export interface PortaProvider {
  id: string;
  // Literal text OR a store binding (resolved reactively by LoginForm).
  label: ProviderLabel;
  icon?: string;
  kind: PortaProviderKind;

  // ── Declarative metadata per kind ───────────────────────────────────
  // form-fields: fields contributed to the shared sign-in form
  fields?: AuthField[];
  // otp: composer renders N digit inputs after a "send code" step
  otp?: { digits: number; channel: 'sms' | 'email' | 'totp'; sendLabel?: string };
  // magic-link: one address field + send button; resolution typically
  // happens out-of-band (user clicks link in email)
  magicLink?: { channel: 'email' | 'sms'; sendLabel?: string };

  // ── Optional UI override ────────────────────────────────────────────
  render?(ctx: ProviderRenderContext): ReactNode;

  // ── Runtime handlers ────────────────────────────────────────────────
  // single-step kinds
  signin?(creds: Record<string, unknown>): Promise<Session>;
  // two-step kinds (otp / magic-link)
  request?(value: string): Promise<{ challengeId: string }>;
  verify?(challengeId: string, code: string): Promise<Session>;
  // optional cleanup
  signout?(session: Session): Promise<void>;
}
