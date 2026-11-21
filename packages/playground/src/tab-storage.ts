import type { Disposable, Scena, SurfaceName } from '@softov/scena/types';
import { createLocalStorageSessionStorage, isWindowSurface } from '@softov/scena';

// The open tabs, kept across a reload. scena saves every surface's mounts;
// the playground reopens only the tab surfaces and the windows' surfaces. The chrome (titlebar,
// activity bar, sidebar sections) registers itself again on boot, and
// reopening it would force mounts visible that a `when` hides.
export const tabStorage = createLocalStorageSessionStorage({ key: 'scena-dev.session.v1' });

const TAB_SURFACES = new Set<SurfaceName>(['main', 'sidebar:right']);

// Call after the shell registered its components: restore skips a mount whose
// component is not registered yet.
export function keepTabs(scena: Scena): Disposable {
  let persist: Disposable | undefined;
  let disposed = false;
  void (async () => {
    const snap = await tabStorage.load();
    if (disposed) return;
    if (snap) {
      await scena.session.restore({ ...snap, mounts: snap.mounts.filter((m) => TAB_SURFACES.has(m.surface) || isWindowSurface(m.surface)) });
    }
    if (!disposed) persist = scena.session.enableAutoPersist({ debounceMs: 300 });
  })();
  return {
    dispose() {
      disposed = true;
      persist?.dispose();
    },
  };
}
