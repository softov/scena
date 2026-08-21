import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@softov/scena/styles/theme.css';
import '@softov/scena/styles/geometry.css';
import '@softov/scena/styles/base.css';
import '@softov/scena/styles/bar.css';
import '@softov/scena/styles/scrollbar.css';
import '@softov/scena/styles/surface.css';

import { applyTheme, resolveThemeMode, type ThemeModeChoice } from '@softov/scena/styles';
import './app.css';
// Side-effect import, and it has to be above the applyTheme call below: a
// stored theme id that is not registered yet applies nothing, so somebody who
// last chose `sepia` would get a flash of `default` on every reload.
import './themes.js';
import App from './App.js';
import { THEME_ID_KEY, THEME_MODE_KEY } from './theme-keys.js';

// Boot is deliberately flat: no lazy App, no boot screen, no auth wall. The
// playground has all three and they are worth having there; here they would
// only stand between a change and seeing whether it worked.
//
// The theme is applied once BEFORE React, from the same storage keys
// registerThemeController will use, so the first paint is already correct.
// The controller re-applies on mount and then owns it.
const savedId = window.localStorage.getItem(THEME_ID_KEY) ?? 'default';
const savedMode = window.localStorage.getItem(THEME_MODE_KEY);
const choice: ThemeModeChoice =
  savedMode === 'light' || savedMode === 'dark' || savedMode === 'system' ? savedMode : 'system';

applyTheme(document.documentElement, savedId, resolveThemeMode(choice));

const root = document.getElementById('root');
if (!root) throw new Error('No #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
