import type { Disposable } from '../types/disposable.js';
import type { EventBus, ScenaEventMap } from '../types/events.js';
import { disposableFrom } from '../core/disposable.js';

// `scena:*` is reserved for runtime-emitted system events. Transport events
// (pood ↔ web socket) MUST NOT use the `scena:*` prefix — see 00-DECISIONS.md.

type AnyListener = (payload: unknown) => void;

export function createEventBus(): EventBus {
  const subs = new Map<string, Set<AnyListener>>();

  function emit(event: string, payload?: unknown): void {
    const set = subs.get(event);
    if (!set || set.size === 0) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[scena.events] listener for "${event}" threw:`, err);
      }
    }
  }

  function on(event: string, fn: AnyListener): Disposable {
    let set = subs.get(event);
    if (!set) {
      set = new Set();
      subs.set(event, set);
    }
    set.add(fn);
    return disposableFrom(() => {
      set!.delete(fn);
      if (set!.size === 0) subs.delete(event);
    });
  }

  function off(event: string, fn: AnyListener): void {
    const set = subs.get(event);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) subs.delete(event);
  }

  return {
    emit: emit as EventBus['emit'],
    on: on as EventBus['on'],
    off,
  };
}

// Re-export the system event map type for convenience.
export type { ScenaEventMap };
