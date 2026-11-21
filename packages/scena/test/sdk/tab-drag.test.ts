import { describe, it, expect } from 'vitest';
import { canMoveTo, readTabDrag, TAB_DRAG_MIME, writeTabDrag } from '../../src/sdk/tab-drag.js';

function transfer() {
  const data = new Map<string, string>();
  return {
    setData: (format: string, value: string) => void data.set(format, value),
    getData: (format: string) => data.get(format) ?? '',
  };
}

describe('the tab drag payload', () => {
  it('reads back what was written', () => {
    const dt = transfer();
    writeTabDrag(dt, { surface: 'main', key: 'session:a', leafId: 'g1' });
    expect(readTabDrag(dt)).toEqual({ surface: 'main', key: 'session:a', leafId: 'g1' });
  });

  it('reads back a payload with no leaf', () => {
    const dt = transfer();
    writeTabDrag(dt, { surface: 'sidebar:right', key: 'k' });
    expect(readTabDrag(dt)).toEqual({ surface: 'sidebar:right', key: 'k' });
  });

  it.each([
    ['nothing', undefined],
    ['text that does not parse', '{'],
    ['no surface', JSON.stringify({ key: 'k' })],
    ['a key that is not a string', JSON.stringify({ surface: 'main', key: 1 })],
    ['a leaf that is not a string', JSON.stringify({ surface: 'main', key: 'k', leafId: 2 })],
  ])('reads %s as null', (_name, raw) => {
    const dt = transfer();
    if (raw !== undefined) dt.setData(TAB_DRAG_MIME, raw);
    expect(readTabDrag(dt)).toBeNull();
  });
});

describe('canMoveTo', () => {
  it('lets a mount with no policy go anywhere', () => {
    expect(canMoveTo({ surface: 'main' }, 'sidebar:right')).toBe(true);
    expect(canMoveTo({ surface: 'main', policy: {} }, 'window:1')).toBe(true);
  });

  it('keeps a mount with movable false on its surface', () => {
    expect(canMoveTo({ surface: 'main', policy: { movable: false } }, 'sidebar:right')).toBe(false);
  });

  it('always lets a mount move inside its own surface', () => {
    expect(canMoveTo({ surface: 'main', policy: { movable: false } }, 'main')).toBe(true);
  });
});
