import { createContext, useCallback, useContext } from 'react';
import type { BindingPath } from '../types/component-graph.js';

// Active mount key — used by useStore to rewrite `$/local/<rest>` paths to
// `$/local/<mountKey>/<rest>`. Set by MountWrapper around each rendered mount.
export const MountContext = createContext<string | null>(null);

export function useCurrentMountKey(): string | null {
  return useContext(MountContext);
}

// Data context — absolute path string that anchors all `/...` relative paths
// inside a mount or template instance. Defaults to undefined (no data context).
export const DataContextContext = createContext<BindingPath | undefined>(undefined);

export function useDataContext(): BindingPath | undefined {
  return useContext(DataContextContext);
}

// Write-back — exposes a `(propName, next)` setter for the currently-rendering
// ComponentNode. Bidirectional inputs (TextField / CheckBox / Slider / …)
// call this to push user input back through the resolver. The setter silently
// no-ops when the named prop is NOT a DataBinding — that lets a component
// stay usable with literal defaults (uncontrolled-style internal state).
export type WriteBack = (propName: string, next: unknown) => void;

export const WriteContext = createContext<WriteBack | null>(null);

export function useWriteBack(propName: string): (next: unknown) => void {
  const write = useContext(WriteContext);
  return useCallback(
    (next: unknown) => {
      write?.(propName, next);
    },
    [write, propName],
  );
}
