// a2ui v0.10 component graph types.
//
// A page IS its root ComponentNode. Children are nested inline as ComponentNode
// values on `child` / `children` props (no flat-by-id map, no slots bag).
// Three structural keys are reserved on every node: `id`, `component`, `$meta`.

export type NodeId = string;

// JSON Pointer-style path (RFC 6901-shaped).
// `$/seg/seg`  — absolute (escapes to the store root); first segment = scope.
// `/seg/seg`   — relative (resolved against the surrounding data context).
// `..` is forbidden — escape to root with `$/` instead.
// `*` wildcard segment is allowed in subscriptions only (writes throw).
// `#/seg/seg`  — the value at this path is itself a path; resolved with one extra hop.
// `{{ /seg/seg }}` inside a path string substitutes another path's value before resolution.
export type BindingPath = `$/${string}` | `/${string}`;

export type DataBinding = { path: BindingPath };

export type FunctionCall = {
  call: string;
  args?: Record<string, PropValue>;
  callableFrom?: 'clientOnly';
  returnType?: string;
};

// DynamicValue = literal | path-read | function-call. Excludes Action and children.
export type DynamicValue =
  | string
  | number
  | boolean
  | string[]
  | DataBinding
  | FunctionCall;

export type DynamicString     = string   | DataBinding | FunctionCall;
export type DynamicNumber     = number   | DataBinding | FunctionCall;
export type DynamicBoolean    = boolean  | DataBinding | FunctionCall;
export type DynamicStringList = string[] | DataBinding | FunctionCall;

// Static inline list OR dynamic templated list (one instance of `template` per
// item at `path`).
export type ChildList =
  | ComponentNode[]
  | { template: ComponentNode; path: BindingPath };

// Discriminated by KEY PRESENCE.
//   'event' in action        → server-routed event
//   'functionCall' in action → client-side command
export type Action =
  | {
      event: {
        name: string;
        context?: Record<string, PropValue>;
        wantResponse?: boolean;
        responsePath?: BindingPath;
      };
    }
  | { functionCall: FunctionCall };

export type CheckRule = {
  condition: DynamicBoolean;
  message?: DynamicString;
};

export type Checkable = {
  checks?: CheckRule[];
};

export type AccessibilityAttributes = {
  label?: DynamicString;
  description?: DynamicString;
};

export type PropValue =
  | string
  | number
  | boolean
  | null
  | DataBinding
  | FunctionCall
  | Action
  | ComponentNode
  | ComponentNode[]
  | { template: ComponentNode; path: BindingPath }
  | { [k: string]: PropValue }
  | PropValue[];

// Internal-only — stripped before any node is serialized back to a sender.
export type NodeMeta = {
  origin?: { format: string; version?: string; sourceNodeId?: NodeId };
  fallback?: ComponentNode;
};

export type ComponentNode = {
  id?: NodeId;
  component: string;
  $meta?: NodeMeta;
  child?: PropValue | unknown;
  children?: PropValue | unknown;
  [prop: string]: unknown;
};

// A page IS its root ComponentNode. No separate {root, nodes} flat map.
export type PageState = ComponentNode;

/**
 * What each component reads off its own node, keyed by the component's name.
 *
 * The same arrangement as `CommandArgs`, for the same reason and with the same
 * emptiness here: scena renders whatever an app registered and cannot know the
 * props of components it has never seen. An app augments it -
 *
 *   declare module '@softov/scena/sdk' {
 *     interface ComponentProps {
 *       'Advisor.SessionPanel': { resourceId?: string; host?: string };
 *     }
 *   }
 *
 * Declare a prop optional unless the component genuinely cannot render
 * without it. A placeholder mount that supplies nothing is a normal thing to
 * write, and what actually goes wrong is not an absent prop - it is a prop
 * spelled a way the component does not read, which is carried through the tree
 * and dropped in silence.
 */
export interface ComponentProps {}

/** The components somebody has declared props for. `never` until one is. */
export type KnownComponent = keyof ComponentProps & string;

/** The keys a node carries for the runtime rather than for the component. */
type NodeIntrinsics = 'id' | 'component' | '$meta' | 'child' | 'children';

/**
 * A node checked against its component's declaration, if it has one.
 *
 * `ComponentNode` ends in `[prop: string]: unknown`, which is what makes a
 * mount data rather than a call - and which switches TypeScript's
 * excess-property check off, because every key is a known key. So the check
 * has to be built rather than inherited: every prop the node carries that the
 * component does not declare is mapped to `never`, and a value assigned to
 * `never` is an error naming that key.
 *
 * A component with no declaration, and anything that is not a component node,
 * pass through untouched.
 */
export type CheckedNode<T> =
  T extends { component: infer C }
    ? C extends KnownComponent
      ? ComponentProps[C]
        & { component: C; id?: NodeId; $meta?: NodeMeta }
        & {
            [K in Exclude<
              keyof T,
              NodeIntrinsics | keyof ComponentProps[C]
            >]: never;
          }
      : T
    : T;

export function isComponentNode(v: unknown): v is ComponentNode {
  return (
    typeof v === 'object' &&
    v !== null &&
    'component' in v &&
    typeof (v as ComponentNode).component === 'string'
  );
}

export function isDataBinding(v: unknown): v is DataBinding {
  return (
    typeof v === 'object' &&
    v !== null &&
    'path' in v &&
    typeof (v as DataBinding).path === 'string' &&
    !('component' in v) &&
    !('template' in v) &&
    !('componentId' in v)
  );
}

export function isFunctionCall(v: unknown): v is FunctionCall {
  return (
    typeof v === 'object' &&
    v !== null &&
    'call' in v &&
    typeof (v as FunctionCall).call === 'string' &&
    !('component' in v)
  );
}

export function isAction(v: unknown): v is Action {
  return (
    typeof v === 'object' &&
    v !== null &&
    ('event' in v || 'functionCall' in v) &&
    !('component' in v)
  );
}

export function isDynamicChildList(
  v: unknown,
): v is { template: ComponentNode; path: BindingPath } {
  return (
    typeof v === 'object' &&
    v !== null &&
    'template' in v &&
    'path' in v &&
    isComponentNode((v as { template: unknown }).template)
  );
}
