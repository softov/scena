// Barrel-free boot entry for the React runtime. Just the provider + hook the
// app shell needs to mount Scena — importing this does NOT pull the heavy
// renderers (ViewMount, SurfaceArea, ShellSplitter, DefaultShell) that the full
// '@softov/scena/react' barrel re-exports. Those load via the barrel only
// once the shell actually renders (post-login / on first surface).
export { Scena } from './Scena.js';
export { ScenaProvider, useScena } from './ScenaProvider.js';
// i18n hook + <Translate> (alias <T>) — narrow entry (registry-only).
export { useI18n } from './hooks/useI18n.js';
export type { UseI18nResult } from './hooks/useI18n.js';
export { Translate, Translate as T } from './Translate.js';
export type { TranslateProps } from './Translate.js';
