import { describe, it, expect } from 'vitest';
import { createReactiveStore } from '../../src/core/store/reactive-store.js';
import { createEventBus } from '../../src/core/controls/events.js';
import { compileSelect } from '../../src/core/store/computed-dsl.js';
import type { BindingPath } from '../../src/sdk/component-graph.js';

const p = (s: string) => s as BindingPath;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
function mk() {
  return createReactiveStore({ events: createEventBus() });
}

describe('compileSelect (DSL)', () => {
  it('countWhere over a collection', () => {
    const fn = compileSelect('countWhere(active == true)');
    expect(fn({ '$/x/*': [{ active: true }, { active: false }, { active: true }] })).toBe(2);
  });
  it('sumBy', () => {
    const fn = compileSelect('sumBy(count)');
    expect(fn({ '$/x/*': [{ count: 2 }, { count: 5 }] })).toBe(7);
  });
  it('filter + map', () => {
    expect(compileSelect('filter(n > 1)')({ '$/x/*': [{ n: 0 }, { n: 2 }] })).toEqual([{ n: 2 }]);
    expect(compileSelect('map(n * 2)')({ '$/x/*': [{ n: 1 }, { n: 3 }] })).toEqual([2, 6]);
  });
  it('length + arithmetic + boolean', () => {
    expect(compileSelect('length(list)')({ '$/c/list': [1, 2, 3, 4] })).toBe(4);
    expect(compileSelect('$0 + $1')({ '$/n/a': 2, '$/n/b': 3 })).toBe(5);
    expect(compileSelect('a > 1 && b')({ '$/q/a': 2, '$/q/b': true })).toBe(true);
  });
  it('rejects an unknown select function', () => {
    expect(() => compileSelect('frobnicate(x)')).toThrow(/unknown select function/);
  });
});

describe('store.computed', () => {
  it('function select recomputes on dep change', async () => {
    const store = mk();
    store.set(p('$/n/a'), 2);
    store.set(p('$/n/b'), 3);
    await tick();
    store.computed(p('$/n/sum'), {
      from: [p('$/n/a'), p('$/n/b')],
      select: (i) => (i['$/n/a'] as number) + (i['$/n/b'] as number),
    });
    await tick();
    expect(store.get(p('$/n/sum'))).toBe(5);
    store.set(p('$/n/a'), 10);
    await tick();
    expect(store.get(p('$/n/sum'))).toBe(13);
  });

  it('string select: countWhere over a wildcard from, reactive', async () => {
    const store = mk();
    store.set(p('$/items/1'), { active: true });
    store.set(p('$/items/2'), { active: false });
    store.set(p('$/items/3'), { active: true });
    await tick();
    store.computed(p('$/stat/activeCount'), {
      from: [p('$/items/*')],
      select: 'countWhere(active == true)',
    });
    await tick();
    expect(store.get(p('$/stat/activeCount'))).toBe(2);
    store.set(p('$/items/2'), { active: true });
    await tick();
    expect(store.get(p('$/stat/activeCount'))).toBe(3);
  });

  it('rejects a dependency cycle at register time', () => {
    const store = mk();
    store.computed(p('$/cy/b'), { from: [p('$/cy/a')], select: (i) => i['$/cy/a'] });
    expect(() =>
      store.computed(p('$/cy/a'), { from: [p('$/cy/b')], select: (i) => i['$/cy/b'] }),
    ).toThrow(/cycle/);
  });
});
