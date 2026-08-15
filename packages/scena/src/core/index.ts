// Public runtime entry — re-exports the type surface alongside the factory functions.

export * from '../types/index.js';

export { combineDisposables, disposableFrom } from './disposable.js';
export { walk, clone, addIds, findById, stripMeta } from './component-graph.js';
export { createPermissionEngine } from './permissions.js';
export {
  createReactiveStore,
  localPath,
  rewriteLocal,
  clearMountLocal,
} from './reactive-store.js';
export { createBindingResolver } from './binding-resolver.js';
// Pure Label resolver. `types/label.ts` documents this as the intended way to
// resolve a Label outside React (useLabel is the reactive counterpart), so it
// belongs on the public surface.
export { resolveLabel } from './label.js';
// Reference ScopeBackend implementations. The Yjs backend is a deep import
// (`core/backends/yjs-backend.js`) so the barrel never references `yjs`.
export {
  createStorageBackend,
  createLocalStorageStorage,
} from './backends/storage-backend.js';
export type { BackendStorage } from './backends/storage-backend.js';
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
} from '../i18n/registry.js';
export type {
  TranslateOptions,
  MessageTree,
  LocaleInfo,
  RegisterMessagesExtra,
} from '../i18n/registry.js';
export { createI18nBackend } from '../i18n/i18n-backend.js';
export { createComponentRegistry } from './component-registry.js';
export { createConverterRegistry } from './converter-registry.js';
export { createMountSurfaceRegistry } from './mount-surface.js';
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
} from './path-resolver.js';
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
} from './dynamic-resolver.js';

export { createEventBus } from '../controls/events.js';
export { createWhenEngine } from '../controls/when.js';
export { createCommandRegistry } from '../controls/command.js';
export { createKeybindingRegistry } from '../controls/keybinding.js';
export { createLayoutAPI, createLayoutRegistry } from '../controls/layout.js';
export { createSessionAPI } from '../controls/session.js';
export { createShellRegistry } from '../controls/shell.js';
export { createManifestAPI } from '../controls/manifest.js';
export {
  createLocalStorageLayoutStorage,
  createNoopLayoutStorage,
} from '../controls/storage/layout-local.js';
export { createLocalStorageSessionStorage } from '../controls/storage/session-local.js';

export { validateArgs, isPermissionPath } from '../runtime/args-schema.js';
export type { ValidateArgsResult } from '../runtime/args-schema.js';

export { createSurfaceBridge } from '../runtime/surface-bridge.js';
export {
  registerClientHandler,
  getClientHandler,
} from '../runtime/client-handlers.js';
export { createInMemorySocket } from '../runtime/in-memory-socket.js';
export type { InMemorySocket } from '../runtime/in-memory-socket.js';
export { registerBuiltinFunctions } from '../runtime/builtins.js';
export { registerLayoutCommands } from '../runtime/layout-commands.js';
export { registerOpenerCommands } from '../runtime/opener-commands.js';
export type { RegisterOpenerCommandsOptions } from '../runtime/opener-commands.js';

export { a2uiV010Converter } from '../converters/a2ui-v0.10.js';
export type {
  A2uiCreateSurface,
  A2uiComponentSpec,
  A2uiConverterInput,
} from '../converters/a2ui-v0.10.js';
