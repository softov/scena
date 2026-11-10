// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Badge } from '../../src/ui/display/Badge.js';
import { Icon } from '../../src/ui/display/Icon.js';

afterEach(cleanup);

/**
 * Badge's `color` used to set `--oo-color`, which its stylesheet never read,
 * so a coloured badge drew muted. It sets the channels the stylesheet reads.
 */
describe('Badge color', () => {
  it('sets the badge channels from a scena colour name', () => {
    const view = render(<Badge label="Merged" color="purple" />);
    const badge = view.container.querySelector('.oo-badge') as HTMLElement;
    expect(badge.style.getPropertyValue('--oo-badge-rgb')).toBe('var(--oo-rgb-purple)');
  });

  it('leaves the tone to the stylesheet when no colour is given', () => {
    const view = render(<Badge label="Open" tone="success" />);
    const badge = view.container.querySelector('.oo-badge') as HTMLElement;
    expect(badge.style.getPropertyValue('--oo-badge-rgb')).toBe('');
    expect(badge.dataset.variant).toBe('success');
  });
});

/** Icon's `color` takes a scena colour name too, and any other CSS colour as before. */
describe('Icon color', () => {
  it('draws a scena colour name as its colour', () => {
    const view = render(<Icon name="⎇" color="purple" />);
    expect((view.container.querySelector('.oo-icon') as HTMLElement).style.color).toBe('rgb(var(--oo-rgb-purple))');
  });

  it('passes any other colour through', () => {
    const view = render(<Icon name="⎇" color="#fff" />);
    expect((view.container.querySelector('.oo-icon') as HTMLElement).style.color).toBe('rgb(255, 255, 255)');
  });
});
