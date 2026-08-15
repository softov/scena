import type { EventBus } from '../types/events.js';
import type { ShellDefinition, ShellRegistry } from '../types/shell.js';
import { disposableFrom } from '../core/disposable.js';

interface Deps {
  events: EventBus;
  initialId?: string;
}

export function createShellRegistry(deps: Deps): ShellRegistry {
  const { events } = deps;
  const shells = new Map<string, ShellDefinition>();
  let activeId: string | null = deps.initialId ?? null;

  function announce(): void {
    events.emit('scena:registry:changed', { registry: 'shells' });
  }

  return {
    register(def) {
      shells.set(def.id, def);
      if (!activeId) {
        activeId = def.id;
        events.emit('scena:shell:changed', { shellId: def.id });
      }
      announce();
      return disposableFrom(() => {
        if (shells.get(def.id) === def) {
          shells.delete(def.id);
          if (activeId === def.id) activeId = null;
          announce();
        }
      });
    },
    unregister(id) {
      if (shells.delete(id)) {
        if (activeId === id) activeId = null;
        announce();
      }
    },
    list() {
      return [...shells.values()];
    },
    setActive(id) {
      if (!shells.has(id)) throw new Error(`Shell "${id}" not registered`);
      if (activeId === id) return;
      activeId = id;
      events.emit('scena:shell:changed', { shellId: id });
    },
    getActive() {
      return activeId ? shells.get(activeId) ?? null : null;
    },
  };
}
