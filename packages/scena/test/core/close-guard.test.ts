import { describe, it, expect } from 'vitest';
import { createScena } from '../../src/core/scena.js';
import { registerLayoutCommands } from '../../src/runtime/layout-commands.js';
import type { CloseAsk } from '../../src/sdk/mount-surface.js';

function opened(...keys: string[]) {
  const scena = createScena();
  for (const key of keys) scena.surfaces.open({ surface: 'main', key, resource: { component: 'Doc' }, props: { title: key.toUpperCase() } });
  const asks: (CloseAsk | null)[] = [];
  scena.events.on('scena:mount:close-asked', (ask) => asks.push(ask as CloseAsk | null));
  const keysAt = () => scena.surfaces.listAt('main').map((m) => m.key);
  return { scena, asks, keysAt };
}

/**
 * A mount with pending work declares it, so a close a person starts asks
 * first. A close from code does not ask.
 */
describe('close guards', () => {
  it('closes at once when no guard gives a reason', () => {
    const { scena, asks, keysAt } = opened('a');
    scena.surfaces.guardClose('a', () => null);
    scena.surfaces.requestClose('a');
    expect(keysAt()).toEqual([]);
    expect(asks).toEqual([]);
  });

  it('asks when a guard gives a reason, and closes on yes', () => {
    const { scena, asks, keysAt } = opened('a');
    scena.surfaces.guardClose('a', () => 'Unsaved changes');
    scena.surfaces.requestClose('a');
    expect(keysAt()).toEqual(['a']);
    expect(asks).toEqual([{ key: 'a', title: 'A', reason: 'Unsaved changes' }]);
    expect(scena.surfaces.closeAsked()).toEqual({ key: 'a', title: 'A', reason: 'Unsaved changes' });

    scena.surfaces.answerClose(true);
    expect(keysAt()).toEqual([]);
    expect(scena.surfaces.closeAsked()).toBeNull();
    expect(asks.at(-1)).toBeNull();
  });

  it('keeps the mount open on no', () => {
    const { scena, keysAt } = opened('a');
    scena.surfaces.guardClose('a', () => 'Unsaved changes');
    scena.surfaces.requestClose('a');
    scena.surfaces.answerClose(false);
    expect(keysAt()).toEqual(['a']);
    expect(scena.surfaces.closeAsked()).toBeNull();
  });

  it('reads the guard when the close is asked for, not when it was declared', () => {
    const { scena, keysAt } = opened('a');
    let dirty = false;
    scena.surfaces.guardClose('a', () => (dirty ? 'Unsaved changes' : null));
    dirty = true;
    scena.surfaces.requestClose('a');
    expect(scena.surfaces.closeAsked()?.reason).toBe('Unsaved changes');
    dirty = false;
    scena.surfaces.answerClose(false);
    scena.surfaces.requestClose('a');
    expect(keysAt()).toEqual([]);
  });

  it('does not ask on a close from code', () => {
    const { scena, asks, keysAt } = opened('a');
    scena.surfaces.guardClose('a', () => 'Unsaved changes');
    scena.surfaces.close('a');
    expect(keysAt()).toEqual([]);
    expect(asks).toEqual([]);
  });

  it('asks one close at a time, in order', () => {
    const { scena, keysAt } = opened('a', 'b', 'c');
    scena.surfaces.guardClose('a', () => 'A is edited');
    scena.surfaces.guardClose('c', () => 'C is edited');
    for (const key of ['a', 'b', 'c']) scena.surfaces.requestClose(key);
    expect(keysAt()).toEqual(['a', 'c']);
    expect(scena.surfaces.closeAsked()?.key).toBe('a');
    scena.surfaces.answerClose(false);
    expect(scena.surfaces.closeAsked()?.key).toBe('c');
    scena.surfaces.answerClose(true);
    expect(keysAt()).toEqual(['a']);
    expect(scena.surfaces.closeAsked()).toBeNull();
  });

  it('stops asking when the mount closes some other way, and forgets its guards', () => {
    const { scena, keysAt } = opened('a');
    scena.surfaces.guardClose('a', () => 'Unsaved changes');
    scena.surfaces.requestClose('a');
    scena.surfaces.close('a');
    expect(scena.surfaces.closeAsked()).toBeNull();

    scena.surfaces.open({ surface: 'main', key: 'a', resource: { component: 'Doc' } });
    scena.surfaces.requestClose('a');
    expect(keysAt()).toEqual([]);
  });

  it('stops guarding when the guard is disposed', () => {
    const { scena, keysAt } = opened('a');
    const guard = scena.surfaces.guardClose('a', () => 'Unsaved changes');
    guard.dispose();
    scena.surfaces.requestClose('a');
    expect(keysAt()).toEqual([]);
  });

  it('routes the close commands through the guard', async () => {
    const { scena, keysAt } = opened('a', 'b');
    scena.surfaces.guardClose('b', () => 'B is edited');
    registerLayoutCommands(scena);
    await scena.execute('surface.closeAll');
    expect(keysAt()).toEqual(['b']);
    expect(scena.surfaces.closeAsked()?.key).toBe('b');
  });
});
