import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@softov/scena/styles/theme.css';
import '@softov/scena/styles/geometry.css';
import '@softov/scena/styles/base.css';
import '@softov/scena/styles/bar.css';
import '@softov/scena/styles/scrollbar.css';
import '@softov/scena/styles/surface.css';

import { applyTheme, type ThemeMode } from '@softov/scena/styles';
import './app.css';
import App from './App.js';

// Boot is deliberately flat: no lazy App, no boot screen, no auth wall. The
// playground has all three and they are worth having there; here they would
// only stand between a change and seeing whether it worked.
const MODE_KEY = 'scena-demo.theme-mode';

const saved = window.localStorage.getItem(MODE_KEY);
const mode: ThemeMode =
  saved === 'light' || saved === 'dark'
    ? saved
    : window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

applyTheme(document.documentElement, 'default', mode);

const root = document.getElementById('root');
if (!root) throw new Error('No #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
