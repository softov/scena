import { describe, it, expect } from 'vitest';
import {
  parsePath,
  joinSegments,
  readPath,
  writePath,
} from '../../src/core/resolve/path-resolver.js';
import { createReactiveStore } from '../../src/core/store/reactive-store.js';
import { createEventBus } from '../../src/core/controls/events.js';
import type { BindingPath } from '../../src/sdk/component-graph.js';

const p = (s: string) => s as BindingPath;
function mk() {
  return createReactiveStore({ events: createEventBus() });
}

describe('path-resolver', () => {
  it('parses absolute + relative, rejects ..', () => {
    expect(parsePath(p('$/a/b'))).toEqual({ absolute: true, segments: ['a', 'b'] });
    expect(parsePath(p('/a/b'))).toEqual({ absolute: false, segments: ['a', 'b'] });
    expect(() => parsePath(p('$/a/../b'))).toThrow();
  });

  it('RFC6901 escapes round-trip', () => {
    expect(parsePath(p('$/a/some~1bar')).segments).toEqual(['a', 'some/bar']);
    expect(joinSegments(['a', 'some/bar'])).toBe('$/a/some~1bar');
  });

  it('readPath descends into stored objects/arrays', () => {
    const store = mk();
    store.set(p('$/a'), { list: [{ name: 'x' }] });
    expect(readPath(store, undefined, p('$/a/list/0/name'))).toBe('x');
  });

  it('{{ }} interpolation substitutes an inner path value', () => {
    const store = mk();
    store.set(p('$/sel/id'), 'u_42');
    store.set(p('$/users/u_42/name'), 'Ann');
    expect(readPath(store, undefined, p('$/users/{{ $/sel/id }}/name'))).toBe('Ann');
  });

  it('#/ indirection resolves one hop', () => {
    const store = mk();
    store.set(p('$/ref/target'), '$/users/u_42/name');
    store.set(p('$/users/u_42/name'), 'Ann');
    expect(readPath(store, undefined, p('#/ref/target'))).toBe('Ann');
  });

  it('readPath rejects wildcard; writePath rejects #/', () => {
    const store = mk();
    expect(() => readPath(store, undefined, p('$/a/*'))).toThrow();
    expect(() => writePath(store, undefined, p('#/a/b'), 1)).toThrow();
  });
});
