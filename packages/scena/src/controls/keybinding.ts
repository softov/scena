import type { EventBus } from '../types/events.js';
import type {
  KeyEventLike,
  Keybinding,
  KeybindingRegistry,
  KeybindingResolution,
} from '../types/keybinding.js';
import type { WhenEngine } from '../types/when.js';
import { disposableFrom } from '../core/disposable.js';

interface Deps {
  events: EventBus;
  when: WhenEngine;
}

function normalizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s*\+\s*/g, '+');
}

function eventKeyOf(e: KeyEventLike): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  if (e.metaKey) parts.push('meta');
  parts.push(e.key.toLowerCase());
  return parts.join('+');
}

export function createKeybindingRegistry(deps: Deps): KeybindingRegistry {
  const { events, when } = deps;
  const bindings: Keybinding[] = [];
  let chordBuffer: string[] = [];
  let chordTimer: ReturnType<typeof setTimeout> | null = null;

  function announce(): void {
    events.emit('scena:registry:changed', { registry: 'keybindings' });
  }

  function clearChord(): void {
    chordBuffer = [];
    if (chordTimer) {
      clearTimeout(chordTimer);
      chordTimer = null;
    }
  }

  function specificityOf(b: Keybinding): number {
    // Higher = wins. viewId > surfaceName > none.
    if (b.scope?.viewId) return 2;
    if (b.scope?.surfaceName) return 1;
    return 0;
  }

  return {
    register(binding) {
      bindings.push(binding);
      announce();
      return disposableFrom(() => {
        const idx = bindings.indexOf(binding);
        if (idx >= 0) {
          bindings.splice(idx, 1);
          announce();
        }
      });
    },

    unregister(keys, commandId) {
      const normalized = normalizeKey(keys);
      for (let i = bindings.length - 1; i >= 0; i--) {
        const b = bindings[i]!;
        if (normalizeKey(b.keys) === normalized && b.commandId === commandId) {
          bindings.splice(i, 1);
        }
      }
      announce();
    },

    list() {
      return [...bindings];
    },

    resolve(event): KeybindingResolution {
      chordBuffer.push(eventKeyOf(event));
      const enabled = bindings.filter(
        (b) => b.when === undefined || when.evaluate(b.when),
      );
      const currentChord = chordBuffer.join(' ');

      // Exact match — fire.
      const matches = enabled.filter((b) => normalizeKey(b.keys) === currentChord);
      if (matches.length > 0) {
        matches.sort((a, b) => specificityOf(b) - specificityOf(a));
        const winner = matches[0]!;
        clearChord();
        return { kind: 'fire', commandId: winner.commandId, args: winner.args };
      }

      // Pending — some binding starts with the current chord prefix.
      const prefix = `${currentChord} `;
      const partial = enabled.some((b) => normalizeKey(b.keys).startsWith(prefix));
      if (partial) {
        if (chordTimer) clearTimeout(chordTimer);
        chordTimer = setTimeout(clearChord, 1500);
        return { kind: 'chord-pending', depth: chordBuffer.length };
      }

      clearChord();
      return { kind: 'none' };
    },
  };
}
