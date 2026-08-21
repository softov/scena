import type { BindingPath } from '../../sdk/component-graph.js';
import type { EventBus } from '../../sdk/events.js';
import type {
  DataProviderDefinition,
  ReactiveStore,
  ScopeName,
  SocketBridge,
} from '../../sdk/reactive-store.js';
import type { ScopeBackend, ScopeBackendFactory } from '../../sdk/scope-backend.js';
import type { Disposable } from '../../sdk/disposable.js';
import { disposableFrom } from '../../sdk/disposable.js';
import { parsePath, joinSegments, hasWildcard } from '../resolve/path-resolver.js';
import { compileSelect } from './computed-dsl.js';

interface Deps {
  events: EventBus;
  socket?: SocketBridge;
  // Optional per-scope value backends. Default: every scope uses the in-memory
  // tree. A registered backend owns value storage for its scope; subscriptions
  // always stay in the store. See types/scope-backend.ts.
  backendFactories?: ScopeBackendFactory[];
}

export interface InternalReactiveStore extends ReactiveStore {
  _internalKeys(): string[];
}

// One wildcard subscription, anchored at the StoreNode of its literal prefix
// (segments before the first `*`). `pattern` is the remainder (containing `*`),
// matched against the changed path's segments below the anchor.
interface WildSub {
  pattern: string[];
  fn: (value: unknown, path: string) => void;
}

interface StoreNode {
  hasValue: boolean;
  value: unknown;
  subscribers?: Set<(value: unknown) => void>;
  wildSubs?: WildSub[];
  children?: Map<string, StoreNode>;
}

interface PendingChange {
  previous: unknown;
}

function makeNode(): StoreNode {
  return { hasValue: false, value: undefined };
}

function isWildcardPath(path: string): boolean {
  return path.includes('*');
}

function segmentsOf(path: BindingPath | string): string[] {
  // Store paths are always absolute ($/scope/...) — relative resolution happens
  // in the React hooks / resolver before reaching the store. parsePath handles
  // RFC6901 unescape + `..` rejection.
  return parsePath(path as BindingPath).segments;
}

function nodeEmpty(node: StoreNode): boolean {
  return (
    !node.hasValue &&
    !(node.subscribers && node.subscribers.size) &&
    !(node.wildSubs && node.wildSubs.length) &&
    !(node.children && node.children.size)
  );
}

function matchPattern(pattern: string[], segs: string[]): boolean {
  if (pattern.length !== segs.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== '*' && pattern[i] !== segs[i]) return false;
  }
  return true;
}

export function createReactiveStore(deps: Deps): ReactiveStore {
  const { events } = deps;
  const root = makeNode();

  const dataProviders = new Map<string, DataProviderDefinition>();
  const loadedNamespaces = new Set<string>();

  // scope -> value backend (in-memory tree is the default; absent = use tree)
  const backends = new Map<string, ScopeBackend>();
  const backendFactories = new Map<string, ScopeBackendFactory>();
  for (const f of deps.backendFactories ?? []) backendFactories.set(f.scope, f);
  const backendDisposers: Disposable[] = [];

  // computed target (canonical path) -> its `from` paths, for cycle detection.
  const computedDeps = new Map<string, string[]>();

  const pending = new Map<string, PendingChange>();
  // Paths whose change came from a backend push (Yjs/socket): the backend
  // already holds the new value before emit() fires, so `previous` can't be
  // captured and the Object.is dedupe would wrongly swallow it. Force-notify.
  const forced = new Set<string>();
  let flushScheduled = false;

  // ── tree walking ────────────────────────────────────────────────────────
  function walk(segs: string[], create: boolean): StoreNode | undefined {
    let node = root;
    for (const seg of segs) {
      let next = node.children?.get(seg);
      if (!next) {
        if (!create) return undefined;
        if (!node.children) node.children = new Map();
        next = makeNode();
        node.children.set(seg, next);
      }
      node = next;
    }
    return node;
  }

  // Collect [root, n1, …] for an existing path (stops at first missing node).
  function walkStack(segs: string[]): StoreNode[] {
    const stack: StoreNode[] = [root];
    let node = root;
    for (const seg of segs) {
      const next = node.children?.get(seg);
      if (!next) break;
      stack.push(next);
      node = next;
    }
    return stack;
  }

  function prune(segs: string[]): void {
    const stack = walkStack(segs);
    // stack[i] is the node after consuming segs[0..i-1]; stack[0] = root.
    for (let i = stack.length - 1; i >= 1; i--) {
      const node = stack[i]!;
      if (!nodeEmpty(node)) break;
      const parent = stack[i - 1]!;
      parent.children?.delete(segs[i - 1]!);
      if (parent.children && parent.children.size === 0) parent.children = undefined;
    }
  }

  // ── value storage (backend-routed; default = in-memory tree node) ─────────
  function ensureBackend(scope: string): ScopeBackend | undefined {
    let backend = backends.get(scope);
    if (backend) return backend;
    const factory = backendFactories.get(scope);
    if (!factory) return undefined;
    backend = factory.create();
    backends.set(scope, backend);
    if (backend.attach) {
      backendDisposers.push(backend.attach((path, value) => emitExternal(path, value)));
    }
    return backend;
  }

  function readValue(segs: string[]): { hasValue: boolean; value: unknown } {
    const backend = segs.length ? ensureBackend(segs[0]!) : undefined;
    if (backend) return backend.get(segs.slice(1));
    const node = walk(segs, false);
    return node && node.hasValue
      ? { hasValue: true, value: node.value }
      : { hasValue: false, value: undefined };
  }

  function writeValue(segs: string[], value: unknown): void {
    const backend = segs.length ? ensureBackend(segs[0]!) : undefined;
    if (backend) {
      backend.set(segs.slice(1), value);
      return;
    }
    const node = walk(segs, true)!;
    node.hasValue = true;
    node.value = value;
  }

  function removeValue(segs: string[]): boolean {
    const backend = segs.length ? ensureBackend(segs[0]!) : undefined;
    if (backend) {
      const had = backend.get(segs.slice(1)).hasValue;
      backend.delete(segs.slice(1));
      return had;
    }
    const node = walk(segs, false);
    if (!node || !node.hasValue) return false;
    node.hasValue = false;
    node.value = undefined;
    return true;
  }

  // ── batching / notification ───────────────────────────────────────────────
  function queueChange(canonical: string): void {
    if (!pending.has(canonical)) {
      pending.set(canonical, { previous: readValue(segmentsOf(canonical)).value });
    }
    if (!flushScheduled) {
      flushScheduled = true;
      queueMicrotask(flush);
    }
  }

  function safeExact(fn: (v: unknown) => void, value: unknown, path: string): void {
    try {
      fn(value);
    } catch (err) {
      console.error(`[scena.store] subscriber for "${path}" threw:`, err);
    }
  }

  function safeWild(
    fn: (v: unknown, p: string) => void,
    value: unknown,
    path: string,
  ): void {
    try {
      fn(value, path);
    } catch (err) {
      console.error(`[scena.store] wildcard subscriber threw:`, err);
    }
  }

  function notify(canonical: string, value: unknown): void {
    const segs = segmentsOf(canonical);
    // Walk root → exact node. At each visited node check wildcard subs whose
    // anchor is that node; at the terminal node fire exact subscribers.
    let node: StoreNode | undefined = root;
    fireWild(node, segs, 0, value, canonical);
    for (let d = 0; d < segs.length; d++) {
      node = node.children?.get(segs[d]!);
      if (!node) break;
      fireWild(node, segs, d + 1, value, canonical);
      if (d === segs.length - 1 && node.subscribers) {
        for (const fn of [...node.subscribers]) safeExact(fn, value, canonical);
      }
    }
  }

  function fireWild(
    node: StoreNode,
    segs: string[],
    depth: number,
    value: unknown,
    path: string,
  ): void {
    if (!node.wildSubs) return;
    const rem = segs.slice(depth);
    for (const ws of [...node.wildSubs]) {
      if (matchPattern(ws.pattern, rem)) safeWild(ws.fn, value, path);
    }
  }

  function flush(): void {
    flushScheduled = false;
    if (pending.size === 0) return;
    const batch = [...pending.entries()];
    pending.clear();
    for (const [canonical, { previous }] of batch) {
      const { hasValue, value } = readValue(segmentsOf(canonical));
      const force = forced.delete(canonical);
      if (!force && Object.is(value, previous) && hasValue) continue;
      events.emit('scena:store:changed', { path: canonical, value, previous });
      notify(canonical, value);
    }
  }

  // External (backend-pushed) change: write already happened in the backend.
  function emitExternal(path: BindingPath, _value: unknown): void {
    const canonical = joinSegments(segmentsOf(path));
    forced.add(canonical);
    queueChange(canonical);
  }

  function ensureNamespaceLoaded(scope: string): void {
    if (loadedNamespaces.has(scope)) return;
    const def = dataProviders.get(scope);
    if (!def) return;
    if (def.load === 'lazy' || def.load === undefined) {
      loadedNamespaces.add(scope);
      void def.provider.load(store, deps.socket as SocketBridge);
    }
  }

  // ── subtree helpers ───────────────────────────────────────────────────────
  function walkSubtree(
    node: StoreNode,
    segs: string[],
    visit: (node: StoreNode, segs: string[]) => void,
  ): void {
    visit(node, segs);
    if (node.children) {
      for (const [seg, child] of node.children) walkSubtree(child, [...segs, seg], visit);
    }
  }

  // Writing a CONTAINER value invalidates sub-path subscribers — a binding to
  // `$/a/b/name` reads via readPath, descending into the object stored at
  // `$/a/b`, so replacing that object changes its resolved value even though no
  // `name` node was written. notify() only walks root→exact, never down, so
  // queue every SUBSCRIBED descendant of the written node here. Gated on the old
  // OR new value being a container — a primitive write (e.g. `$/a = 1`) can't
  // change any descendant's descended value, so it stays exact-path-only.
  // Bounded: only materialized nodes (subscribed/written) exist, and only when
  // the node has children — leaf/primitive writes stay O(1). Descendants flush
  // with a node-only value (often undefined); subscribers re-read via readPath
  // (which useStore does), so the fired value arg is just a wake-up signal.
  function isContainer(v: unknown): boolean {
    return typeof v === 'object' && v !== null;
  }
  function queueDescendants(segs: string[], prev: unknown, next: unknown): void {
    if (!isContainer(prev) && !isContainer(next)) return;
    const node = walk(segs, false);
    if (!node?.children) return;
    walkSubtree(node, segs, (n, s) => {
      if (n === node) return; // the exact path is queued by the caller
      if ((n.subscribers && n.subscribers.size) || (n.wildSubs && n.wildSubs.length)) {
        queueChange(joinSegments(s));
      }
    });
  }

  // ── public API ──────────────────────────────────────────────────────────
  const store: InternalReactiveStore = {
    _internalKeys() {
      const keys: string[] = [];
      walkSubtree(root, [], (node, segs) => {
        if (node.hasValue && segs.length) keys.push(joinSegments(segs));
      });
      return keys;
    },

    get<T>(path: BindingPath): T | undefined {
      const segs = segmentsOf(path);
      if (segs.length) ensureNamespaceLoaded(segs[0]!);
      return readValue(segs).value as T | undefined;
    },

    set(path, value) {
      const segs = segmentsOf(path);
      const canonical = joinSegments(segs);
      queueChange(canonical);
      const prev = readValue(segs).value;
      writeValue(segs, value);
      queueDescendants(segs, prev, value);
    },

    patch(path, partial) {
      const segs = segmentsOf(path);
      const canonical = joinSegments(segs);
      queueChange(canonical);
      const current = readValue(segs).value;
      const next = { ...(current as object | null), ...partial };
      writeValue(segs, next);
      queueDescendants(segs, current, next);
    },

    patchMany(entries) {
      for (const [path, value] of Object.entries(entries)) {
        const segs = segmentsOf(path as BindingPath);
        queueChange(joinSegments(segs));
        const prev = readValue(segs).value;
        writeValue(segs, value);
        queueDescendants(segs, prev, value);
      }
    },

    delete(path) {
      const segs = segmentsOf(path);
      const canonical = joinSegments(segs);
      // capture previous before mutating
      queueChange(canonical);
      const removed = removeValue(segs);
      if (removed) prune(segs);
    },

    clearNamespace(scope) {
      loadedNamespaces.delete(scope);
      const node = root.children?.get(scope);
      const backend = backends.get(scope);
      if (!node && !backend) return;
      // Queue changes (capturing previous) for every value-bearing or
      // subscribed descendant BEFORE clearing, so subscribers fire with the
      // post-clear value (undefined). O(subtree), not O(total store).
      if (node) {
        walkSubtree(node, [scope], (n, segs) => {
          const present = backend ? backend.get(segs.slice(1)).hasValue : n.hasValue;
          if (present || (n.subscribers && n.subscribers.size)) {
            queueChange(joinSegments(segs));
          }
        });
      }
      if (backend) {
        backend.clear();
      } else if (node) {
        walkSubtree(node, [scope], (n) => {
          n.hasValue = false;
          n.value = undefined;
        });
      }
    },

    subscribe(path, fn) {
      const segs = segmentsOf(path);
      if (segs.length) {
        ensureNamespaceLoaded(segs[0]!);
        // Activate the scope's backend so external-push backends (Yjs/socket)
        // attach their observer before the first change arrives.
        ensureBackend(segs[0]!);
      }

      if (isWildcardPath(path)) {
        const star = segs.indexOf('*');
        const prefix = segs.slice(0, star);
        const pattern = segs.slice(star); // includes the '*' and the rest
        const anchor = walk(prefix, true)!;
        if (!anchor.wildSubs) anchor.wildSubs = [];
        const entry: WildSub = { pattern, fn: fn as (v: unknown, p: string) => void };
        anchor.wildSubs.push(entry);
        return disposableFrom(() => {
          const arr = anchor.wildSubs;
          if (!arr) return;
          const i = arr.indexOf(entry);
          if (i >= 0) arr.splice(i, 1);
          if (arr.length === 0) anchor.wildSubs = undefined;
          prune(prefix);
        });
      }

      const node = walk(segs, true)!;
      if (!node.subscribers) node.subscribers = new Set();
      node.subscribers.add(fn);
      return disposableFrom(() => {
        node.subscribers?.delete(fn);
        if (node.subscribers && node.subscribers.size === 0) node.subscribers = undefined;
        prune(segs);
      });
    },

    subscriberCount(scope) {
      const node = root.children?.get(scope);
      if (!node) return 0;
      let count = 0;
      walkSubtree(node, [scope], (n) => {
        if (n.subscribers) count += n.subscribers.size;
        if (n.wildSubs) count += n.wildSubs.length;
      });
      return count;
    },

    computed(path, def) {
      const target = joinSegments(segmentsOf(path));
      const froms = def.from.slice();
      detectCycle(target, froms);
      computedDeps.set(target, froms);

      const selectFn =
        typeof def.select === 'function' ? def.select : compileSelect(def.select);

      const recompute = () => {
        const inputs: Record<string, unknown> = {};
        for (const f of froms) inputs[f] = gatherInput(f);
        store.set(path, selectFn(inputs));
      };

      const disposables = froms.map((p) => store.subscribe(p, recompute));
      recompute();
      return disposableFrom(() => {
        disposables.forEach((d) => d.dispose());
        computedDeps.delete(target);
      });
    },

    registerDataProvider(def) {
      dataProviders.set(def.namespace, def);
      if (def.load === 'eager') {
        loadedNamespaces.add(def.namespace);
        void def.provider.load(store, deps.socket as SocketBridge);
      }
      return disposableFrom(() => {
        if (loadedNamespaces.has(def.namespace)) {
          void def.provider.unload?.(store, deps.socket as SocketBridge);
          loadedNamespaces.delete(def.namespace);
        }
        dataProviders.delete(def.namespace);
      });
    },

    listDataProviders() {
      return [...dataProviders.values()];
    },
  };

  // ── computed helpers ──────────────────────────────────────────────────────
  function gatherInput(from: BindingPath): unknown {
    if (hasWildcard(from)) {
      // Expand a wildcard `from` to the array of matched stored values
      // (in-memory scopes only). Used by collection selects (countWhere, …).
      const segs = segmentsOf(from);
      const star = segs.indexOf('*');
      const prefix = segs.slice(0, star);
      const pattern = segs.slice(star);
      const anchor = walk(prefix, false);
      if (!anchor) return [];
      const out: unknown[] = [];
      walkSubtree(anchor, prefix, (n, s) => {
        if (!n.hasValue) return;
        if (matchPattern(pattern, s.slice(prefix.length))) out.push(n.value);
      });
      return out;
    }
    return store.get(from);
  }

  function detectCycle(target: string, froms: BindingPath[]): void {
    const seen = new Set<string>();
    const stack = froms.map((f) => joinSegments(segmentsOf(f)));
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === target) {
        throw new Error(
          `computed: registering "${target}" would create a dependency cycle.`,
        );
      }
      if (seen.has(cur)) continue;
      seen.add(cur);
      const deps2 = computedDeps.get(cur);
      if (deps2) stack.push(...deps2.map((f) => joinSegments(segmentsOf(f))));
    }
  }

  return store;
}

// ── mount-local helpers (canonical layout: `$/local/<mountKey>/<rest>`) ──────

export function localPath(mountKey: string, suffix: string): BindingPath {
  const tail = suffix.startsWith('/') ? suffix.slice(1) : suffix;
  return `$/local/${mountKey}/${tail}` as BindingPath;
}

const LOCAL_PREFIX = '$/local/';

export function rewriteLocal(path: BindingPath, mountKey: string | null): BindingPath {
  if (!mountKey) return path;
  if (!path.startsWith(LOCAL_PREFIX)) return path;
  const tail = path.slice(LOCAL_PREFIX.length);
  if (tail.startsWith(`${mountKey}/`) || tail === mountKey) return path;
  return `$/local/${mountKey}/${tail}` as BindingPath;
}

export function clearMountLocal(store: ReactiveStore, mountKey: string): void {
  const internal = store as Partial<InternalReactiveStore>;
  const keys = internal._internalKeys?.() ?? [];
  const prefix = `$/local/${mountKey}/`;
  const exact = `$/local/${mountKey}`;
  for (const key of keys) {
    if (key === exact || key.startsWith(prefix)) {
      store.delete(key as BindingPath);
    }
  }
}

export type { ScopeName };
