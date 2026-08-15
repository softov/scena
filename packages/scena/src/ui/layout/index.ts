// Direct-React re-exports. Catalog registration (Row/Column/Grid) lives in
// ../catalog.ts; the layout strategies are registered (lazily) by ./register.ts.
export { Row } from './Row.js';
export { Column } from './Column.js';
export { Grid } from './Grid.js';
export type { GridProps } from './Grid.js';

export { TabLayout } from './TabLayout.js';
export { TabPanelLayout } from './TabPanelLayout.js';
export { SingleLayout } from './SingleLayout.js';
export { SplitLayout } from './SplitLayout.js';
export { StackLayout } from './StackLayout.js';
export { SpatialLayout } from './SpatialLayout.js';
export { SpatialCard } from './SpatialCard.js';
export type { SpatialCardData } from './SpatialCard.js';
export { RailLayout } from './RailLayout.js';
export { InlineLayout } from './InlineLayout.js';
export { BarLayout } from './BarLayout.js';
export { FloatingLayout } from './FloatingLayout.js';
export { registerBuiltinLayouts } from './register.js';
