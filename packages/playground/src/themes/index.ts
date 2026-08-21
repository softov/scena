import { registerTheme } from '@softov/scena/styles';
import solarizedHref from './solarized.css?url';
import paperHref from './paper.css?url';
import coderHref from './coder.css?url';
import vsModernHref from './vs-modern.css?url';
import { sunsetTheme } from './sunset.js';

// Test themes for the dev playground. Demonstrates both registration paths:
//   - CSS file shipped via Vite's `?url` import (lazy <link>).
//   - sunset: inline tokens object (no CSS file).
//
// The set is chosen to pull the catalog in different directions rather than to
// look pretty, because a theme control is only tested by themes that disagree:
//
//   paper      borderless - both alpha tokens at 0, so nothing is separated by
//              a line. Finds every component that only reads as a component
//              because it has a box around it.
//   vs-modern  the opposite - opaque hairlines, chrome darker than the canvas,
//              tight radii.
//   coder      a saturated hue family and a mono font stack, which is where
//              fixed spacing and assumed-neutral greys show up.
//   solarized  overrides the resolved --oo-color-* tokens instead of the
//              --oo-rgb-* channels, so it exercises that path too.
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
  registerTheme({
    id: 'paper',
    label: 'Paper',
    variants: {
      light: { kind: 'css', href: paperHref },
      dark:  { kind: 'css', href: paperHref },
    },
  });
  registerTheme({
    id: 'coder',
    label: 'Coder',
    variants: {
      light: { kind: 'css', href: coderHref },
      dark:  { kind: 'css', href: coderHref },
    },
  });
  registerTheme({
    id: 'vs-modern',
    label: 'VS Modern',
    variants: {
      light: { kind: 'css', href: vsModernHref },
      dark:  { kind: 'css', href: vsModernHref },
    },
  });
  registerTheme(sunsetTheme);
}
