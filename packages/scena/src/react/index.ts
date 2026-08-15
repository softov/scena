export { Scena } from './Scena.js';
export { ScenaProvider, useScena } from './ScenaProvider.js';
export { DefaultShell } from './DefaultShell.js';
export { ViewMount, MountWrapper } from './ViewMount.js';
export { ShellSplitter } from './ShellSplitter.js';
export { SurfaceArea } from './SurfaceArea.js';
export type { SurfaceAreaProps } from './SurfaceArea.js';
// The two resize models. `ShellSplitter` is an element the shell places between
// surfaces; `useSurfaceResize` (reached through SurfaceArea's `resize` prop, or
// directly for a custom surface component) puts the grip on the surface's own
// edge. A shell picks one per surface.
export { useSurfaceResize } from './useSurfaceResize.js';
export type { SurfaceResizeSpec, SurfaceResizeBinding } from './useSurfaceResize.js';
export {
  MountContext,
  DataContextContext,
  WriteContext,
  useCurrentMountKey,
  useDataContext,
  useWriteBack,
} from './mount-context.js';

export { useStore, useStoreSetter } from './hooks/useStore.js';
export { useI18n } from './hooks/useI18n.js';
export type { UseI18nResult } from './hooks/useI18n.js';
export { useLabel } from './hooks/useLabel.js';
export { Translate, Translate as T } from './Translate.js';
export type { TranslateProps } from './Translate.js';
export { useCommand } from './hooks/useCommand.js';
export { useLayout } from './hooks/useLayout.js';
export { useMounts } from './hooks/useMounts.js';
export { useSurfacePresentation } from './hooks/useSurfacePresentation.js';
