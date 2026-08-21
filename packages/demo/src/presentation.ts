import type { PresentationPolicy } from '@softov/scena';

// How this app's surfaces occupy space as the viewport narrows.
//
// scena ships the mechanism (docked / floating / sheet / bar) and no policy,
// so every app writes this. Advisor's is in shell/presentation.ts and the
// playground's is in shell-presentation.ts; this is the third copy of the same
// four lines, which is itself worth noticing.
//
// NOTE (the open one): DefaultShell does not read this. It renders from
// `visible` and `size` only, so on a narrow viewport the sidebars keep taking
// width from `main` instead of lifting over it. Advisor solves that in
// shell/compact.ts with a drawer behaviour keyed on `isOverlaid(...)`, and
// nothing equivalent ships. See README.md.
export const DEMO_PRESENTATION: PresentationPolicy = {
  'sidebar:left': { xsmall: 'sheet', small: 'floating' },
  'sidebar:right': { xsmall: 'sheet', small: 'floating' },
  activitybar: { xsmall: 'bar' },
};
