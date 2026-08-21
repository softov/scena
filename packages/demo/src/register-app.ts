import type { Disposable, Scena } from '@softov/scena/types';
import { combineDisposables } from '@softov/scena';
import { registerThemeController } from '@softov/scena/styles';
import { registerBuiltins, registerBuiltinLayouts } from '@softov/scena/ui/builtins';
import { registerChrome } from './chrome.js';
import { registerNotes } from './resources/notes/index.js';
import { registerTags } from './resources/tags/index.js';
import { THEME_ID_KEY, THEME_MODE_KEY } from './theme-keys.js';

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
 * `sidebar.activate` and `sidebar.toggleLeft` still live here, and still have
 * to: scena's `ActivityBarItem` executes `sidebar.activate` by name but does
 * not define it, because what activating means -- which surface, whether it
 * also reveals -- is the app's decision, not the framework's. The component
 * being shared is what matters; the two lines of policy staying local is
 * correct.
 */
export function registerApp(scena: Scena): Disposable {
  return combineDisposables(
    registerBuiltinLayouts(scena),
    registerBuiltins(scena),

    // Owns applyTheme, localStorage and the OS-preference listener, so that
    // ThemePicker and ThemeModeToggle can be pure views over the store.
    registerThemeController(scena, { idKey: THEME_ID_KEY, modeKey: THEME_MODE_KEY }),

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
    scena.commands.register({
      id: 'sidebar.toggleLeft',
      title: 'Toggle left sidebar',
      run: (ctx) => {
        const current = ctx.scena.layout.get().surfaces['sidebar:left'];
        ctx.scena.layout.setSurface('sidebar:left', {
          ...current,
          visible: !(current?.visible ?? true),
        });
      },
    }),

    registerChrome(scena),
    registerNotes(scena),
    registerTags(scena),

    seedDefaultSection(scena),
  );
}
