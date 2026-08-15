import { Suspense, lazy, useEffect, useMemo, type ReactNode } from 'react';
import type { Disposable } from '@softov/scena/types';
import {
  createLocalStorageLayoutStorage,
  createStorageBackend,
  createLocalStorageStorage,
  createI18nBackend,
  createModusBackend,
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
  // `$/modus/*` publishes the display environment (size class, orientation,
  // pointer accuracy) so surface `when` clauses can gate on it. Read-only.
  { scope: 'modus', create: () => createModusBackend() },
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
            title={(
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}>
                <div style={{ width: 64 }}>
                  <style>
                    {`
                    svg.logo {
                      display: block;
                      width: 100%;
                      height: auto;
                    }
                    svg.logo path {
                      transition: fill 0.2s ease;
                    }
                    svg.logo path:hover {
                      animation: scena-logo-hover 0.6s ease infinite alternate;
                      fill: var(--oo-color-surface);
                      cursor: pointer;
                    }
                    @keyframes scena-logo-hover {
                      0% { fill: #00743e; }
                      100% { fill: #4ec9b0; }
                    }
                    `}
                  </style>
                  <svg className="logo"
                    xmlns="http://www.w3.org/2000/svg"
                    width="100%"
                    height="100%"
                    version="1.1"
                    shapeRendering="geometricPrecision"
                    textRendering="geometricPrecision"
                    imageRendering="optimizeQuality"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    viewBox="0 0 728 728">
                    <defs>
                      <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#4ec9b0" />
                        <stop offset="45%" stopColor="#1a927a" />
                        <stop offset="100%" stopColor="#82dfcc" />
                      </linearGradient>

                      <linearGradient id="sTop" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#42ebf7" />
                        <stop offset="45%" stopColor="#00743e" />
                        <stop offset="100%" stopColor="#1a927a" />
                      </linearGradient>

                      <linearGradient id="sMiddle" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#1a927a" />
                        <stop offset="50%" stopColor="#4ec9b0" />
                        <stop offset="100%" stopColor="#82dfcc" />
                      </linearGradient>

                      <linearGradient id="sBottom" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#82dfcc" />
                        <stop offset="55%" stopColor="#00743e" />
                        <stop offset="100%" stopColor="#1a927a" />
                      </linearGradient>
                      <clipPath id="reveal-lower">
                        <rect x="0" y="0" width="0" height="728">
                          <animate attributeName="width" from="0" to="728" begin="0.30s" dur="0.50s" fill="freeze" />
                        </rect>
                      </clipPath>

                      <clipPath id="reveal-middle">
                        <rect x="728" y="0" width="0" height="728">
                          <animate attributeName="x" from="728" to="0" begin="0.80s" dur="0.65s" fill="freeze" />
                          <animate attributeName="width" from="0" to="728" begin="0.80s" dur="0.65s" fill="freeze" />
                        </rect>
                      </clipPath>

                      <clipPath id="reveal-top">
                        <rect x="0" y="0" width="0" height="728">
                          <animate attributeName="width" from="0" to="728" begin="1.45s" dur="0.85s" fill="freeze" />
                        </rect>
                      </clipPath>
                    </defs>
                    <g id="Layer_x0020_1">
                      <g opacity="0" transform="translate(476.5 184) scale(0.12) translate(-476.5 -184)">
                        <path fill="url(#panel)" d="M387 54l179 86c8,4 14,15 14,24l0 139c0,10 -6,14 -14,11l-179 -86c-8,-4 -14,-15 -14,-24l0 -139c0,-10 6,-14 14,-11z" />
                        <animate attributeName="opacity" from="0" to="1" begin="2.20s" dur="0.30s" fill="freeze" />
                        <animateTransform attributeName="transform" type="translate" from="476.5 184" to="476.5 184" begin="2.20s" dur="0.001s" fill="freeze" additive="replace" />
                        <animateTransform attributeName="transform" type="scale" values="0.12;1.08;1" keyTimes="0;0.72;1" begin="2.20s" dur="0.45s" fill="freeze" additive="sum" />
                        <animateTransform attributeName="transform" type="translate" from="-476.5 -184" to="-476.5 -184" begin="2.20s" dur="0.001s" fill="freeze" additive="sum" />
                      </g>
                      <path
                        fill="url(#sTop)"
                        clipPath="url(#reveal-top)"
                        d="M183 200c0,-1 0,-2 0,-3 -2,-40 102,-79 165,-98l0 102c-43,17 -82,35 -113,52 -7,-4 -12,-7 -15,-9 -11,-8 -1,0 -1,-1 -21,-15 -33,-29 -35,-43z" />
                      <path
                        fill="url(#sMiddle)"
                        clipPath="url(#reveal-middle)"
                        d="M328 395c-15,-6 -146,-63 -146,-91l0 -79c0,-8 1,-26 1,-25 2,13 14,28 35,43 0,1 -9,-7 1,1 11,8 50,30 90,47l1 0 84 36 0 0 27 12c89,39 127,47 124,77 0,1 0,2 0,3 -2,12 -11,23 -27,33l0 0 0 0c-8,6 -18,12 -30,17l-160 -75z" />
                      <path
                        fill="url(#sBottom)"
                        clipPath="url(#reveal-lower)"
                        d="M545 529l0 -112c-1,13 -11,25 -27,36l0 0 0 0c-12,9 -29,17 -50,26 -37,15 -61,25 -88,36l0 112 88 -36c51,-20 77,-40 77,-62zm-228 121l0 2 2 -1 -2 -1z" />

                      <g opacity="0" transform="translate(242.5 526) scale(0.12) translate(-242.5 -526)">
                        <path fill="url(#panel)" d="M153 396l179 86c8,4 14,15 14,24l0 139c0,10 -6,14 -14,11l-179 -86c-8,-4 -14,-15 -14,-24l0 -139c0,-10 6,-14 14,-11z" />
                        <animate attributeName="opacity" from="0" to="1" begin="0s" dur="0.30s" fill="freeze" />
                        <animateTransform attributeName="transform" type="translate" from="242.5 526" to="242.5 526" begin="0s" dur="0.001s" fill="freeze" additive="replace" />
                        <animateTransform attributeName="transform" type="scale" values="0.12;1.08;1" keyTimes="0;0.72;1" begin="0s" dur="0.45s" fill="freeze" additive="sum" />
                        <animateTransform attributeName="transform" type="translate" from="-242.5 -526" to="-242.5 -526" begin="0s" dur="0.001s" fill="freeze" additive="sum" />
                      </g>
                    </g>
                  </svg>
                </div>
                <div>{t('wall.title')}</div>
              </div>
            )}
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
