import type { Disposable } from '../types/disposable.js';
import type { SocketBridge } from '../types/reactive-store.js';

// In-memory adapter implementing the SocketBridge contract. Useful for
// tests, playgrounds, and the web-next agent simulator. Adds two extras
// beyond the contract:
//
//   dispatch(event, payload)   — simulate an incoming event from the remote.
//                                Fires every listener registered via .on(event, fn).
//   onOutgoing(event, fn)      — observe what the consumer .emit()s. Lets the
//                                simulator pretend to be the server.
export interface InMemorySocket extends SocketBridge {
  dispatch(event: string, payload?: unknown): void;
  onOutgoing(event: string, fn: (payload: unknown) => void): Disposable;
}

type Listener = (payload: unknown) => void;

export function createInMemorySocket(): InMemorySocket {
  const incoming = new Map<string, Set<Listener>>();
  const outgoing = new Map<string, Set<Listener>>();

  function add(map: Map<string, Set<Listener>>, event: string, fn: Listener): Disposable {
    let set = map.get(event);
    if (!set) {
      set = new Set();
      map.set(event, set);
    }
    set.add(fn);
    return {
      dispose() {
        set!.delete(fn);
        if (set!.size === 0) map.delete(event);
      },
    };
  }

  function fire(map: Map<string, Set<Listener>>, event: string, payload?: unknown): void {
    const set = map.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[in-memory-socket] listener for "${event}" threw:`, err);
      }
    }
  }

  return {
    on(event, fn) {
      return add(incoming, event, fn);
    },
    off(event, fn) {
      incoming.get(event)?.delete(fn);
    },
    offAll(events) {
      for (const e of events) incoming.delete(e);
    },
    emit(event, payload) {
      fire(outgoing, event, payload);
    },
    dispatch(event, payload) {
      fire(incoming, event, payload);
    },
    onOutgoing(event, fn) {
      return add(outgoing, event, fn);
    },
  };
}
