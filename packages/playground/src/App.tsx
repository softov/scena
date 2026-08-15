import { Suspense, lazy, useEffect, useMemo, type ReactNode } from 'react';
import type { Disposable } from '@softov/scena/types';
import {
  createLocalStorageLayoutStorage,
  createStorageBackend,
  createLocalStorageStorage,
  createI18nBackend,
} from '@softov/scena';
import type { ScopeBackendFactory } from '@softov/scena/types';
import { Scena as ScenaComponent, useScena, useI18n } from '@softov/scena/react/core';
import {
  createPorta,
  passwordProvider,
  registerPortaBlocks,
  PortaContextProvider,
  // Limen,
  // LoginForm,
  useSession,
} from '@softov/scena/porta';
const Limen = lazy(() => import('@softov/scena/porta').then(module => ({ default: module.Limen })));
const LoginForm = lazy(() => import('@softov/scena/ui/forms').then(module => ({ default: module.LoginForm })));
import {
  googleOAuthProvider,
  magicLinkProvider,
  smsOtpProvider,
} from '@softov/scena/porta/examples';
import { LocaleToggle } from '@softov/scena/ui/control';
import { registerBoot } from './register-boot.js';
import { registerDevMessages } from './i18n-messages.js';
import { useUrlPath, navigate } from './use-url-path.js';

// Register dev messages at module load so the wall renders translated on first
// paint (before onRender/registerBoot runs). Idempotent.
registerDevMessages();
// import { CadastrePage } from './pages/CadastrePage.js';
const CadastrePage = lazy(() => import('./pages/CadastrePage.js').then(module => ({ default: module.CadastrePage })));
// import { ForgotPasswordPage } from './pages/ForgotPasswordPage.js';
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.js').then(module => ({ default: module.ForgotPasswordPage })));

const CustomShell = lazy(() => import('./CustomShell.js'));
const layoutStorage = createLocalStorageLayoutStorage({ key: 'scena-dev.layout.v1' });

// Phase 5 demo: `$/workspace` is value-backed by a localStorage ScopeBackend,
// so anything written under it survives reloads. See register-boot's visit
// counter. Every other scope stays in the in-memory tree.
const backendFactories: ScopeBackendFactory[] = [
  {
    scope: 'workspace',
    create: () =>
      createStorageBackend('workspace', createLocalStorageStorage('scena-dev.workspace.v1')),
  },
  // `$/t/*` resolves the active locale's message from the i18n registry.
  { scope: 't', create: () => createI18nBackend() },
];

function PortaBridge({ children }: { children: ReactNode }) {
  const scena = useScena();
  const session = useSession();
  const { t } = useI18n();

  const porta = useMemo(
    () =>
      createPorta(scena, {
        providers: [
          passwordProvider({
            label: t('auth/signIn', 'Sign in'),
            users: [
              { email: 'demo@scena.dev', password: 'demo', displayName: 'Demo User', permissions: ['session.read'] },
              { email: 'admin@scena.dev', password: 'admin', displayName: 'Admin User', permissions: ['agents.*', 'session.read'] },
            ],
          }),
          googleOAuthProvider({ clientId: 'demo-client-id' }),
          magicLinkProvider({
            label: t('auth/magicLink', 'Email a sign-in link'),
            sendLabel: t('auth/sendLink', 'Send link'),
          }),
          smsOtpProvider({
            label: t('auth/smsOtp', 'Sign in with SMS'),
            sendLabel: t('auth/sendCode', 'Send code'),
          }),
        ],
      }),
    [scena, t],
  );

  useEffect(() => {
    const sub = registerPortaBlocks(scena);
    return () => sub.dispose();
  }, [scena]);

  useEffect(() => {
    if (!session) return;
    let dispose: Disposable | undefined;
    let cancelled = false;
    void (async () => {
      const { registerShell } = await import('./register-shell.js');
      if (cancelled) return;
      dispose = registerShell(scena);
    })();
    return () => {
      cancelled = true;
      dispose?.dispose();
    };
  }, [session, scena]);

  return <PortaContextProvider porta={porta}>{children}</PortaContextProvider>;
}

export default function App() {
  const { t } = useI18n();
  const path = useUrlPath();

  console.log('App rendering with path:', path);

  if (path === '/cadastre')
    return (
      <Suspense fallback={<ShellLoading />}>
        <CadastrePage />
      </Suspense>
    );
  if (path === '/forgot-password')
    return (
      <Suspense fallback={<ShellLoading />}>
        <ForgotPasswordPage />
      </Suspense>
    );

  return (
    <ScenaComponent options={{ layoutStorage, backendFactories }} onRender={registerBoot}>
      <PortaBridge>
        <Suspense fallback={<div>Auth Loading...</div>}>
          <Limen
            permission="session.read"
            title={t('wall.title')}
            subtitle={t('wall.subtitle')}
            fallback={
              <Suspense fallback={<div>Auth Loading...</div>}>
                <LoginForm
                  // allowSignup
                  // allowForgotPassword
                  onSignup={() => navigate('/cadastre')}
                  onForgotPassword={() => navigate('/forgot-password')}
                />
              </Suspense>
            }
            bottom={<WallFooter />}
          >
            <Suspense fallback={<ShellLoading />}>
              <CustomShell />
            </Suspense>
          </Limen>
        </Suspense>
      </PortaBridge>
    </ScenaComponent>
  );
}

function WallFooter(): ReactNode {
  return (
    <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--oo-color-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <LocaleToggle display="both" />
      {/* <div>
        <a href="/cadastre" onClick={(e) => { e.preventDefault(); navigate('/cadastre'); }}>/cadastre</a>
        {' · '}
        <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }}>/forgot-password</a>
      </div> */}
    </div>
  );
}

function ShellLoading(): ReactNode {
  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--oo-color-muted)',
        background: 'var(--oo-color-canvas)',
      }}
    >
      <span>Loading shell…</span>
    </div>
  );
}
