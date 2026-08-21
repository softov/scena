import { useMemo, useRef, useState, type ReactNode } from 'react';
import type { BindingPath } from '../../sdk/component-graph.js';
import type { HostCtx, ListSpec } from '../../sdk/host.js';
import { useScena } from '../../react/ScenaProvider.js';
import { ActionList } from './ActionList.js';

export interface ContainerMenuProps {
  spec: ListSpec;
  // Optional store-path context to inject while the menu is mounted. Keys
  // are dataContext-relative ('/resource/kind') or absolute ('$/...').
  // Matches ContextMenu.context — written once on first render, not
  // restored on unmount (same reasoning as ContextMenu).
  context?: Record<string, unknown>;
  // Mount root for relative-path writes during command execution.
  dataContext?: BindingPath;
  // Document-level keydown listener for arrow nav. Default false because
  // inline use is typically always-mounted alongside other content; turning
  // it on would mean every keypress on the page moves this menu's highlight.
  // Pass `true` if the container is the focused surface (e.g. a dedicated
  // menu pane).
  manageKeys?: boolean;
  // Custom component embed used by host.openInline. Same shape as ContextMenu.
  inline?: { component: ReactNode };
}

// Inline twin of ContextMenu: same picker engine (ActionList + the host stack
// with push/back), but NO Popup wrapper. Use when the menu should sit inside
// the layout (a sidebar section, a panel) instead of floating at click coords.
//
// Stack behavior mirrors ContextMenu so submenus pushed via host.pushList /
// replaceList work the same way. closeMenu is a no-op — there is no popup to
// dismiss; commands that depend on closing the menu after execute should
// instead unmount the container at the call site.
export function ContainerMenu({
  spec,
  context,
  dataContext,
  manageKeys = false,
  inline,
}: ContainerMenuProps) {
  const scena = useScena();

  type Frame = { spec: ListSpec } | { component: ReactNode };
  const [stack, setStack] = useState<Frame[]>(() =>
    inline ? [{ component: inline.component }] : [{ spec }],
  );

  // Same StrictMode-safe context injection pattern as ContextMenu: write once
  // synchronously, don't restore on unmount. ActionList's effects fire
  // bottom-up before ours, so an unmount-restore would race them on remount.
  const injectedRef = useRef(false);
  if (context && !injectedRef.current) {
    for (const [k, v] of Object.entries(context)) {
      const path = (k.startsWith('$/') ? k : joinAbs(dataContext, k)) as BindingPath;
      scena.store.set(path, v);
    }
    injectedRef.current = true;
  }

  const host = useMemo<HostCtx>(
    () => ({
      pushList: (s) => setStack((cur) => [...cur, { spec: s }]),
      replaceList: (s) =>
        setStack((cur) => {
          const next = cur.slice(0, -1);
          next.push({ spec: s });
          return next;
        }),
      openInline: () => undefined,
      openPopover: () => undefined,
      back: () => setStack((cur) => (cur.length > 1 ? cur.slice(0, -1) : cur)),
      closeMenu: () => undefined,
      keepOpen: () => undefined,
      insertAtCursor: () => undefined,
      replaceActiveToken: () => undefined,
      query: '',
    }),
    [],
  );

  const top = stack[stack.length - 1]!;
  const onBack = stack.length > 1 ? host.back : undefined;

  if ('component' in top) return <>{top.component}</>;
  return (
    <ActionList
      spec={top.spec}
      hostCtx={host}
      onBack={onBack}
      dataContext={dataContext}
      manageKeys={manageKeys}
    />
  );
}

function joinAbs(root: BindingPath | undefined, rel: string): string {
  if (rel.startsWith('$/')) return rel;
  if (!root) return rel.startsWith('/') ? `$${rel}` : `$/${rel}`;
  const base = root.endsWith('/') ? root.slice(0, -1) : root;
  const tail = rel.startsWith('/') ? rel : `/${rel}`;
  return `${base}${tail}`;
}
