import type { PresentationPolicy } from '@softov/scena';

// How THIS app's surfaces occupy space as the viewport narrows.
//
// This lives in the app, not in scena, because every line of it is a claim
// about the playground's own information architecture rather than a general
// truth. Another product whose right sidebar is the primary workspace would
// invert the first two entries and be equally correct.
//
// Reasoning behind each:
//   sidebar:left  — primary navigation here, so it earns its width longest and
//                   only lifts out of flow when there is genuinely no room.
//   sidebar:right — contextual, so it is first to stop competing with `main`.
//   panel:bottom  — docked it steals height from `main`; as a sheet it overlays,
//                   which is the better trade once `main` is already small.
//   activitybar   — rotates to the bottom edge, within thumb reach.
//
// Anything absent stays `docked` at every size.
export const SHELL_PRESENTATION_POLICY: PresentationPolicy = {
  'sidebar:left': { xsmall: 'floating' },
  'sidebar:right': { xsmall: 'floating', small: 'floating' },
  'panel:bottom': { xsmall: 'sheet' },
  activitybar: { xsmall: 'bar' },
};
