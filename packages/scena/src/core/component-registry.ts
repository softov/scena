import type { EventBus } from '../types/events.js';
import type {
  ComponentDefinition,
  ComponentRegistry,
  ResolvedRenderer,
} from '../types/component-registry.js';
import { disposableFrom } from './disposable.js';

interface Deps {
  events: EventBus;
}

export function createComponentRegistry(deps: Deps): ComponentRegistry {
  const { events } = deps;
  const defs = new Map<string, ComponentDefinition>();
  const pendingResolves = new Map<string, ((r: ResolvedRenderer) => void)[]>();

  function announce(): void {
    events.emit('scena:registry:changed', { registry: 'components' });
  }

  return {
    register(def) {
      defs.set(def.component, def);
      const waiters = pendingResolves.get(def.component);
      if (waiters) {
        pendingResolves.delete(def.component);
        const resolved: ResolvedRenderer = {
          component: def.component,
          renderer: def.renderer,
          definition: def,
        };
        for (const w of waiters) w(resolved);
      }
      announce();
      return disposableFrom(() => {
        if (defs.get(def.component) === def) {
          defs.delete(def.component);
          announce();
        }
      });
    },

    unregister(component) {
      if (defs.delete(component)) announce();
    },

    get(component) {
      return defs.get(component);
    },

    list() {
      return [...defs.values()];
    },

    findOpeners(resourceKind) {
      const out: ComponentDefinition[] = [];
      for (const def of defs.values()) {
        const opens = def.opens;
        if (!opens) continue;
        const kinds = opens.resourceKinds;
        if (kinds && !kinds.includes(resourceKind)) continue;
        out.push(def);
      }
      out.sort((a, b) => (b.opens?.priority ?? 0) - (a.opens?.priority ?? 0));
      return out;
    },

    pending() {
      return [...pendingResolves.keys()];
    },

    resolve(component, options) {
      const def = defs.get(component);
      if (def) {
        return Promise.resolve({ component, renderer: def.renderer, definition: def });
      }
      return new Promise<ResolvedRenderer>((resolve, reject) => {
        let waiters = pendingResolves.get(component);
        if (!waiters) {
          waiters = [];
          pendingResolves.set(component, waiters);
        }
        waiters.push(resolve);
        const timeoutMs = options?.timeoutMs;
        if (typeof timeoutMs === 'number') {
          setTimeout(() => {
            const list = pendingResolves.get(component);
            if (!list) return;
            const idx = list.indexOf(resolve);
            if (idx >= 0) list.splice(idx, 1);
            if (list.length === 0) pendingResolves.delete(component);
            reject(new Error(`Component "${component}" not registered within ${timeoutMs}ms`));
          }, timeoutMs);
        }
      });
    },
  };
}
