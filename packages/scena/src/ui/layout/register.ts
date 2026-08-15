import { lazy } from 'react';
import type { Scena } from '../../types/scena.js';
import type { Disposable } from '../../types/disposable.js';
import { combineDisposables } from '../../core/disposable.js';

// Layout components are React.lazy so registering them pulls no layout code at
// boot — each surface render strategy (and the heavy SpatialLayout/Campus) only
// loads when a surface first uses it. SurfaceArea renders them inside <Suspense>.
const TabLayout = lazy(() => import('./TabLayout.js').then((m) => ({ default: m.TabLayout })));
const TabPanelLayout = lazy(() => import('./TabPanelLayout.js').then((m) => ({ default: m.TabPanelLayout })));
const SingleLayout = lazy(() => import('./SingleLayout.js').then((m) => ({ default: m.SingleLayout })));
const SplitLayout = lazy(() => import('./SplitLayout.js').then((m) => ({ default: m.SplitLayout })));
const StackLayout = lazy(() => import('./StackLayout.js').then((m) => ({ default: m.StackLayout })));
const SpatialLayout = lazy(() => import('./SpatialLayout.js').then((m) => ({ default: m.SpatialLayout })));
const RailLayout = lazy(() => import('./RailLayout.js').then((m) => ({ default: m.RailLayout })));
const InlineLayout = lazy(() => import('./InlineLayout.js').then((m) => ({ default: m.InlineLayout })));
const BarLayout = lazy(() => import('./BarLayout.js').then((m) => ({ default: m.BarLayout })));
const FloatingLayout = lazy(() => import('./FloatingLayout.js').then((m) => ({ default: m.FloatingLayout })));

// Registers all built-in surface render strategies. Call once at app boot,
// typically right after createScena.
//
// Surfaces fall back to a sensible default layout if no `appliesTo` match —
// see SurfaceArea's `defaultLayoutFor()` for the mapping.
export function registerBuiltinLayouts(scena: Scena): Disposable {
  return combineDisposables(
    scena.layouts.register({ id: 'tab', title: 'Tabs', component: TabLayout, appliesTo: ['main', 'panel:bottom'] }),
    scena.layouts.register({ id: 'tab-panel', title: 'Tab Groups', component: TabPanelLayout, appliesTo: ['main', 'panel:bottom'] }),
    scena.layouts.register({ id: 'single', title: 'Single', component: SingleLayout, appliesTo: ['main', 'sidebar:left', 'sidebar:right', 'panel:bottom', 'detached'] }),
    // alias for 'single' — the docs refer to single-mount main as 'page'.
    scena.layouts.register({ id: 'page', title: 'Page', component: SingleLayout, appliesTo: ['main'] }),
    scena.layouts.register({ id: 'split', title: 'Split', component: SplitLayout, appliesTo: ['main', 'sidebar:right'] }),
    scena.layouts.register({ id: 'stack', title: 'Stack', component: StackLayout, appliesTo: ['sidebar:right', 'sidebar:left', 'main'] }),
    scena.layouts.register({ id: 'spatial', title: 'Spatial', component: SpatialLayout, appliesTo: ['main'] }),
    scena.layouts.register({ id: 'rail', title: 'Rail', component: RailLayout, appliesTo: ['activitybar'] }),
    scena.layouts.register({ id: 'inline', title: 'Inline', component: InlineLayout, appliesTo: ['statusbar', 'titlebar'] }),
    scena.layouts.register({ id: 'bar', title: 'Bar (left / center / right)', component: BarLayout, appliesTo: ['titlebar', 'statusbar'] }),
    scena.layouts.register({ id: 'floating', title: 'Floating', component: FloatingLayout, appliesTo: ['overlay'] }),
  );
}
