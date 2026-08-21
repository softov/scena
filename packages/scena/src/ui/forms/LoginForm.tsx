import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useScena } from '../../react/ScenaProvider.js';
import { useStore } from '../../react/hooks/useStore.js';
import { useI18n } from '../../react/hooks/useI18n.js';
import { Button } from '../control/Button.js';
import { usePorta } from '../../porta/PortaContext.js';
import { SIGILLUM_PATHS } from '../../porta/sigillum.js';
import type { AuthField, PortaProvider, ProviderLabel } from '../../porta/provider.js';
import type { BindingPath } from '../../sdk/component-graph.js';
import type { UseI18nResult } from '../../react/hooks/useI18n.js';
// import { Field } from '../ui/forms/Field.js';
import '../control/_field-parts.css';
import './LoginForm.css';

type Fire = (commandId: string, args: Record<string, unknown>) => void;

function bindingPath(value: ProviderLabel | undefined): BindingPath | undefined {
  return value && typeof value === 'object' && 'path' in value ? value.path : undefined;
}

// Resolve a string|DataBinding label to text, reactively. `useStore(undefined)`
// is a no-op, so this stays a single unconditional hook. A binding (e.g.
// `{ path: '$/t/auth/usernameLabel' }`) follows locale switches via the $/t
// backend.
function useLabel(value: ProviderLabel | undefined, fallback = ''): string {
  const bound = useStore<string>(bindingPath(value));
  if (bindingPath(value)) return bound ?? fallback;
  return (typeof value === 'string' ? value : undefined) ?? fallback;
}

// One OAuth button — resolves its (possibly bound) provider label reactively.
function OAuthButton({
  provider,
  pending,
  fire,
  t,
}: {
  provider: PortaProvider;
  pending: boolean;
  fire: Fire;
  t: UseI18nResult['t'];
}): ReactNode {
  const label = useLabel(provider.label, provider.id);
  return (
    <Button
      label={`${provider.icon ? `${provider.icon} ` : ''}${t('auth/providerLabel', {
        provider: label,
        fallback: 'Continue with {provider}',
      })}`}
      disabled={pending}
      onClick={() => fire('sigillum.signin', { providerId: provider.id, credentials: {} })}
    />
  );
}

// A field label: resolves a `{ path }` binding via the store (reactive), else
// renders the literal string.
function ProviderFieldLabel({ field }: { field: AuthField }): ReactNode {
  const path = field.label && typeof field.label === 'object' && 'path' in field.label ? bindingPath(field.label) : undefined;
  const bound = useStore<string>(path);
  if (path) return <>{bound ?? ''}</>;
  return <>{typeof field.label === 'string' ? field.label : ''}</>;
}

// Reuses .oo-field / .oo-input / .oo-textarea classes from the
// catalog so the look matches the rest of scena.

export interface LoginFormProps {
  /** Filter to a subset by provider id; omit to render every registered provider. */
  providers?: string[];
  allowSignup?: boolean;
  allowForgotPassword?: boolean;
  onSignup?: () => void;
  onForgotPassword?: () => void;
}

interface Challenge {
  providerId: string;
  id: string;
}

export function LoginForm({
  providers: filter,
  allowSignup = false,
  allowForgotPassword = false,
  onSignup,
  onForgotPassword,
}: LoginFormProps): ReactNode {
  const scena = useScena();
  const porta = usePorta();
  const { t } = useI18n();
  const pending = Boolean(useStore<boolean>(SIGILLUM_PATHS.pending));
  const error = useStore<string | null>(SIGILLUM_PATHS.error) ?? null;
  const challenge = useStore<Challenge | null>(SIGILLUM_PATHS.challenge) ?? null;

  const visible = useMemo<PortaProvider[]>(
    () => (filter ? porta.providers.filter((p) => filter.includes(p.id)) : porta.providers),
    [porta.providers, filter],
  );

  const oauthButtons = visible.filter((p) => p.kind === 'oauth-button');
  const formFieldsProviders = visible.filter((p) => p.kind === 'form-fields');
  const otpProviders = visible.filter((p) => p.kind === 'otp');
  const magicProviders = visible.filter((p) => p.kind === 'magic-link');

  // Merge fields across all form-fields providers by name (first wins).
  const mergedFields = useMemo<Array<{ field: AuthField; ownerId: string }>>(() => {
    const out: Array<{ field: AuthField; ownerId: string }> = [];
    const seen = new Set<string>();
    for (const p of formFieldsProviders) {
      for (const f of p.fields ?? []) {
        if (seen.has(f.name)) continue;
        seen.add(f.name);
        out.push({ field: f, ownerId: p.id });
      }
    }
    return out;
  }, [formFieldsProviders]);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  function setField(name: string, value: string): void {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  }

  function fire(commandId: string, args: Record<string, unknown>): void {
    void scena.commands.execute(commandId, args);
  }

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    if (formFieldsProviders.length === 0) return;
    // When multiple form-fields providers exist, prefer 'password' if present;
    // otherwise the first one. Apps with stricter needs can use the
    // `providers` prop to disambiguate.
    const target =
      formFieldsProviders.find((p) => p.id === 'password') ?? formFieldsProviders[0];
    if (!target) return;
    fire('sigillum.signin', { providerId: target.id, credentials: fieldValues });
  }

  const hasSecondaryUi =
    mergedFields.length > 0 || otpProviders.length > 0 || magicProviders.length > 0;

  // Submit button label — prefer the 'password' provider's label, else the
  // first form provider's. Resolved reactively (string or $/t binding).
  const submitProvider =
    formFieldsProviders.find((p) => p.id === 'password') ?? formFieldsProviders[0];
  const submitLabel = useLabel(submitProvider?.label, t('auth/signIn', 'Sign in'));

  return (
    <form className="porta-form" onSubmit={onSubmit}>
      {oauthButtons.length > 0 ? (
        <div className="porta-form__oauth">
          {oauthButtons.map((p) => (
            <OAuthButton key={p.id} provider={p} pending={pending} fire={fire} t={t} />
          ))}
        </div>
      ) : null}

      {oauthButtons.length > 0 && hasSecondaryUi ? (
        <div className="porta-form__divider">or</div>
      ) : null}

      {mergedFields.length > 0 ? (
        <>
          <div className="porta-form__fields">
            {mergedFields.map(({ field }) => (
              <label key={field.name} className="oo-field">
                <span className="oo-field__label">
                  {field.label && typeof field.label === 'object' && 't' in field.label ? t(field.label.t, {
                    ...field.label.args,
                    fallback: '???',
                  }) : <ProviderFieldLabel field={field} />}
                </span>
                <input
                  className="oo-input"
                  type={field.type}
                  name={field.name}
                  autoComplete={field.autoComplete}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={fieldValues[field.name] ?? ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setField(field.name, e.currentTarget.value)
                  }
                />
                {/* <Field
                  type={field.type}
                  name={field.name}
                  autoComplete={field.autoComplete}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={fieldValues[field.name] ?? ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setField(field.name, e.currentTarget.value)
                  }
                /> */}
              </label>
            ))}
          </div>
          <Button
            type="submit"
            variant="primary"
            label={submitLabel}
            disabled={pending}
          />
        </>
      ) : null}

      {otpProviders.map((p) => (
        <OtpRow
          key={p.id}
          provider={p}
          challenge={challenge}
          pending={pending}
          fire={fire}
        />
      ))}

      {magicProviders.map((p) => (
        <MagicLinkRow
          key={p.id}
          provider={p}
          challenge={challenge}
          pending={pending}
          fire={fire}
        />
      ))}

      <div className="porta-form__footer">
        <span>
          {pending ? <span className="porta-form__pending">Working…</span> : null}
          {error ? <span className="porta-form__error">{error}</span> : null}
        </span>
        <div className="porta-form__aux">
          {allowForgotPassword ? (
            <button type="button" onClick={onForgotPassword}>
              {t('auth/forgotPassword', 'Forgot password?')}
            </button>
          ) : null}
          {allowSignup ? (
            <button type="button" onClick={onSignup}>
              {t('auth/createAccount', 'Create account')}
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function OtpRow({
  provider,
  challenge,
  pending,
  fire,
}: {
  provider: PortaProvider;
  challenge: Challenge | null;
  pending: boolean;
  fire(commandId: string, args: Record<string, unknown>): void;
}): ReactNode {
  const { t } = useI18n('auth');
  const label = useLabel(provider.label, provider.id);
  const stage2 = challenge?.providerId === provider.id;
  const digits = provider.otp?.digits ?? 6;
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');

  return (
    <div className="porta-form__two-step">
      <span className="porta-form__two-step-label">
        {provider.icon ? `${provider.icon} ` : ''}
        {label}
      </span>
      {stage2 ? (
        <div className="porta-form__two-step-row">
          <DigitsInput digits={digits} value={code} onChange={setCode} />
          <Button
            label="Verify"
            variant="primary"
            disabled={pending || code.length !== digits}
            onClick={() =>
              fire('sigillum.verifyOtp', { providerId: provider.id, code })
            }
          />
        </div>
      ) : (
        <div className="porta-form__two-step-row">
          <label className="oo-field">
            <span className="oo-field__label">
              {
                provider.otp?.channel === 'sms'
                  ? t('phoneLabel', 'Phone number')
                  : t('emailLabel', 'Email address')
              }
            </span>
            <input
              className="oo-input"
              type={provider.otp?.channel === 'sms' ? 'tel' : 'email'}
              value={address}
              placeholder={provider.otp?.channel === 'sms' ? '+1 555 …' : 'you@example.com'}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setAddress(e.currentTarget.value)
              }
            />
          </label>
          <Button
            label={provider.otp?.sendLabel ?? t('sendCode', 'Send code')}
            disabled={pending || !address}
            onClick={() =>
              fire('sigillum.requestOtp', { providerId: provider.id, value: address })
            }
          />
        </div>
      )}
    </div>
  );
}

function MagicLinkRow({
  provider,
  challenge,
  pending,
  fire,
}: {
  provider: PortaProvider;
  challenge: Challenge | null;
  pending: boolean;
  fire(commandId: string, args: Record<string, unknown>): void;
}): ReactNode {
  const { t } = useI18n('auth');
  const label = useLabel(provider.label, provider.id);
  const stage2 = challenge?.providerId === provider.id;
  const [address, setAddress] = useState('');

  return (
    <div className="porta-form__two-step">
      <span className="porta-form__two-step-label">
        {provider.icon ? `${provider.icon} ` : ''}
        {label}
      </span>
      {stage2 ? (
        <span className="porta-form__pending">
          Check your {provider.magicLink?.channel ?? 'inbox'} for the link.
        </span>
      ) : (
        <div className="porta-form__two-step-row">
          <label className="oo-field">
            <span className="oo-field__label">
              {
                provider.magicLink?.channel === 'sms'
                  ? t('phoneLabel', 'Phone number')
                  : t('emailLabel', 'Email address')
              }
            </span>
            <input
              className="oo-input"
              type={provider.magicLink?.channel === 'sms' ? 'tel' : 'email'}
              value={address}
              placeholder={provider.magicLink?.channel === 'sms' ? '+1 555 …' : 'you@example.com'}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setAddress(e.currentTarget.value)
              }
            />
          </label>
          <Button
            label={provider.magicLink?.sendLabel ?? t('sendLink', 'Send link')}
            disabled={pending || !address}
            onClick={() =>
              fire('sigillum.requestOtp', { providerId: provider.id, value: address })
            }
          />
        </div>
      )}
    </div>
  );
}

function DigitsInput({
  digits,
  value,
  onChange,
}: {
  digits: number;
  value: string;
  onChange(next: string): void;
}): ReactNode {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => {
    refs.current = refs.current.slice(0, digits);
  }, [digits]);
  const chars = value.padEnd(digits, ' ').slice(0, digits).split('');

  function setChar(idx: number, ch: string): void {
    const next = chars.slice();
    next[idx] = ch.slice(-1) || ' ';
    onChange(next.join('').trimEnd());
    if (ch && idx + 1 < digits) refs.current[idx + 1]?.focus();
  }

  return (
    <div className="porta-form__otp-digits">
      {Array.from({ length: digits }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="porta-form__otp-digit"
          inputMode="numeric"
          maxLength={1}
          value={chars[i]?.trim() ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setChar(i, e.currentTarget.value)
          }
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !chars[i]?.trim() && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}

export default LoginForm;