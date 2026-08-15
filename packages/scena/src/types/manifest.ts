import type { Disposable } from './disposable.js';
import type { BindingPath, ComponentNode } from './component-graph.js';
import type { ContextValue } from './when.js';
import type { SurfaceName, MountPolicy } from './mount-surface.js';
import type { Permissions } from './permissions.js';
import type { ArgsSchema } from './command.js';
import type {
  ComponentCategory,
  ComponentDefinition,
  PropsSchema,
} from './component-registry.js';
import type { Converter } from './converter-registry.js';
import type { DataProviderDefinition, ComputedDefinition } from './reactive-store.js';

// ----- AuthorManifest (TS source, allows function references / dynamic imports) -----

export type ManifestComponent = ComponentDefinition;
export type ManifestConverter = Converter;
export type ManifestDataProvider = DataProviderDefinition;

export interface ManifestComputedPath {
  path: BindingPath;
  def: ComputedDefinition;
}

export interface ManifestCommand {
  id: string;
  title: string;
  category?: string;
  icon?: string;
  keywords?: string[];
  // Open string tags this command publishes itself into for pickers
  // (chat:input/, tab:context, resource:context, palette, ...).
  slots?: string[];
  when?: string;
  args?: ArgsSchema;
  dispatch?: 'client' | 'remote' | 'either';
  run?: string;
}

export interface ManifestKeybinding {
  keys: string;
  commandId: string;
  args?: unknown[];
  when?: string;
  scope?: { surfaceName?: SurfaceName; viewId?: string };
}

export interface ManifestView {
  surface: SurfaceName;
  key: string;
  when?: string;
  component: ComponentNode | string;
  policy?: MountPolicy;
}

export interface ManifestShell {
  id: string;
  title?: string;
  // Module specifier in RuntimeManifestJSON.
  component: string;
}

export interface Contributes {
  components?: ManifestComponent[];
  converters?: ManifestConverter[];
  dataProviders?: ManifestDataProvider[];
  computedPaths?: ManifestComputedPath[];
  commands?: ManifestCommand[];
  keybindings?: ManifestKeybinding[];
  contextKeys?: { key: BindingPath; value: ContextValue }[];
  views?: ManifestView[];
  shells?: ManifestShell[];
}

export interface ScenaManifestSource {
  id: string;
  version?: string;
  displayName?: string;
}

export interface ScenaManifest {
  source: ScenaManifestSource;
  requires?: string[];
  engine?: { scena: string };
  permissions?: Permissions;
  contributes?: Contributes;
}

// ----- RuntimeManifestJSON (pood reads this; no functions; module specifiers only) -----

export interface RuntimeManifestComponent {
  component: string;
  category?: ComponentCategory;
  propsSchema?: PropsSchema;
  fallback?: ComponentNode;
  renderer:
    | { kind: 'react'; module: string }
    | { kind: 'template'; template: ComponentNode }
    | { kind: 'html'; module: string };
}

export interface RuntimeManifestCommand {
  id: string;
  title: string;
  category?: string;
  icon?: string;
  keywords?: string[];
  slots?: string[];
  when?: string;
  args?: ArgsSchema;
  dispatch?: 'client' | 'remote' | 'either';
  run?: string;
}

export interface RuntimeManifestJSON {
  source: ScenaManifestSource;
  requires?: string[];
  engine?: { scena: string };
  permissions?: Permissions;
  contributes?: {
    components?: RuntimeManifestComponent[];
    converters?: { id: string; module: string }[];
    dataProviders?: {
      namespace: string;
      module: string;
      load?: 'lazy' | 'eager';
      unloadAfter?: string | number;
    }[];
    computedPaths?: { path: BindingPath; module: string }[];
    commands?: RuntimeManifestCommand[];
    keybindings?: ManifestKeybinding[];
    contextKeys?: { key: BindingPath; value: ContextValue }[];
    views?: ManifestView[];
    shells?: { id: string; title?: string; module: string }[];
  };
}

// ----- ManifestLoader / ManifestAPI -----

export interface ManifestLoader {
  resolve(spec: string, source: ScenaManifestSource): Promise<unknown>;
}

export interface ManifestAPI {
  load(manifest: ScenaManifest, loader: ManifestLoader): Promise<Disposable>;
  loadRuntime(manifest: RuntimeManifestJSON, loader: ManifestLoader): Promise<Disposable>;
  unload(sourceId: string): void;
  listSources(): ScenaManifestSource[];
}
