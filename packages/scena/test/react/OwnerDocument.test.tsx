// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { OwnerDocumentProvider, useOwnerDocument } from '../../src/react/OwnerDocument.js';
import { Popup } from '../../src/ui/overlay/Popup.js';

afterEach(cleanup);

// A second window, as SurfaceWindows opens one. A same-origin iframe gives
// jsdom a window and a document of their own.
function secondWindow() {
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  const win = frame.contentWindow as Window & typeof globalThis;
  Object.defineProperty(win, 'innerWidth', { value: 300, configurable: true });
  Object.defineProperty(win, 'innerHeight', { value: 200, configurable: true });
  return win;
}

describe('useOwnerDocument', () => {
  it('is the global document and window outside a provider', () => {
    const { result } = renderHook(() => useOwnerDocument());
    expect(result.current.document).toBe(document);
    expect(result.current.window).toBe(window);
  });

  it("is the provided document and its window inside one", () => {
    const win = secondWindow();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <OwnerDocumentProvider document={win.document}>{children}</OwnerDocumentProvider>
    );
    const { result } = renderHook(() => useOwnerDocument(), { wrapper });
    expect(result.current.document).toBe(win.document);
    expect(result.current.window).toBe(win);
  });
});

describe('Popup in a second window', () => {
  it('portals into that window, closes on its Escape, and clamps to its size', () => {
    const win = secondWindow();
    vi.spyOn(win.HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: 100, height: 50 } as DOMRect));
    const onClose = vi.fn();
    render(
      <OwnerDocumentProvider document={win.document}>
        <Popup x={290} y={190} onClose={onClose}>rows</Popup>
      </OwnerDocumentProvider>,
    );

    const popup = win.document.querySelector('.oo-popup') as HTMLElement;
    expect(popup.parentElement).toBe(win.document.body);
    expect(document.querySelector('.oo-popup')).toBeNull();
    expect([popup.style.left, popup.style.top]).toEqual(['196px', '146px']);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(win.document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
