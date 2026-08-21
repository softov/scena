import type { Disposable, Scena } from '@softov/scena/types';
import { combineDisposables } from '@softov/scena';
import { registerBuiltins, registerBuiltinLayouts } from '@softov/scena/ui/builtins';
import { registerChrome } from './chrome.js';
import { registerNotes } from './resources/notes/index.js';
import { registerTags } from './resources/tags/index.js';

/**
 * First run has no persisted layout, so no section is active and the `when`
 * clause on every sidebar mount is false -- an empty sidebar next to a full
 * activity bar. Only seeds when the key is genuinely absent, so it never
 * overrides what somebody last had open.
 */
function seedDefaultSection(scena: Scena): Disposable {
  const current = scena.layout.get().surfaces['sidebar:left'];
  if (current?.section === undefined) {
    scena.layout.setSurface('sidebar:left', { ...current, section: 'notes', visible: true });
  }
  return { dispose: () => {} };
}

/**
 * Everything this app puts into the registries, in one place.
 *
 * `sidebar.activate` is defined here for the third time -- Advisor has it in
 * shell/commands.ts, the playground in register-boot.ts, and all three do the
 * same two things: write the section and force the surface visible. An activity
 * bar that does not open the sidebar it activates looks broken, so every app
 * discovers the `visible: true` line the hard way. See README.md.
 */
export function registerApp(scena: Scena): Disposable {
  return combineDisposables(
    registerBuiltinLayouts(scena),
    registerBuiltins(scena),

    scena.commands.register({
      id: 'sidebar.activate',
      title: 'Activate sidebar section',
      run: (ctx, args) => {
        const section = (args as { section?: string } | undefined)?.section;
        if (!section) return;
        const current = ctx.scena.layout.get().surfaces['sidebar:left'];
        // `visible: true` matters: activating a section while the sidebar is
        // closed would otherwise swap what is behind a hidden panel.
        ctx.scena.layout.setSurface('sidebar:left', { ...current, section, visible: true });
      },
    }),

    registerChrome(scena),
    registerNotes(scena),
    registerTags(scena),

    seedDefaultSection(scena),
  );
}
