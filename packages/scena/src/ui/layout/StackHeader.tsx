import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useState,
} from 'react';
import type { LayoutProps } from '../../types/layout.js';
import { useScena } from '../../react/ScenaProvider.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import { resolveMountTitle } from './MountTitle.js';
import { NAMED_GLYPH } from '../display/Icon.js';

interface LayoutHeaderProps extends Pick<LayoutProps, 'mounts' | 'state' | 'setState'> {
  title: string;
  icon?: ReactNode;
  color?: string;
  // onClose: () => void;
  // onReorder: (fromIndex: number, toIndex: number) => void;
}

export function StackHeader({
  // surface,
  mounts,
  state,
  setState,
  title,
  icon,
  color,
  // renderMount,
  // onClose,
  // onReorder,
}: LayoutHeaderProps) {

  const scena = useScena();
  // Merge persisted order with new mounts so a freshly opened section shows up
  // even if state.split.order was captured before it existed.
  const persistedOrder = state.split?.order ?? [];
  const orderSet = new Set(persistedOrder);
  const orderedKnown = persistedOrder
    .map((k) => mounts.find((m) => m.key === k))
    .filter((m): m is (typeof mounts)[number] => Boolean(m));
  const newMounts = mounts.filter((m) => !orderSet.has(m.key));
  // `allOrdered` is every mount in display order. `orderedMounts` is what
  // we actually render after applying the user's hide toggles (state.stack.hidden).
  // The `[...]` menu in the container strip operates on `allOrdered` so a
  // hidden mount remains togglable.
  const allOrdered = [...orderedKnown, ...newMounts];
  const hidden = new Set(state.stack?.hidden ?? []);
  // Container [...] menu position. When non-null the overflow menu is open.
  const [overflowMenu, setOverflowMenu] = useState<{ x: number; y: number } | null>(null);

  function setHidden(next: Set<string>): void {
    setState({ stack: { ...state.stack, hidden: [...next] } });
  }

  function toggleHidden(key: string): void {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setHidden(next);
  }

  function openOverflowMenu(e: ReactMouseEvent<HTMLButtonElement>): void {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setOverflowMenu({ x: rect.right, y: rect.bottom + 2 });
  }

  return (
    <>

      <div
        className="oo-stack-container-header"
        data-color={color}
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--oo-spacing-xs) var(--oo-spacing-sm)',
          background: 'var(--oo-color-surface)',
          borderBottom: '1px solid var(--oo-color-border)',
          fontSize: 'var(--oo-font-size-xs)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--oo-color-muted)',
          userSelect: 'none',
          minWidth: 0,
          minHeight: 32,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {icon ? (
            <span className="oo-stack-container-header__icon" aria-hidden>{icon}</span>
          ) : null}
          <span className="oo-stack-container-header__title">{title}</span>
        </span>
        <button
          type="button"
          className="oo-stack-container-header__overflow"
          title="Toggle panes"
          aria-label="Toggle panes"
          onClick={openOverflowMenu}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--oo-color-muted)',
            cursor: 'pointer',
            font: 'inherit',
            padding: '0 4px',
          }}
        >{NAMED_GLYPH.moreHoriz}</button>
      </div>
      {overflowMenu ? (
        <ContextMenu
          x={overflowMenu.x}
          y={overflowMenu.y}
          onClose={() => setOverflowMenu(null)}
          spec={{
            footerHints: true,
            items: allOrdered.map((m) => {
              // Per-field merge with the component's registered default.
              const cp = scena.components.get(m.component.component)?.props;
              const visible = !hidden.has(m.key);
              return {
                title: resolveMountTitle(scena, m),
                icon: m.props?.icon ?? cp?.icon,
                color: m.props?.color ?? cp?.color,
                active: visible,
                onSelect: (h) => {
                  toggleHidden(m.key);
                  h.closeMenu();
                },
              };
            }),
          }}
        />
      ) : null}
    </>
  );
}
