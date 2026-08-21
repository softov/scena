import type { PresentationPolicy } from '@softov/scena';

// How this app's surfaces occupy space as the viewport narrows.
//
// scena ships the mechanism (docked / floating / sheet / bar) and no policy,
// so every app writes this. Advisor's is in shell/presentation.ts and the
// playground's is in shell-presentation.ts; this is the third copy of the same
// four lines, which is itself worth noticing.
//
// DefaultShell reads this -- it is passed in App.tsx. Narrow the window and
// the sidebar lifts over `main` with a scrim behind it, rather than continuing
// to take width from it. That was not true when this file was written: the
// shell ignored the policy entirely, which is the gap this app was built to
// surface. See README.md.
export const DEMO_PRESENTATION: PresentationPolicy = {
  'sidebar:left': { xsmall: 'sheet', small: 'floating' },
  'sidebar:right': { xsmall: 'sheet', small: 'floating' },
  activitybar: { xsmall: 'bar' },
};
