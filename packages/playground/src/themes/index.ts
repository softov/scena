import { registerTheme } from '@softov/scena/styles';
import solarizedHref from './solarized.css?url';
import { sunsetTheme } from './sunset.js';

// Test themes for the dev playground. Demonstrates both registration paths:
//   - solarized: CSS file shipped via Vite's `?url` import (lazy <link>).
//   - sunset:    inline tokens object (no CSS file).
//
// Call this BEFORE the first applyTheme() so the registry is populated
// when the initial mode is resolved from localStorage.
export function registerDevThemes(): void {
  registerTheme({
    id: 'solarized',
    label: 'Solarized',
    variants: {
      light: { kind: 'css', href: solarizedHref },
      dark:  { kind: 'css', href: solarizedHref },
    },
  });
  registerTheme(sunsetTheme);
}
