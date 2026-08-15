import { describe, it, expect } from 'vitest';
import {
  resolveSurfacePresentation,
  isOverlaid,
  type PresentationPolicy,
} from '../../src/core/surface-presentation.js';

// A policy resembling what an app would write. It lives here, not in the
// library — scena ships the mechanism, the app ships the opinion.
const POLICY: PresentationPolicy = {
  'sidebar:left': { xsmall: 'floating' },
  'sidebar:right': { xsmall: 'floating', small: 'floating' },
  'panel:bottom': { xsmall: 'sheet' },
  activitybar: { xsmall: 'bar' },
};

describe('surface-presentation', () => {
  it('docks everything when no policy is supplied', () => {
    // The library holds no opinion, so an app that adopts the hook before
    // writing a policy keeps exactly the pre-presentation behavior.
    for (const cls of ['xsmall', 'small', 'medium', 'large'] as const) {
      for (const s of ['sidebar:left', 'sidebar:right', 'panel:bottom', 'activitybar'] as const) {
        expect(resolveSurfacePresentation(s, cls)).toBe('docked');
      }
    }
  });

  it('leaves every surface docked at medium and large', () => {
    for (const cls of ['medium', 'large'] as const) {
      for (const s of ['sidebar:left', 'sidebar:right', 'panel:bottom', 'activitybar'] as const) {
        expect(resolveSurfacePresentation(s, cls, POLICY)).toBe('docked');
      }
    }
  });

  it('applies a policy entry only at the sizes it names', () => {
    expect(resolveSurfacePresentation('sidebar:right', 'small', POLICY)).toBe('floating');
    expect(resolveSurfacePresentation('sidebar:left', 'small', POLICY)).toBe('docked');
    expect(resolveSurfacePresentation('sidebar:right', 'xsmall', POLICY)).toBe('floating');
    expect(resolveSurfacePresentation('sidebar:left', 'xsmall', POLICY)).toBe('floating');
  });

  it('supports every presentation, not just floating', () => {
    expect(resolveSurfacePresentation('panel:bottom', 'xsmall', POLICY)).toBe('sheet');
    expect(resolveSurfacePresentation('activitybar', 'xsmall', POLICY)).toBe('bar');
    expect(resolveSurfacePresentation('panel:bottom', 'small', POLICY)).toBe('docked');
    expect(resolveSurfacePresentation('activitybar', 'small', POLICY)).toBe('docked');
  });

  it('defaults surfaces the policy omits to docked at every size', () => {
    for (const cls of ['xsmall', 'small', 'medium', 'large'] as const) {
      expect(resolveSurfacePresentation('titlebar', cls, POLICY)).toBe('docked');
      expect(resolveSurfacePresentation('main', cls, POLICY)).toBe('docked');
      expect(resolveSurfacePresentation('statusbar', cls, POLICY)).toBe('docked');
    }
  });

  it('lets an app invert the opinion entirely', () => {
    // A product whose right sidebar IS the workspace: the left one gives way
    // first. Nothing in the library has to change for this to be expressible.
    const inverted: PresentationPolicy = {
      'sidebar:left': { small: 'floating', xsmall: 'floating' },
    };
    expect(resolveSurfacePresentation('sidebar:left', 'small', inverted)).toBe('floating');
    expect(resolveSurfacePresentation('sidebar:right', 'small', inverted)).toBe('docked');
  });

  it('reports which presentations leave the flex flow', () => {
    expect(isOverlaid('floating')).toBe(true);
    expect(isOverlaid('sheet')).toBe(true);
    expect(isOverlaid('docked')).toBe(false);
    // `bar` is pinned but still occupies its edge, so a shell keeps reserving
    // space for it rather than drawing a scrim behind it.
    expect(isOverlaid('bar')).toBe(false);
  });

  it('never mutates the policy it is given', () => {
    const before = JSON.stringify(POLICY);
    resolveSurfacePresentation('sidebar:left', 'xsmall', POLICY);
    expect(JSON.stringify(POLICY)).toBe(before);
  });
});
