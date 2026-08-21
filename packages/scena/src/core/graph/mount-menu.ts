import type { Disposable } from '../../sdk/disposable.js';
import type { PickerAction } from '../../sdk/host.js';
import type { ResolvedMount } from '../../sdk/mount-surface.js';
import type {
  MountMenuContributor,
  MountMenuRegistry,
} from '../../sdk/mount-menu.js';
import { disposableFrom } from '../../sdk/disposable.js';

export function createMountMenuRegistry(): MountMenuRegistry {
  const bySlot = new Map<string, Set<MountMenuContributor>>();

  function register(slot: string, contributor: MountMenuContributor): Disposable {
    let set = bySlot.get(slot);
    if (!set) {
      set = new Set();
      bySlot.set(slot, set);
    }
    set.add(contributor);
    return disposableFrom(() => set!.delete(contributor));
  }

  function collect(slot: string, mount: ResolvedMount): PickerAction[] {
    const set = bySlot.get(slot);
    if (!set) return [];
    const out: PickerAction[] = [];
    for (const fn of set) out.push(...fn(mount));
    return out;
  }

  return { register, collect };
}
