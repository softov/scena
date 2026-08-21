import type {
  ChildList,
  ComponentNode,
  PropValue,
} from '../../sdk/component-graph.js';
import type { Converter } from '../../sdk/converter-registry.js';

// a2ui v0.10 converter.
//
// Accepts the spec-first shape (top-level fields on each component spec):
//
//   { id, component, child: '<id>', text: '...', variant: 'h3', ... }
//
// and the older nested-`properties` shape:
//
//   { id, component, properties: { text: '...', variant: 'h3' }, children: [...] }
//
// Value shapes also get normalized:
//   { dataBinding: { path: 'foo' } }   → { path: '/foo' }
//   { action: { type, ... } }          → { event: ... } / { functionCall: ... }
// In v0.10 spec-first JSON, values already arrive in the runtime shape
// (`{ path: '/foo' }`, `{ event: ... }`), so translateValue just passes them
// through.
//
// `child: '<id>'`           → resolves to a nested ComponentNode
// `children: ['<id>', ...]`  → resolves to an array of nested ComponentNodes
// `children: { path, componentId }` → DynamicChildList; resolves componentId
//                                     to an inline template ComponentNode

export interface A2uiComponentSpec {
  id: string;
  component: string;
  // Spec-first: any top-level prop. Plus the structural fields below.
  [k: string]: unknown;
  properties?: Record<string, unknown>;
  child?: string;
  children?: string | string[] | { path: string; componentId: string } | unknown;
}

export interface A2uiCreateSurface {
  components: Record<string, A2uiComponentSpec>;
  root: string;
  dataModel?: Record<string, unknown>;
}

export interface A2uiConverterInput {
  schema: 'a2ui/v0.10';
  surfaceId: string;
  payload: A2uiCreateSurface;
}

export const a2uiV010Converter: Converter = {
  id: 'a2ui-v0.10',
  accepts: { header: 'schema', value: 'a2ui/v0.10' },
  translate(input: unknown): ComponentNode {
    const env = input as A2uiConverterInput;
    return translateNode(env.payload.root, env);
  },
};

const RESERVED_TOP_LEVEL = new Set(['id', 'component', 'properties', 'child', 'children']);

function translateNode(
  id: string,
  env: A2uiConverterInput,
): ComponentNode {
  const spec = env.payload.components[id];
  if (!spec) {
    return {
      id,
      component: 'MissingComponent',
      reason: `a2ui component id "${id}" not found`,
    };
  }

  const node: ComponentNode = {
    id,
    component: spec.component,
    $meta: {
      origin: { format: 'a2ui', version: '0.10', sourceNodeId: id },
    },
  };

  // 1) Spec-first: every top-level key (except the structural ones) is a prop.
  for (const [k, v] of Object.entries(spec)) {
    if (RESERVED_TOP_LEVEL.has(k)) continue;
    node[k] = translateValue(v);
  }

  // 2) Backward compat: nested `properties` object.
  if (spec.properties && typeof spec.properties === 'object') {
    for (const [k, v] of Object.entries(spec.properties as Record<string, unknown>)) {
      node[k] = translateValue(v);
    }
  }

  // 3) Singular child id reference.
  if (typeof spec.child === 'string') {
    node.child = translateNode(spec.child, env);
  }

  // 4) Children — id list, single id, dynamic { path, componentId }, or inline.
  if (spec.children !== undefined) {
    node.children = translateChildren(spec.children, env);
  }

  return node;
}

function translateChildren(
  v: unknown,
  env: A2uiConverterInput,
): unknown {
  if (typeof v === 'string') {
    // single id — wrap in array
    return [translateNode(v, env)];
  }
  if (Array.isArray(v)) {
    // string[] = id list (typical); fall back to translateValue for anything else
    if (v.every((x) => typeof x === 'string')) {
      return (v as string[]).map((cid) => translateNode(cid, env));
    }
    return v.map(translateValue);
  }
  if (v && typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if (typeof obj.componentId === 'string' && typeof obj.path === 'string') {
      // DynamicChildList → runtime form needs `{ template, path }`.
      const template = translateNode(obj.componentId, env);
      const list: ChildList = {
        template,
        path: relativePath(obj.path) as `/${string}`,
      };
      return list;
    }
    if (obj.template && typeof obj.path === 'string') {
      return {
        template: obj.template as ComponentNode,
        path: relativePath(obj.path) as `/${string}`,
      };
    }
  }
  return translateValue(v);
}

function translateValue(v: unknown): PropValue {
  if (v === null || typeof v !== 'object') return v as PropValue;
  const obj = v as Record<string, unknown>;

  // Old wrapper form: { dataBinding: { path: '...' } }
  if ('dataBinding' in obj) {
    const binding = obj.dataBinding as { path: string };
    return { path: relativePath(binding.path) as `/${string}` };
  }

  // Spec-first DataBinding: { path: '<str>' } directly, often relative ('title').
  // We normalize bare segments to '/title'. Excluded shapes (component/template/
  // componentId) are handled higher up — here we just guard against false hits.
  if (
    typeof obj.path === 'string' &&
    !('component' in obj) &&
    !('template' in obj) &&
    !('componentId' in obj) &&
    !('call' in obj) &&
    !('event' in obj) &&
    !('functionCall' in obj)
  ) {
    return { path: relativePath(obj.path) as `/${string}` };
  }

  if ('action' in obj) {
    const action = obj.action as {
      type: 'event' | 'functionCall';
      name: string;
      context?: Record<string, unknown>;
      callableFrom?: 'clientOnly' | 'remoteOnly' | 'clientOrRemote';
      args?: Record<string, unknown>;
    };
    if (action.type === 'event') {
      return {
        event: {
          name: action.name,
          context: action.context as Record<string, PropValue> | undefined,
        },
      };
    }
    if (action.type === 'functionCall') {
      return {
        functionCall: {
          call: action.name,
          args: action.args as Record<string, PropValue> | undefined,
          callableFrom:
            action.callableFrom === 'clientOnly' ? 'clientOnly' : undefined,
        },
      };
    }
  }

  if (Array.isArray(v)) {
    return v.map(translateValue) as PropValue;
  }

  const out: Record<string, PropValue> = {};
  for (const [k, inner] of Object.entries(obj)) {
    out[k] = translateValue(inner);
  }
  return out;
}

// Paths like `flightNumber` or `users.0.name` → `/flightNumber` / `/users/0/name`.
// Absolute (`$/`) and relative (`/`) paths pass through unchanged.
function relativePath(p: string): string {
  if (p.startsWith('$/') || p.startsWith('/')) return p;
  return '/' + p.replace(/\./g, '/');
}
