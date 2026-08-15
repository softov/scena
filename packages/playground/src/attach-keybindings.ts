import type { Disposable, Scena } from '@softov/scena/types';

// Bridges raw DOM keydown events into the scena keybindings registry.
// Without this, no command's `keys` would ever fire — the registry just
// holds bindings, it doesn't listen to the window.
//
// Behavior matches a typical editor: type-into-input events are ignored so
// 'b' inside a <textarea> doesn't trigger ctrl+b's binding (modifier-only
// chords still pass through). The resolved command runs through
// commands.executeFrom('keybinding', …) so source telemetry is correct.

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTypingTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  if (target.isContentEditable) return true;
  return TYPING_TAGS.has(target.tagName);
}

function isModifierChord(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.altKey;
}

export function attachKeybindings(scena: Scena): Disposable {
  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') return;
    if (isTypingTarget(e) && !isModifierChord(e)) return;

    const resolution = scena.keybindings.resolve({
      key: e.key,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
    if (resolution.kind === 'fire') {
      e.preventDefault();
      void scena.commands.executeFrom('keybinding', resolution.commandId, resolution.args?.[0]);
    } else if (resolution.kind === 'chord-pending') {
      e.preventDefault();
    }
  }

  window.addEventListener('keydown', onKeyDown);
  return { dispose: () => window.removeEventListener('keydown', onKeyDown) };
}
