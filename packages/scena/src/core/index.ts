// The core barrel: the store, the graph, the resolvers and the registries,
// re-exported alongside the sdk surface they implement. The runtime layer
// (surface bridge, sockets, layout/opener commands) is added on top by
// `src/index.ts`, which is what the package's root export points at.

export * from '../sdk/index.js';

export { combineDisposables, disposableFrom } from '../sdk/disposable.js';
export { walk, clone, addIds, findById, stripMeta } from './graph/component-graph.js';
export { createPermissionEngine } from './resolve/permissions.js';
export {
  createReactiveStore,
  localPath,
  rewriteLocal,
  clearMountLocal,
} from './store/reactive-store.js';
export { createBindingResolver } from './resolve/binding-resolver.js';
// Pure Label resolver. `sdk/label.ts` documents this as the intended way to
// resolve a Label outside React (useLabel is the reactive counterpart), so it
// belongs on the public surface.
export { resolveLabel } from '../sdk/label.js';
// Reference ScopeBackend implementations. The Yjs backend is a deep import
// (`core/store/backends/yjs-backend.js`) so the barrel never references `yjs`.
export {
  createStorageBackend,
  createLocalStorageStorage,
} from './store/backends/storage-backend.js';
export type { BackendStorage } from './store/backends/storage-backend.js';
// `$/modus` — display environment (size class, orientation, pointer accuracy)
// published as a scope so `when` clauses can gate surfaces on it.
export {
  createModusBackend,
  DEFAULT_MODUS_BREAKPOINTS,
} from './store/backends/modus-backend.js';
export type {
  ModusClass,
  ModusBreakpoints,
  ModusBackendOptions,
} from './store/backends/modus-backend.js';
// Maps a `$/modus` size class to how each surface occupies space. The policy
// is supplied by the app — scena ships the mechanism, not the opinion.
// `isOverlaid` tells a shell whether to drop the splitter and draw a scrim.
export { resolveSurfacePresentation, isOverlaid } from './graph/surface-presentation.js';
export type { PresentationPolicy } from './graph/surface-presentation.js';
// i18n — registry (source of truth + active locale) + the `$/t` ScopeBackend.
export {
  registerMessages,
  registerLocale,
  unregisterMessages,
  setLocale,
  getLocale,
  getLocaleInfo,
  listLocaleInfo,
  setFallbackLocale,
  listLocales,
  lookup,
  resolveMessage,
  translate,
  allKeys,
  subscribeI18n,
  clearMessages,
} from './i18n/registry.js';
export type {
  TranslateOptions,
  MessageTree,
  LocaleInfo,
  RegisterMessagesExtra,
} from './i18n/registry.js';
export { createI18nBackend } from './i18n/i18n-backend.js';
export { createComponentRegistry } from './registry/component-registry.js';
export { createConverterRegistry } from './registry/converter-registry.js';
export { createMountSurfaceRegistry } from './graph/mount-surface.js';
export { createScena } from './scena.js';
export {
  parsePath,
  joinAbsolute,
  joinSegments,
  hasWildcard,
  interpolatePath,
  readPath,
  writePath,
  scopeOf,
} from './resolve/path-resolver.js';
export {
  resolveDynamicValue,
  resolveDynamicString,
  resolveDynamicNumber,
  resolveDynamicBoolean,
  resolveDynamicStringList,
  resolveFunctionCall,
  resolveAction,
  writeDynamic,
  isWritableDynamic,
} from './resolve/dynamic-resolver.js';

export { createEventBus } from './controls/events.js';
export { createWhenEngine } from './controls/when.js';
export { createCommandRegistry } from './controls/command.js';
export { createKeybindingRegistry } from './controls/keybinding.js';
export { createLayoutAPI, createLayoutRegistry } from './controls/layout.js';
export { createSessionAPI } from './controls/session.js';
export { createShellRegistry } from './controls/shell.js';
export { createManifestAPI } from './controls/manifest.js';
export {
  createLocalStorageLayoutStorage,
  createNoopLayoutStorage,
} from './controls/storage/layout-local.js';
export { createLocalStorageSessionStorage } from './controls/storage/session-local.js';

export { registerBuiltinFunctions } from './builtins.js';

export { a2uiV010Converter } from './converters/a2ui-v0.10.js';
export type {
  A2uiCreateSurface,
  A2uiComponentSpec,
  A2uiConverterInput,
} from './converters/a2ui-v0.10.js';
