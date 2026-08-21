import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import type {
  Action,
  BindingPath,
  ComponentNode,
  DataBinding,
  FunctionCall,
  PropValue,
} from '../sdk/component-graph.js';
import {
  isAction,
  isComponentNode,
  isDataBinding,
  isDynamicChildList,
  isFunctionCall,
} from '../sdk/component-graph.js';
import type { ComponentDefinition } from '../sdk/component-registry.js';
import type { Disposable } from '../sdk/disposable.js';
import type { Scena } from '../sdk/scena.js';
import { useScena } from './ScenaProvider.js';
import {
  DataContextContext,
  MountContext,
  WriteContext,
  type WriteBack,
  useCurrentMountKey,
  useDataContext,
} from './mount-context.js';
import { joinAbsolute, readPath } from '../core/resolve/path-resolver.js';
import {
  resolveAction,
  resolveDynamicValue,
  writeDynamic,
} from '../core/resolve/dynamic-resolver.js';
import { rewriteLocal } from '../core/store/reactive-store.js';

const RESERVED_KEYS = new Set(['id', 'component', '$meta']);

const reactComponentCache = new WeakMap<
  ComponentDefinition,
  ComponentType<Record<string, unknown>>
>();
const reactLoadingPromises = new WeakMap<
  ComponentDefinition,
  Promise<ComponentType<Record<string, unknown>>>
>();

async function loadReactComponent(
  def: ComponentDefinition,
): Promise<ComponentType<Record<string, unknown>>> {
  if (def.renderer.kind !== 'react') {
    throw new Error(
      `Cannot load non-react component "${def.component}" through React adapter`,
    );
  }
  const cached = reactComponentCache.get(def);
  if (cached) return cached;
  let pending = reactLoadingPromises.get(def);
  if (pending) return pending;
  pending = def.renderer.load().then((mod) => {
    const C = mod.default as ComponentType<Record<string, unknown>>;
    reactComponentCache.set(def, C);
    return C;
  });
  reactLoadingPromises.set(def, pending);
  return pending;
}

// Compute the absolute store path a DataBinding resolves to in this render,
// applying mount-local rewriting and data-context joining. Returns undefined
// when the path can't be normalized (e.g., relative path with no data context).
function normalizePath(
  path: BindingPath,
  mountKey: string | null,
  dataContext: BindingPath | undefined,
): BindingPath | undefined {
  try {
    if (path.startsWith('/') && !path.startsWith('$/')) {
      return joinAbsolute(dataContext, path);
    }
    return rewriteLocal(path, mountKey);
  } catch {
    return undefined;
  }
}

// Walks every prop value of `node` and collects the absolute store paths the
// renderer needs to subscribe to so re-renders fire when source data changes.
function collectPaths(
  node: ComponentNode,
  mountKey: string | null,
  dataContext: BindingPath | undefined,
  out: Set<BindingPath>,
): void {
  for (const [k, v] of Object.entries(node)) {
    if (RESERVED_KEYS.has(k)) continue;
    collectFromValue(v, mountKey, dataContext, out);
  }
}

function collectFromValue(
  v: unknown,
  mountKey: string | null,
  dataContext: BindingPath | undefined,
  out: Set<BindingPath>,
): void {
  if (v === null || typeof v !== 'object') return;
  if (isComponentNode(v)) {
    // Nested ViewMount handles its own subscriptions.
    return;
  }
  // Order matters: more-specific shapes first, so DataBinding's "just path"
  // structural guard doesn't accidentally catch a `{ template, path }`
  // DynamicChildList or `{ event }`/`{ functionCall }` Action.
  if (isAction(v)) {
    if ('event' in v && v.event.context) {
      for (const arg of Object.values(v.event.context)) {
        collectFromValue(arg, mountKey, dataContext, out);
      }
    } else if ('functionCall' in v && v.functionCall.args) {
      for (const arg of Object.values(v.functionCall.args)) {
        collectFromValue(arg, mountKey, dataContext, out);
      }
    }
    return;
  }
  if (isDynamicChildList(v)) {
    const abs = normalizePath(v.path, mountKey, dataContext);
    if (abs) out.add(abs);
    return;
  }
  if (isFunctionCall(v)) {
    if (v.args) {
      for (const arg of Object.values(v.args)) {
        collectFromValue(arg, mountKey, dataContext, out);
      }
    }
    return;
  }
  if (isDataBinding(v)) {
    const abs = normalizePath(v.path, mountKey, dataContext);
    if (abs) out.add(abs);
    return;
  }
  if (Array.isArray(v)) {
    for (const item of v) collectFromValue(item, mountKey, dataContext, out);
    return;
  }
  for (const inner of Object.values(v as Record<string, unknown>)) {
    collectFromValue(inner, mountKey, dataContext, out);
  }
}

// Resolves one prop value to its render-time form:
//   ComponentNode      → <ViewMount node={...} />
//   ComponentNode[]    → array of <ViewMount />
//   { template, path } → array of <ViewMount /> per item; each gets a data context
//   DataBinding        → resolved store value
//   FunctionCall       → resolved (invoked) value
//   Action             → 0-arg async handler
//   literal / object   → pass through (recurse into nested arrays/objects)
function resolveProp(
  v: unknown,
  scena: Scena,
  mountKey: string | null,
  dataContext: BindingPath | undefined,
): unknown {
  if (v === null || typeof v !== 'object') return v;

  if (isComponentNode(v)) {
    return <ViewMount node={v} />;
  }
  if (Array.isArray(v) && v.every(isComponentNode)) {
    return (v as ComponentNode[]).map((n, i) => (
      <ViewMount key={n.id ?? i} node={n} />
    ));
  }

  if (isAction(v)) {
    return resolveAction(v as Action, dataContext, scena, mountKey);
  }

  if (isDynamicChildList(v)) {
    const listValue = readPath(scena.store, dataContext, v.path);
    if (!Array.isArray(listValue)) return [];
    const baseAbs = normalizePath(v.path, mountKey, dataContext);
    return listValue.map((_, i) => {
      const itemContext = baseAbs
        ? (`${baseAbs}/${i}` as BindingPath)
        : undefined;
      return (
        <DataContextContext.Provider key={i} value={itemContext}>
          <ViewMount node={v.template} />
        </DataContextContext.Provider>
      );
    });
  }

  if (isFunctionCall(v)) {
    return resolveDynamicValue(v as FunctionCall, dataContext, scena);
  }
  if (isDataBinding(v)) {
    return readPath(scena.store, dataContext, (v as DataBinding).path);
  }

  if (Array.isArray(v)) {
    return v.map((item) => resolveProp(item, scena, mountKey, dataContext));
  }

  // Plain object — recurse element-wise. Useful for nested arg structs.
  const out: Record<string, unknown> = {};
  for (const [k, inner] of Object.entries(v as Record<string, unknown>)) {
    out[k] = resolveProp(inner, scena, mountKey, dataContext);
  }
  return out;
}

interface ViewMountProps {
  node: ComponentNode;
}

export function ViewMount({ node }: ViewMountProps) {
  const scena = useScena();
  const mountKey = useCurrentMountKey();
  const dataContext = useDataContext();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [LoadedComponent, setLoadedComponent] = useState<
    ComponentType<Record<string, unknown>> | null
  >(null);

  const def = scena.components.get(node.component);

  useEffect(() => {
    const sub = scena.events.on('scena:registry:changed', (payload) => {
      if ((payload as { registry: string }).registry === 'components') force();
    });
    return () => sub.dispose();
  }, [scena]);

  useEffect(() => {
    if (!def || def.renderer.kind !== 'react') {
      setLoadedComponent(null);
      return;
    }
    const cached = reactComponentCache.get(def);
    if (cached) {
      setLoadedComponent(() => cached);
      return;
    }
    let cancelled = false;
    void loadReactComponent(def).then((C) => {
      if (!cancelled) setLoadedComponent(() => C);
    });
    return () => {
      cancelled = true;
    };
  }, [def]);

  // Write-back setter scoped to THIS node. Bidirectional inputs use
  // useWriteBack(propName)(next) to push user input through the resolver.
  // Silently no-ops if the named prop isn't a DataBinding.
  const writeBack = useCallback<WriteBack>(
    (propName, next) => {
      const original = node[propName];
      if (
        original === null ||
        typeof original !== 'object' ||
        !('path' in (original as object))
      ) {
        return;
      }
      try {
        writeDynamic(original as PropValue, dataContext, scena, next);
      } catch (err) {
        console.warn(`[scena.write] prop "${propName}" not writable:`, err);
      }
    },
    [node, dataContext, scena],
  );

  const subsRef = useRef<Disposable[]>([]);
  useEffect(() => {
    subsRef.current.forEach((d) => d.dispose());
    const paths = new Set<BindingPath>();
    collectPaths(node, mountKey, dataContext, paths);
    subsRef.current = [...paths].map((p) =>
      scena.store.subscribe(p, () => force()),
    );
    return () => {
      subsRef.current.forEach((d) => d.dispose());
      subsRef.current = [];
    };
  }, [node, scena, mountKey, dataContext]);

  // Component mount lifecycle — runs once per mounted instance; the returned
  // function (if any) runs on unmount. Lets a component (esp. a template) set
  // up timers / event subscriptions / store seeding. See ComponentMountHandler.
  useEffect(() => {
    if (!def?.onMount) return;
    const cleanup = def.onMount({ scena, store: scena.store, mountKey, dataContext });
    return typeof cleanup === 'function' ? cleanup : undefined;
  }, [def, scena, mountKey, dataContext]);

  if (!def) {
    return (
      <span
        className="oo-missing"
        title={`No component registered for "${node.component}"`}
      >
        [{node.component}]
      </span>
    );
  }

  if (def.renderer.kind === 'template') {
    return <ViewMount node={def.renderer.template} />;
  }

  const props = resolveProps(node, scena, mountKey, dataContext);

  if (def.renderer.kind === 'html') {
    return <HtmlMount def={def} props={props} />;
  }

  if (!LoadedComponent) {
    return (
      <span className="oo-loading-dots" aria-busy="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
    );
  }

  // `children` prop becomes React children; everything else stays as a prop.
  const { children: childrenProp, ...rest } = props;
  return (
    <WriteContext.Provider value={writeBack}>
      <LoadedComponent {...rest}>
        {childrenProp as ReactNode}
      </LoadedComponent>
    </WriteContext.Provider>
  );
}

function resolveProps(
  node: ComponentNode,
  scena: Scena,
  mountKey: string | null,
  dataContext: BindingPath | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (RESERVED_KEYS.has(k)) continue;
    out[k] = resolveProp(v as PropValue, scena, mountKey, dataContext);
  }
  return out;
}

function HtmlMount({
  def,
  props,
}: {
  def: ComponentDefinition;
  props: Record<string, unknown>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const disposableRef = useRef<Disposable | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    if (def.renderer.kind !== 'html') return;
    disposableRef.current?.dispose();
    disposableRef.current = def.renderer.mount(hostRef.current, props);
    return () => {
      disposableRef.current?.dispose();
      disposableRef.current = null;
    };
  }, [def, props]);

  return <div ref={hostRef} />;
}

export function MountWrapper({
  mountKey,
  dataContext,
  children,
}: {
  mountKey: string;
  dataContext?: BindingPath;
  children: ReactNode;
}) {
  return (
    <MountContext.Provider value={mountKey}>
      <DataContextContext.Provider value={dataContext}>
        {children}
      </DataContextContext.Provider>
    </MountContext.Provider>
  );
}
