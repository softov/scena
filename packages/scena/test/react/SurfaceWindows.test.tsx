// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { SurfaceWindows } from '../../src/react/SurfaceWindows.js';
import { registerBuiltinLayouts } from '../../src/ui/layout/register.js';

type TestScena = ReturnType<typeof createScena>;

// Each `window.open` gives a same-origin iframe's window, as a popup would be.
let opens: { url: string; features: string; window: Window }[] = [];
let refuse = false;
beforeEach(() => {
  opens = [];
  refuse = false;
  Element.prototype.scrollIntoView = () => {};
  vi.spyOn(window, 'open').mockImplementation((url?: string | URL, _target?: string, features?: string) => {
    if (refuse) return null;
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const win = frame.contentWindow as Window;
    vi.spyOn(win, 'close').mockImplementation(() => frame.remove());
    opens.push({ url: String(url), features: features ?? '', window: win });
    return win;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.head.querySelectorAll('[data-test-sheet]').forEach((n) => n.remove());
  document.documentElement.removeAttribute('data-theme');
});

const BOUNDS = { left: 40, top: 60, width: 640, height: 480 };

function setup(): TestScena {
  const scena = createScena();
  registerBuiltinLayouts(scena);
  scena.components.register({ component: 'Page', renderer: { kind: 'react', load: async () => ({ default: () => <div>a page</div> }) } });
  scena.layout.setSurface('window:1', { visible: true, layout: 'tab-panel', window: BOUNDS });
  scena.surfaces.open({ surface: 'window:1', key: 'a', resource: { component: 'Page' }, props: { title: 'Tab A' } });
  render(<ScenaProvider scena={scena}><SurfaceWindows /></ScenaProvider>);
  return scena;
}

describe('SurfaceWindows', () => {
  it('opens one window at the bounds, and draws its tabs there', async () => {
    setup();
    expect(opens).toHaveLength(1);
    expect(opens[0]?.features).toBe('popup=yes,left=40,top=60,width=640,height=480');
    const doc = opens[0]!.window.document;
    await waitFor(() => expect(doc.body.textContent).toContain('Tab A'));
    expect(document.body.textContent).not.toContain('Tab A');
    await waitFor(() => expect(doc.title).toBe('Tab A'));
  });

  it("copies the main window's styles and theme, and follows them", async () => {
    const early = document.createElement('style');
    early.setAttribute('data-test-sheet', '');
    early.textContent = '.early { color: red }';
    document.head.appendChild(early);
    setup();
    const doc = opens[0]!.window.document;
    expect(doc.head.textContent).toContain('.early');

    const late = document.createElement('style');
    late.setAttribute('data-test-sheet', '');
    late.textContent = '.late { color: blue }';
    document.head.appendChild(late);
    document.documentElement.setAttribute('data-theme', 'dark');
    await waitFor(() => expect(doc.head.textContent).toContain('.late'));
    await waitFor(() => expect(doc.documentElement.getAttribute('data-theme')).toBe('dark'));

    late.textContent = '.late { color: green }';
    await waitFor(() => expect(doc.head.textContent).toContain('green'));
    late.remove();
    await waitFor(() => expect(doc.head.textContent).not.toContain('.late'));
  });

  it('sends the tabs to main and removes the surface when a person closes the window', async () => {
    const scena = setup();
    const closed = vi.fn();
    scena.events.on('scena:window:closed', closed);
    act(() => {
      opens[0]!.window.dispatchEvent(new Event('pagehide'));
    });
    expect(scena.surfaces.listAt('main').map((m) => m.key)).toEqual(['a']);
    expect(scena.layout.get().surfaces['window:1']).toBeUndefined();
    expect(closed).toHaveBeenCalledWith(expect.objectContaining({ surface: 'window:1' }));
  });

  it('keeps the surface and its tabs when the main page leaves', () => {
    const scena = setup();
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(scena.surfaces.listAt('window:1').map((m) => m.key)).toEqual(['a']);
    expect(scena.layout.get().surfaces['window:1']?.window).toEqual(BOUNDS);
    window.dispatchEvent(new Event('pageshow'));
  });

  it('closes the window and removes the surface once its last tab moves out', async () => {
    const scena = setup();
    const win = opens[0]!.window;
    await waitFor(() => expect(win.document.body.textContent).toContain('Tab A'));
    act(() => {
      scena.surfaces.move({ key: 'a', toSurface: 'main' });
    });
    await waitFor(() => expect(scena.layout.get().surfaces['window:1']).toBeUndefined());
    expect(win.close).toHaveBeenCalled();
  });

  it('writes the place and size back when the window resizes', () => {
    const scena = setup();
    const win = opens[0]!.window;
    Object.defineProperty(win, 'innerWidth', { value: 700, configurable: true });
    act(() => {
      win.dispatchEvent(new Event('resize'));
    });
    expect(scena.layout.get().surfaces['window:1']?.window?.width).toBe(700);
  });

  it('emits blocked for a window the browser refuses, and keeps the surface', () => {
    refuse = true;
    const scena = createScena();
    const blocked = vi.fn();
    scena.events.on('scena:window:blocked', blocked);
    scena.layout.setSurface('window:1', { visible: true, layout: 'tab-panel', window: BOUNDS });
    render(<ScenaProvider scena={scena}><SurfaceWindows /></ScenaProvider>);
    expect(blocked).toHaveBeenCalledWith({ surface: 'window:1' });
    expect(scena.layout.get().surfaces['window:1']).toBeDefined();
  });

  describe('the notice for blocked windows', () => {
    function blockedSetup(windows: string[]): TestScena {
      refuse = true;
      const scena = createScena();
      registerBuiltinLayouts(scena);
      scena.components.register({ component: 'Page', renderer: { kind: 'react', load: async () => ({ default: () => <div>a page</div> }) } });
      for (const name of windows) {
        scena.layout.setSurface(name, { visible: true, layout: 'tab-panel', window: BOUNDS });
        scena.surfaces.open({ surface: name, key: `tab-of-${name}`, resource: { component: 'Page' } });
      }
      render(<ScenaProvider scena={scena}><SurfaceWindows /></ScenaProvider>);
      return scena;
    }

    it('shows, and its button opens the window and goes', () => {
      blockedSetup(['window:1']);
      expect(screen.getByRole('alert').textContent).toContain('blocked a window');
      refuse = false;
      fireEvent.click(screen.getByRole('button', { name: 'Open window' }));
      expect(opens).toHaveLength(1);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('stays for the windows a click could not open', () => {
      blockedSetup(['window:1', 'window:2']);
      expect(screen.getByRole('alert').textContent).toContain('2 windows');
      // A browser lets one window through per click.
      let allowed = 1;
      vi.mocked(window.open).mockImplementation((url?: string | URL, _target?: string, features?: string) => {
        if (allowed-- <= 0) return null;
        const frame = document.createElement('iframe');
        document.body.appendChild(frame);
        const win = frame.contentWindow as Window;
        opens.push({ url: String(url), features: features ?? '', window: win });
        return win;
      });
      fireEvent.click(screen.getByRole('button', { name: 'Open windows' }));
      expect(opens).toHaveLength(1);
      expect(screen.getByRole('alert').textContent).toContain('blocked a window');
    });

    it('sends the tabs to main when dismissed', () => {
      const scena = blockedSetup(['window:1']);
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Move tabs to the main area' }));
      });
      expect(scena.surfaces.listAt('main').map((m) => m.key)).toEqual(['tab-of-window:1']);
      expect(scena.layout.get().surfaces['window:1']).toBeUndefined();
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });
});
