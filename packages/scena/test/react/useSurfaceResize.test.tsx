// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { createScena } from '../../src/core/scena.js';
import { ScenaProvider } from '../../src/react/ScenaProvider.js';
import { SurfaceArea } from '../../src/react/SurfaceArea.js';
import type { Scena } from '../../src/types/scena.js';
import type { SurfacePresentation } from '../../src/types/layout.js';
import type { SurfaceResizeSpec } from '../../src/react/useSurfaceResize.js';

// jsdom lays nothing out, so every element measures 0. The drag reads the
// surface's own rect to decide both where the grip is and what size to start
// from, so a believable rect is the whole fixture.
function stubRect(element: Element, rect: Partial<DOMRect>): void {
  const full: DOMRect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect;
  element.getBoundingClientRect = () => full;
}

function pointer(type: string, clientX: number, clientY: number): PointerEvent {
  const event = new MouseEvent(type, {
    clientX,
    clientY,
    bubbles: true,
    cancelable: true,
  }) as unknown as PointerEvent;
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event;
}

function mount(spec: SurfaceResizeSpec, presentation: SurfacePresentation = 'docked') {
  const scena = createScena() as Scena;
  const view = render(
    <ScenaProvider scena={scena}>
      <SurfaceArea surface="sidebar:left" presentation={presentation} resize={spec} />
    </ScenaProvider>,
  );
  const element = view.container.querySelector('.oo-surface') as HTMLDivElement;
  // Pointer capture is not implemented in jsdom.
  element.setPointerCapture = () => undefined;
  element.releasePointerCapture = () => undefined;
  element.hasPointerCapture = () => false;
  return { scena, element };
}

beforeEach(() => {
  vi.useFakeTimers();
  // rAF is what the drag coalesces onto; run it immediately so a move commits
  // within the test rather than at the mercy of a real frame.
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    fn(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useSurfaceResize: where the grip is', () => {
  it('marks the band hot only within the grip of the named edge', () => {
    const { element } = mount({ edge: 'right', grip: 10 });
    stubRect(element, { left: 0, right: 240, top: 0, bottom: 800, width: 240, height: 800 });

    act(() => {
      element.dispatchEvent(pointer('pointermove', 120, 400));
    });
    expect(element.getAttribute('data-resize-state')).toBe('idle');

    act(() => {
      element.dispatchEvent(pointer('pointermove', 234, 400));
    });
    expect(element.getAttribute('data-resize-state')).toBe('hot');
  });

  it('puts the grip on the leading edge for a right-hand surface', () => {
    const { element } = mount({ edge: 'left', grip: 10 });
    stubRect(element, { left: 1000, right: 1280, top: 0, bottom: 800, width: 280, height: 800 });

    act(() => {
      element.dispatchEvent(pointer('pointermove', 1274, 400));
    });
    expect(element.getAttribute('data-resize-state')).toBe('idle');

    act(() => {
      element.dispatchEvent(pointer('pointermove', 1004, 400));
    });
    expect(element.getAttribute('data-resize-state')).toBe('hot');
  });

  it('does not arm at all when the surface is not docked', () => {
    const { element } = mount({ edge: 'right' }, 'floating');
    expect(element.hasAttribute('data-resize')).toBe(false);
  });
});

describe('useSurfaceResize: which way it grows', () => {
  it('a right edge grows with a rightward drag', () => {
    const { scena, element } = mount({ edge: 'right', min: 100, max: 600 });
    stubRect(element, { left: 0, right: 240, top: 0, bottom: 800, width: 240, height: 800 });

    act(() => {
      element.dispatchEvent(pointer('pointerdown', 236, 400));
      element.dispatchEvent(pointer('pointermove', 296, 400));
    });

    expect(scena.layout.get().surfaces['sidebar:left']?.size).toBe(300);
  });

  it('a left edge grows with a leftward drag', () => {
    const { scena, element } = mount({ edge: 'left', min: 100, max: 600 });
    stubRect(element, { left: 1000, right: 1280, top: 0, bottom: 800, width: 280, height: 800 });

    act(() => {
      element.dispatchEvent(pointer('pointerdown', 1004, 400));
      element.dispatchEvent(pointer('pointermove', 954, 400));
    });

    expect(scena.layout.get().surfaces['sidebar:left']?.size).toBe(330);
  });

  it('clamps to min and max', () => {
    const { scena, element } = mount({ edge: 'right', min: 120, max: 400 });
    stubRect(element, { left: 0, right: 240, top: 0, bottom: 800, width: 240, height: 800 });

    act(() => {
      element.dispatchEvent(pointer('pointerdown', 236, 400));
      element.dispatchEvent(pointer('pointermove', 5000, 400));
    });
    expect(scena.layout.get().surfaces['sidebar:left']?.size).toBe(400);

    act(() => {
      element.dispatchEvent(pointer('pointermove', -5000, 400));
    });
    expect(scena.layout.get().surfaces['sidebar:left']?.size).toBe(120);
  });

  it('ignores a press that is not on the grip', () => {
    const { scena, element } = mount({ edge: 'right' });
    stubRect(element, { left: 0, right: 240, top: 0, bottom: 800, width: 240, height: 800 });
    const before = scena.layout.get().surfaces['sidebar:left']?.size;

    act(() => {
      element.dispatchEvent(pointer('pointerdown', 40, 400));
      element.dispatchEvent(pointer('pointermove', 400, 400));
    });

    expect(scena.layout.get().surfaces['sidebar:left']?.size).toBe(before);
  });
});

describe('useSurfaceResize: the gesture settles', () => {
  it('mirrors to the store only once the pointer is released', async () => {
    const { scena, element } = mount({ edge: 'right', min: 100, max: 600 });
    stubRect(element, { left: 0, right: 240, top: 0, bottom: 800, width: 240, height: 800 });
    const path = '$/layout/surfaces/sidebar:left/size';

    act(() => {
      element.dispatchEvent(pointer('pointerdown', 236, 400));
      element.dispatchEvent(pointer('pointermove', 296, 400));
    });
    // Moved on screen, deliberately not announced to anything reading the store.
    expect(scena.layout.get().surfaces['sidebar:left']?.size).toBe(300);
    expect(scena.store.get(path as never)).not.toBe(300);

    act(() => {
      element.dispatchEvent(pointer('pointerup', 296, 400));
    });
    expect(scena.store.get(path as never)).toBe(300);
  });

  it('leaves the document clean after the drag', () => {
    const { element } = mount({ edge: 'right' });
    stubRect(element, { left: 0, right: 240, top: 0, bottom: 800, width: 240, height: 800 });

    act(() => {
      element.dispatchEvent(pointer('pointerdown', 236, 400));
    });
    expect(document.documentElement.classList.contains('oo-resizing')).toBe(true);

    act(() => {
      element.dispatchEvent(pointer('pointerup', 236, 400));
    });
    expect(document.documentElement.classList.contains('oo-resizing')).toBe(false);
    expect(document.documentElement.style.cursor).toBe('');
    expect(element.getAttribute('data-resize-state')).toBe('idle');
  });

  it('a cancelled drag still settles', () => {
    const { scena, element } = mount({ edge: 'right', min: 100, max: 600 });
    stubRect(element, { left: 0, right: 240, top: 0, bottom: 800, width: 240, height: 800 });

    act(() => {
      element.dispatchEvent(pointer('pointerdown', 236, 400));
      element.dispatchEvent(pointer('pointermove', 296, 400));
      element.dispatchEvent(pointer('pointercancel', 296, 400));
    });

    expect(document.documentElement.classList.contains('oo-resizing')).toBe(false);
    expect(scena.store.get('$/layout/surfaces/sidebar:left/size' as never)).toBe(300);
  });
});
