// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { render, cleanup } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { SurfaceArea } from '../../src/react/SurfaceArea.js';
import { DefaultShell } from '../../src/react/DefaultShell.js';

const here = dirname(fileURLToPath(import.meta.url));
const surfaceCss = readFileSync(resolve(here, '../../src/styles/surface.css'), 'utf8');
const buttonBarCss = readFileSync(resolve(here, '../../src/ui/control/ButtonBar.css'), 'utf8');

afterEach(cleanup);

function mount(node: React.ReactNode) {
  const scena = createScena();
  return render(<ScenaProvider scena={scena}>{node}</ScenaProvider>);
}

/**
 * scena's own CSS styles a surface by what the shell says it IS, not by what it
 * is called.
 *
 * Rules keyed on `.oo-surface--sidebar-left` work for the nine names scena
 * ships and silently skip whatever an app defined — an `alert:top` band got no
 * separator and no bar treatment, with nothing to indicate why. The shell
 * stamps an edge and a role instead, because only the shell knows its own
 * arrangement, and the CSS matches those.
 */
describe('surface stamping', () => {
  it('stamps the edge and role the shell supplies', () => {
    const { container } = mount(
      <SurfaceArea surface="alert:top" role="bar" edge="block-end" />,
    );
    const el = container.querySelector('.oo-surface');
    expect(el?.getAttribute('data-surface')).toBe('alert:top');
    expect(el?.getAttribute('data-surface-role')).toBe('bar');
    expect(el?.getAttribute('data-surface-edge')).toBe('block-end');
  });

  it('stamps nothing when the shell says nothing', () => {
    const { container } = mount(<SurfaceArea surface="alert:top" />);
    const el = container.querySelector('.oo-surface');
    // A shell that has not said where a surface sits should not have scena
    // guessing an edge for it.
    expect(el?.hasAttribute('data-surface-edge')).toBe(false);
    expect(el?.hasAttribute('data-surface-role')).toBe(false);
  });

  it('still carries the name, which is what APP css is free to match', () => {
    const { container } = mount(<SurfaceArea surface="statusbar:secondary" role="bar" />);
    expect(container.querySelector('[data-surface="statusbar:secondary"]')).not.toBeNull();
  });

  // The shipped shell has to actually do this, or the mechanism is theoretical
  // and a theme that opts into separators gets none.
  it('DefaultShell stamps every surface it places', () => {
    const { container } = mount(<DefaultShell />);
    const stamped = Array.from(container.querySelectorAll('.oo-surface')).map((el) => [
      el.getAttribute('data-surface'),
      el.getAttribute('data-surface-role'),
      el.getAttribute('data-surface-edge'),
    ]);

    expect(stamped).toEqual(
      expect.arrayContaining([
        ['titlebar', 'bar', 'block-end'],
        ['activitybar', 'rail', 'inline-end'],
        ['sidebar:left', 'panel', 'inline-end'],
        // `main` and `overlay` close on nothing, so they carry a role and no edge.
        ['main', 'main', null],
        ['statusbar', 'bar', 'block-start'],
        ['overlay', 'overlay', null],
      ]),
    );
    // Every surface it places has a role, so nothing falls through the CSS.
    expect(stamped.filter(([, role]) => role === null)).toEqual([]);
  });

  describe('the CSS matches the stamp, not the name', () => {
    it('separators are keyed on all four edges', () => {
      for (const edge of ['inline-start', 'inline-end', 'block-start', 'block-end']) {
        expect(surfaceCss).toContain(`.oo-surface[data-surface-edge='${edge}']`);
      }
    });

    it('no separator rule is keyed on a surface name', () => {
      const separatorRules = surfaceCss
        .split('\n')
        .filter((line) => line.includes('.oo-surface--') && !line.includes('floating'));
      expect(separatorRules).toEqual([]);
    });

    it('the bar treatment is keyed on the role', () => {
      expect(buttonBarCss).toContain("[data-surface-role='bar'] .oo-button-bar");
      expect(buttonBarCss).not.toContain("[data-surface='statusbar']");
    });

    // The two name-keyed rules that remain are deliberate: they position a
    // floating sidebar for shells written before stamping existed, and they
    // stand down the moment an edge IS stamped.
    it('the floating fallbacks defer to a stamped edge', () => {
      expect(surfaceCss).toContain(
        ".oo-surface--sidebar-left[data-presentation='floating']:not([data-surface-edge])",
      );
      expect(surfaceCss).toContain(
        ".oo-surface--sidebar-right[data-presentation='floating']:not([data-surface-edge])",
      );
      // And the edge-keyed anchors exist for shells that do stamp.
      expect(surfaceCss).toContain(
        ".oo-surface[data-surface-edge='inline-end'][data-presentation='floating']",
      );
    });
  });
});
