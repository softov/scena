// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createScena } from '../../src/core/scena.js';
import {
  registerThemeController,
  resolveThemeMode,
  THEME_ID_PATH,
  THEME_MODE_PATH,
} from '../../src/styles/controller.js';
import { registerTheme } from '../../src/styles/index.js';

// Store notifications are batched to a macrotask, so every assertion that
// follows a `set` has to wait for the subscriber to run. Same `tick` the
// reactive-store suite uses.
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

// jsdom has no matchMedia. Every test that touches `system` needs one, and the
// controller has to keep working when it is missing entirely (SSR), so the
// absence case is covered too.
function stubMatchMedia(prefersDark: boolean): { fire: () => void } {
  const listeners: (() => void)[] = [];
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => ({
      matches: prefersDark,
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: (_: string, fn: () => void) => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      },
    }),
  });
  return { fire: () => listeners.forEach((fn) => fn()) };
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-theme-mode');
});

describe('registerThemeController', () => {
  it('seeds both paths and applies to the document', () => {
    stubMatchMedia(false);
    const scena = createScena();
    registerThemeController(scena, { idKey: 'k.id', modeKey: 'k.mode' });

    expect(scena.store.get(THEME_ID_PATH)).toBe('default');
    expect(scena.store.get(THEME_MODE_PATH)).toBe('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('default');
    expect(document.documentElement.getAttribute('data-theme-mode')).toBe('light');
  });

  it('restores what was stored, and re-applies when either path changes', async () => {
    stubMatchMedia(false);
    localStorage.setItem('k.id', 'solar');
    localStorage.setItem('k.mode', 'dark');
    registerTheme({ id: 'solar', label: 'Solar', variants: { dark: { kind: 'tokens', tokens: {} } } });

    const scena = createScena();
    registerThemeController(scena, { idKey: 'k.id', modeKey: 'k.mode' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('solar');
    expect(document.documentElement.getAttribute('data-theme-mode')).toBe('dark');

    scena.store.set(THEME_MODE_PATH, 'light');
    await tick();
    expect(document.documentElement.getAttribute('data-theme-mode')).toBe('light');
    // The write-through is the point: a reload must not lose the choice.
    expect(localStorage.getItem('k.mode')).toBe('light');
  });

  it('follows the OS only while the mode is `system`', async () => {
    const mq = stubMatchMedia(true);
    const scena = createScena();
    registerThemeController(scena, { idKey: 'k.id', modeKey: 'k.mode' });
    expect(document.documentElement.getAttribute('data-theme-mode')).toBe('dark');

    // Pinned: an OS change must NOT move it. This is the whole reason `system`
    // is a stored choice rather than a resolved-once boolean.
    scena.store.set(THEME_MODE_PATH, 'light');
    await tick();
    mq.fire();
    expect(document.documentElement.getAttribute('data-theme-mode')).toBe('light');

    scena.store.set(THEME_MODE_PATH, 'system');
    await tick();
    expect(document.documentElement.getAttribute('data-theme-mode')).toBe('dark');
  });

  it('stops listening once disposed', async () => {
    const mq = stubMatchMedia(false);
    const scena = createScena();
    const sub = registerThemeController(scena, { idKey: 'k.id', modeKey: 'k.mode' });
    sub.dispose();

    const spy = vi.spyOn(document.documentElement, 'setAttribute');
    scena.store.set(THEME_MODE_PATH, 'dark');
    await tick();
    mq.fire();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('honours persist:false — applies, but writes nothing', async () => {
    stubMatchMedia(false);
    const scena = createScena();
    registerThemeController(scena, { idKey: 'k.id', modeKey: 'k.mode', persist: false });
    scena.store.set(THEME_MODE_PATH, 'dark');
    await tick();

    expect(document.documentElement.getAttribute('data-theme-mode')).toBe('dark');
    expect(localStorage.getItem('k.mode')).toBeNull();
  });

  it('falls back to the attribute the entry already set, so there is no flash', () => {
    stubMatchMedia(false);
    document.documentElement.setAttribute('data-theme', 'preset');
    const scena = createScena();
    registerThemeController(scena, { idKey: 'k.id', modeKey: 'k.mode' });
    expect(scena.store.get(THEME_ID_PATH)).toBe('preset');
  });
});

describe('resolveThemeMode', () => {
  it('passes an explicit choice straight through', () => {
    stubMatchMedia(true);
    expect(resolveThemeMode('light')).toBe('light');
    expect(resolveThemeMode('dark')).toBe('dark');
  });

  it('resolves `system` against the OS preference', () => {
    stubMatchMedia(true);
    expect(resolveThemeMode('system')).toBe('dark');
    stubMatchMedia(false);
    expect(resolveThemeMode('system')).toBe('light');
  });

  it('defaults to light where matchMedia does not exist', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: undefined,
    });
    expect(resolveThemeMode('system')).toBe('light');
  });
});
