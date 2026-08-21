import type { Disposable } from './disposable.js';
import type { PickerAction } from './host.js';
import type { ResolvedMount } from './mount-surface.js';

// Lets a host contribute dynamic context-menu rows for a mount, keyed by the
// menu slot a layout is opening (e.g. 'tab:context'). Layouts stay generic:
// they call collect() for the right-clicked mount and pass the result as the
// ContextMenu's `extraItems` (rendered ahead of the slot commands). The
// explorer uses this to add "Open with <viewer>" alternates to a file tab —
// the same rows it already shows on the tree row menu, without TabLayout
// knowing anything about files.
export type MountMenuContributor = (mount: ResolvedMount) => PickerAction[];

export interface MountMenuRegistry {
  // Register a contributor for a slot. Multiple contributors per slot are
  // unioned in registration order. Dispose to remove it.
  register(slot: string, contributor: MountMenuContributor): Disposable;
  // Gather every registered contributor's rows for this mount + slot.
  collect(slot: string, mount: ResolvedMount): PickerAction[];
}
