// @vitest-environment jsdom

import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Popup } from '../../src/ui/overlay/Popup.js';

describe('Popup', () => {
  afterEach(() => vi.unstubAllGlobals());

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

    const { container } = render(<Popup x={700} y={500}>rows</Popup>);
    const popup = container.firstElementChild as HTMLElement;
    expect([popup.style.left, popup.style.top]).toEqual(['596px', '500px']);

    height = 300;
    act(() => grow());
    expect(popup.style.top).toBe('296px');
  });
});
