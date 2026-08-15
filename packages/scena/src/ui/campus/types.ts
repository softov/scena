// Public surface for the Campus primitives (CampusView/CampusNodus/
// CampusMappa). Kept in its own file so consumers can `import type` without
// pulling in the React components.

export interface CampusBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

// `panX/panY` are screen-pixel offsets applied AFTER scale — equivalent to
// `transform: translate(panX, panY) scale(scale)` on the world wrapper.
// World coord (0,0) is the origin marker; world coords may be negative.
export interface CampusViewport {
  scale: number;
  panX: number;
  panY: number;
}

// Imperative API exposed by <CampusView> via its `ref`. Consumers call these
// from toolbars / commands that live outside the campus subtree.
export interface CampusController {
  fitToView(bounds?: CampusBounds): void;
  centerOn(worldX: number, worldY: number): void;
  resetViewport(): void;
  zoomBy(factor: number): void;
  zoomToScale(scale: number): void;
}

// Optional descriptor a CampusMappa accepts. Each node renders as a thumb
// rectangle at `bounds`; `color` colors the thumb; `selected` outlines it.
export interface CampusMappaNode {
  id: string;
  bounds: CampusBounds;
  color?: string;
  selected?: boolean;
}

// ----- Data-driven node model (xyflow-style) -----

// One positioned node. `type` keys into the consumer's nodeTypes map; the
// matched component renders the node BODY inside a CampusNodus frame (the
// frame owns position/drag/resize/selection). `data` is passed through to
// that component untouched. `layer` keys into nodeLayers; a node with no
// layer (or an unknown one) falls into the default layer.
export interface CampusNode {
  id: string;
  type: string;
  bounds: CampusBounds;
  layer?: string;
  selected?: boolean;
  resizable?: boolean;
  movable?: boolean;
  data?: unknown;
}

// Per-layer config. `index` is the stacking order (higher = in front).
// `zoom`/`pan` are a STATIC transform baked into the layer relative to the
// shared viewport — they are not driven by user pan/zoom (one viewport rules
// all layers). CampusNodus folds `zoom` into its drag math so dragging stays
// 1:1 even inside a scaled layer. Default: zoom 1, pan {0,0}.
export interface CampusLayerConfig {
  index: number;
  zoom?: number;
  pan?: { x: number; y: number };
}

// Props the matched node-type component receives. `data` is whatever the
// consumer put on CampusNode.data — passed through untouched.
export interface CampusNodeRenderProps {
  id: string;
  selected: boolean;
  data: unknown;
}