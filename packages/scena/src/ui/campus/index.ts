// Campus — generic pan/zoom canvas primitives. Originally extracted from
// SpatialLayout; reusable for flowchart editors, free-form whiteboards,
// node-graph views, etc. SpatialLayout is now a thin mount-aware adapter
// over these.

export { CampusView } from './CampusView.js';
export type {
  CampusViewProps,
  CampusNodeComponent,
  CampusNodeTypes,
} from './CampusView.js';

export { CampusNodus } from './CampusNodus.js';
export type {
  CampusNodusProps,
  DragMode,
  ResizeMode,
} from './CampusNodus.js';

export { CampusStratum } from './CampusStratum.js';
export type { CampusStratumProps } from './CampusStratum.js';

export { CampusVelum } from './CampusVelum.js';
export type { CampusVelumProps } from './CampusVelum.js';

export { CampusMappa } from './CampusMappa.js';
export type { CampusMappaProps } from './CampusMappa.js';

export { useCampus } from './context.js';
export type { CampusContextValue } from './context.js';

export { useStratumZoom } from './stratum-context.js';

export type {
  CampusBounds,
  CampusViewport,
  CampusController,
  CampusMappaNode,
  CampusNode,
  CampusNodeRenderProps,
  CampusLayerConfig,
} from './types.js';
