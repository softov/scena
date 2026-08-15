import { StrictMode, Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@softov/scena/styles/theme.css';
import '@softov/scena/styles/geometry.css';
import '@softov/scena/styles/base.css';
import '@softov/scena/styles/bar.css';
import '@softov/scena/styles/scrollbar.css';
import { applyTheme, type ThemeMode } from '@softov/scena/styles';
import { registerDevThemes } from './themes/index.js';
import './styles.css';
// import './body.css';

// Lazy so this entry module is tiny — React paints the boot loader immediately,
// then App (and its porta / scena / catalog chain) streams in async instead of
// blocking first paint until the whole graph downloads.
const App = lazy(() => import('./App.js'));

// Same markup as the index.html loader, so there's no flash when React takes
// over the #root and swaps the static loader for this Suspense fallback.

function AppFallback() {
  return (
    <div className="boot-screen app-fallback">
      <div className="boot-logo">doop</div>
    </div>
  );
}

function BootFadeOut() {
  useEffect(() => {
    const boot = document.getElementById('boot-screen');
    if (!boot) return;

    boot.classList.add('boot-exit');

    const timeout = window.setTimeout(() => {
      boot.remove();
    }, 450);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}

function RootApp() {
  return (
    <>
      <BootFadeOut />
      <Suspense fallback={<AppFallback />}>
        <div className="app-enter">
          <App />
        </div>
      </Suspense>
    </>
  );
}

registerDevThemes();

const THEME_ID_KEY = 'scena-dev.theme-id';
const THEME_MODE_KEY = 'scena-dev.theme-mode';

const initialThemeId = localStorage.getItem(THEME_ID_KEY) ?? 'default';
const savedMode = localStorage.getItem(THEME_MODE_KEY);
const initialMode: ThemeMode =
  savedMode === 'light' ? 'light'
    : savedMode === 'dark' ? 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

applyTheme(document.documentElement, initialThemeId, initialMode);

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('No #root element');

createRoot(rootEl).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);
