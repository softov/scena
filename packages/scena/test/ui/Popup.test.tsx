// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Popup } from '../../src/ui/overlay/Popup.js';

describe('Popup', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('moves back inside the window when it grows after mount', () => {
    let grow: () => void = () => undefined;
    vi.stubGlobal('ResizeObserver', class {
      constructor(fn: () => void) { grow = fn; }
      observe() {}
      disconnect() {}
    });
    let height = 40;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: 200, height } as DOMRect));
    Object.assign(window, { innerWidth: 800, innerHeight: 600 });

    render(<Popup x={700} y={500}>rows</Popup>);
    const popup = document.querySelector('.oo-popup') as HTMLElement;
    expect([popup.style.left, popup.style.top]).toEqual(['596px', '500px']);

    height = 300;
    act(() => grow());
    expect(popup.style.top).toBe('296px');
  });

  it('draws in the body, out of a parent that makes its own stacking context', () => {
    const { container } = render(<div style={{ position: 'sticky', zIndex: 1 }}><Popup x={10} y={10}>rows</Popup></div>);
    const popup = document.querySelector('.oo-popup') as HTMLElement;
    expect(popup.parentElement).toBe(document.body);
    expect(container.querySelector('.oo-popup')).toBeNull();
  });

  it('closes on a click outside it, and not on one inside it', async () => {
    const onClose = vi.fn();
    render(<Popup x={10} y={10} onClose={onClose}><button type="button">row</button></Popup>);
    await act(() => new Promise((done) => setTimeout(done, 0)));
    (document.querySelector('.oo-popup button') as HTMLElement).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
