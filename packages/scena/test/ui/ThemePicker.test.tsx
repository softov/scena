// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { type ReactNode } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { ThemePicker } from '../../src/ui/control/ThemePicker.js';
import { registerTheme, unregisterTheme, listThemes } from '../../src/styles/index.js';
import { THEME_ID_PATH } from '../../src/styles/controller.js';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function mount(scena: ReturnType<typeof createScena>, node: ReactNode) {
  return render(<ScenaProvider scena={scena}>{node}</ScenaProvider>);
}

// The theme registry is module state, so anything registered here outlives the
// test that registered it unless it is taken back out.
const extras: string[] = [];
function addTheme(id: string, label: string): void {
  registerTheme({ id, label, variants: {} });
  extras.push(id);
}

afterEach(() => {
  cleanup();
  while (extras.length) unregisterTheme(extras.pop()!);
});

describe('ThemePicker', () => {
  // The built-in theme is registered by styles/index.ts, so an app that adds
  // none of its own has exactly one — which is what most apps are.
  it('renders nothing when the built-in theme is the only one', () => {
    expect(listThemes().length).toBe(1);
    const { container } = mount(createScena(), <ThemePicker />);
    expect(container.querySelector('.oo-theme-picker')).toBeNull();
  });

  it('appears as soon as there is an actual choice', () => {
    addTheme('paper', 'Paper');
    const { container } = mount(createScena(), <ThemePicker />);

    expect(container.querySelector('.oo-theme-picker')).not.toBeNull();
    expect(screen.getAllByRole('option').map((o) => o.getAttribute('value'))).toContain('paper');
  });

  it('hides again when `themes` narrows the list back to one', () => {
    addTheme('paper', 'Paper');
    const { container } = mount(createScena(), <ThemePicker themes={['paper']} />);
    expect(container.querySelector('.oo-theme-picker')).toBeNull();
  });

  it('offers the families in the order `themes` gives, ignoring unregistered ids', () => {
    addTheme('paper', 'Paper');
    addTheme('coder', 'Coder');
    mount(createScena(), <ThemePicker themes={['coder', 'nope', 'paper']} />);

    expect(screen.getAllByRole('option').map((o) => o.getAttribute('value'))).toEqual([
      'coder',
      'paper',
    ]);
  });

  it('writes the store and does no DOM or storage work of its own', async () => {
    addTheme('paper', 'Paper');
    const scena = createScena();
    const before = document.documentElement.getAttribute('data-theme');

    mount(scena, <ThemePicker />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'paper' } });
    await tick();

    expect(scena.store.get(THEME_ID_PATH)).toBe('paper');
    // Applying is registerThemeController's job. A picker that also touched the
    // document would be a second owner of what the page looks like.
    expect(document.documentElement.getAttribute('data-theme')).toBe(before);
  });

  it('drops the visible label in compact mode but keeps the accessible one', () => {
    addTheme('paper', 'Paper');
    const { container } = mount(createScena(), <ThemePicker compact />);

    expect(container.querySelector('.oo-theme-picker__label')).toBeNull();
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe('Theme');
  });
});
