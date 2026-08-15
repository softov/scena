import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { BindingPath } from '../../types/component-graph.js';
import type { HostCtx, ListSpec } from '../../types/host.js';
import { useScena } from '../../react/ScenaProvider.js';
import { Popup } from '../overlay/Popup.js';
import { ActionList } from './ActionList.js';

export interface ContextMenuProps {
  // Top-of-stack list spec. `open()` callers may push deeper.
  spec: ListSpec;
  // Anchor point, typically a right-click event's clientX/clientY.
  x: number;
  y: number;
  onClose: () => void;
  // Optional store-path context to inject while the menu is open. Keys are
  // dataContext-relative ('/resource/kind') or absolute ('$/...'). Restored
  // on unmount so concurrent menus in other panels don't see this state.
  context?: Record<string, unknown>;
  // Mount root for relative-path writes during execute. Commands write via
  // joinAbsolute(dataContext, '/foo'); same pattern as ViewMount.
  dataContext?: BindingPath;
  // Custom component embed used by host.openInline. When non-null, the
  // component renders in place of <ActionList>.
  inline?: { component: ReactNode };
}

// Right-click style picker. Wraps Popup + ActionList. Owns the picker stack
// (push/replace/back), context injection, and host callbacks.
export function ContextMenu({
  spec,
  x,
  y,
  onClose,
  context,
  dataContext,
  inline,
}: ContextMenuProps) {
  const scena = useScena();

  type Frame = { spec: ListSpec } | { component: ReactNode };
  const [stack, setStack] = useState<Frame[]>(() => (inline ? [{ component: inline.component }] : [{ spec }]));
  const stackRef = useRef(stack);
  stackRef.current = stack;

  // Inject context paths into the store synchronously during render so the
  // child ActionList's useEffect (which fires BEFORE parent useEffects) sees
  // the values when it calls commands.list() or when the run reads them.
  //
  // We deliberately do NOT restore the paths on unmount. The earlier
  // restore-on-cleanup pattern was broken under React 18 StrictMode: dev
  // fires effects as mount → cleanup → remount WITHOUT re-rendering. The
  // cleanup wiped the paths; the remount's ActionList effect (which runs
  // BEFORE the parent ContextMenu effect, bottom-up) then queried
  // commands.list against an empty store. when-gated commands evaluated to
  // false against undefined and the picker cached "no matches" until the
  // next registry change. Skipping restore entirely sidesteps the race.
  // Each new menu open writes its own context, so stale paths from a
  // previously-closed menu are overwritten before being read.
  const injectedRef = useRef(false);
  if (context && !injectedRef.current) {
    for (const [k, v] of Object.entries(context)) {
      const path = (k.startsWith('$/') ? k : joinAbs(dataContext, k)) as BindingPath;
      scena.store.set(path, v);
    }
    injectedRef.current = true;
  }

  // Build a stable HostCtx scoped to this menu's stack.
  const host = useMemo<HostCtx>(() => ({
    pushList: (s) => setStack((cur) => [...cur, { spec: s }]),
    replaceList: (s) => setStack((cur) => {
      const next = cur.slice(0, -1);
      next.push({ spec: s });
      return next;
    }),
    openInline: (componentId, props) => {
      // Build a thin shell that mounts the component via ViewMount-style
      // dispatch. For now we use a synthesized React tree; the real impl
      // would consult scena.components.resolve(componentId).
      setStack((cur) => [
        ...cur,
        { component: <MissingInline name={componentId} props={props} /> },
      ]);
    },
    openPopover: () => {
      // A detached popover from inside a context menu is uncommon; for the
      // first cut, treat as openInline (push onto stack).
    },
    back: () => setStack((cur) => (cur.length > 1 ? cur.slice(0, -1) : cur)),
    closeMenu: onClose,
    keepOpen: () => undefined, // ContextMenu defaults to closing on dispatch; toggles override via run not running close
    insertAtCursor: () => undefined, // right-click context has no text input
    replaceActiveToken: () => undefined,
    query: '',
  }), [onClose]);

  const top = stack[stack.length - 1]!;
  const onBack = stack.length > 1 ? host.back : undefined;

  return (
    <Popup x={x} y={y} onClose={onClose}>
      {'component' in top ? (
        top.component
      ) : (
        <ActionList
          spec={top.spec}
          hostCtx={host}
          onBack={onBack}
          dataContext={dataContext}
        />
      )}
    </Popup>
  );
}

function joinAbs(root: BindingPath | undefined, rel: string): string {
  if (rel.startsWith('$/')) return rel;
  if (!root) return rel.startsWith('/') ? `$${rel}` : `$/${rel}`;
  const base = root.endsWith('/') ? root.slice(0, -1) : root;
  const tail = rel.startsWith('/') ? rel : `/${rel}`;
  return `${base}${tail}`;
}

function MissingInline({ name, props: _props }: { name: string; props?: Record<string, unknown> }) {
  // Placeholder while openInline component-resolution lands. Will be replaced
  // by a ViewMount-style adapter that looks up scena.components.
  return <div style={{ padding: 12 }}>[component: {name}]</div>;
}

// Convenience for the common case — fire a Popup-anchored ActionList at the
// given coords for a slot tag.
export function useContextMenu(): {
  open: (opts: {
    x: number;
    y: number;
    slot: string;
    context?: Record<string, unknown>;
    dataContext?: BindingPath;
    q?: string;
  }) => void;
  close: () => void;
  rendered: ReactNode | null;
} {
  const [state, setState] = useState<null | {
    x: number;
    y: number;
    slot: string;
    context?: Record<string, unknown>;
    dataContext?: BindingPath;
    q?: string;
  }>(null);

  const open = useCallback((opts: typeof state extends null ? never : Exclude<typeof state, null>) => {
    setState(opts);
  }, []);

  const close = useCallback(() => setState(null), []);

  const rendered = state
    ? (
      <ContextMenu
        x={state.x}
        y={state.y}
        onClose={close}
        spec={{ query: { slot: state.slot, q: state.q } }}
        context={state.context}
        dataContext={state.dataContext}
      />
    )
    : null;

  return { open: open as (opts: NonNullable<typeof state>) => void, close, rendered };
}
