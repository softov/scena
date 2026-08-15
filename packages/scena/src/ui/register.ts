import type { Scena } from '../types/scena.js';
import type { Disposable } from '../types/disposable.js';
import type { ComponentDefinition } from '../types/component-registry.js';
import { combineDisposables } from '../core/disposable.js';
import { CATALOG_LAYOUT_MAP } from './layout/catalog.js';
import { CATALOG_DISPLAY_MAP } from './display/catalog.js';
import { CATALOG_DATA_MAP } from './data/catalog.js';
import { CATALOG_NAVIGATION_MAP } from './navigation/catalog.js';
import { CATALOG_CONTROLS_MAP } from './control/catalog.js';
import { CATALOG_MEDIA_MAP } from './media/catalog.js';
import { CATALOG_OVERLAY_MAP } from './overlay/catalog.js';
import { CATALOG_FORMS_MAP } from './forms/catalog.js';
import { CATALOG_CHART_MAP } from './chart/catalog.js';

export function registerCatalog(defs: ComponentDefinition[], scena: Scena): Disposable {
  return combineDisposables(...defs.map((d) => scena.components.register(d)));
}

// Registers everything scena ships out of the box. Each per-folder catalog uses
// dynamic import(), so this pulls no component code at import time — boot stays
// lean and components load on first render.
//
// IMPORTANT: import registerBuiltins from '@softov/scena/ui/builtins' (this
// module), NOT from the '@softov/scena/ui' barrel — the barrel re-exports
// every component, which a non-tree-shaking dev server fetches eagerly.
export function registerBuiltins(scena: Scena): Disposable {
  return combineDisposables(
    registerCatalog(CATALOG_LAYOUT_MAP, scena),
    registerCatalog(CATALOG_DISPLAY_MAP, scena),
    registerCatalog(CATALOG_DATA_MAP, scena),
    registerCatalog(CATALOG_NAVIGATION_MAP, scena),
    registerCatalog(CATALOG_CONTROLS_MAP, scena),
    registerCatalog(CATALOG_MEDIA_MAP, scena),
    registerCatalog(CATALOG_OVERLAY_MAP, scena),
    registerCatalog(CATALOG_FORMS_MAP, scena),
    registerCatalog(CATALOG_CHART_MAP, scena),
  );
}

// Re-exported here so the boot path can pull builtins + layouts from one
// barrel-free entry. layout/register.ts lazy-loads its layout components.
export { registerBuiltinLayouts } from './layout/register.js';
