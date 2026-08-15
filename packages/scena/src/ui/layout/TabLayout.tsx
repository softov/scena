import {
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { LayoutProps } from '../../types/layout.js';
import { useScena } from '../../react/ScenaProvider.js';
import { ContextMenu } from '../menu/ContextMenu.js';
import { NAMED_GLYPH } from '../display/Icon.js';
import { TabTitle } from './TabPanelLayout.js';

// Tab strip + active mount. Tabs are draggable for reorder (HTML5 DnD).
// Right-click on a tab opens slot `tab:context`. The [...] trailing button
// opens slot `tab-group:context`. Right-click on the strip empty area opens
// slot `surface:context`. The `view/title` slot still renders as inline
// action buttons next to the strip for the active mount.

const DRAG_MIME = 'application/x-scena-tab-index';

export function TabLayout({
  surface,
  mounts,
  state,
  renderMount,
  onActivate,
  onClose,
  onReorder,
}: LayoutProps) {
  const scena = useScena();
  const persistedOrder = state.split?.order ?? [];
  const orderSet = new Set(persistedOrder);
  const orderedKnown = persistedOrder
    .map((k) => mounts.find((m) => m.key === k))
    .filter((m): m is (typeof mounts)[number] => Boolean(m));
  const newMounts = mounts.filter((m) => !orderSet.has(m.key));
  const orderedMounts = [...orderedKnown, ...newMounts];

  const active =
    orderedMounts.find((m) => m.key === state.activeContainerKey) ??
    orderedMounts[orderedMounts.length - 1];

  // Pinned tab keys — render a pin icon instead of × for these. Click on
  // the pin runs `tab.unpin` to flip the state back.
  const pinned = new Set(state.split?.pinned ?? []);

  const titleEntries = active
    ? scena.commands.list({ slot: 'view/title', enabled: true })
    : [];
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Per-tab context menu state. The capability paths injected via
  // ContextMenu.context drive which commands show up in the picker.
  const [tabMenu, setTabMenu] = useState<{
    x: number;
    y: number;
    tabKey: string;
    tabIdx: number;
  } | null>(null);
  const [groupMenu, setGroupMenu] = useState<{ x: number; y: number } | null>(null);
  const [bgMenu, setBgMenu] = useState<{ x: number; y: number } | null>(null);

  // Vertical wheel → horizontal scroll on the tab strip. Native listener
  // (not React's onWheel) so we can preventDefault — React's synthetic wheel
  // is passive and would let the page scroll vertically instead.
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el!.scrollLeft += e.deltaY;
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function onTabContextMenu(
    e: ReactMouseEvent<HTMLDivElement>,
    tabKey: string,
    tabIdx: number,
  ): void {
    e.preventDefault();
    e.stopPropagation();
    setTabMenu({ x: e.clientX, y: e.clientY, tabKey, tabIdx });
  }
  function openGroupMenu(e: ReactMouseEvent<HTMLButtonElement>): void {
    const rect = e.currentTarget.getBoundingClientRect();
    setGroupMenu({ x: rect.right, y: rect.bottom + 2 });
  }
  function onBgContextMenu(e: ReactMouseEvent<HTMLDivElement>): void {
    // Only fire when the click really is on the empty body, not on a card.
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    setBgMenu({ x: e.clientX, y: e.clientY });
  }

  function onTabDragStart(e: ReactDragEvent<HTMLDivElement>, idx: number) {
    e.dataTransfer.setData(DRAG_MIME, String(idx));
    e.dataTransfer.effectAllowed = 'move';
  }
  function onTabDragOver(e: ReactDragEvent<HTMLDivElement>, idx: number) {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  }
  function onTabDragLeave() {
    setDragOverIdx(null);
  }
  function onTabDrop(e: ReactDragEvent<HTMLDivElement>, toIdx: number) {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData(DRAG_MIME));
    setDragOverIdx(null);
    if (Number.isFinite(fromIdx) && fromIdx !== toIdx) {
      onReorder(fromIdx, toIdx);
    }
  }

  // Capability paths shared by every menu opened from this layout. The
  // per-menu builder adds the mount-specific overrides on top.
  const baseContext = {
    '$/tab/canSplit': false,
    '$/tab/canMove': false,
    '$/group/canClose': false,
    '$/group/canMaximize': false,
    '$/surface/name': surface,
    '$/surface/layoutId': 'tab',
    '$/surface/mountCount': mounts.length,
    '$/surface/closedHistory': 0,
  };

  // Host-contributed rows for the right-clicked tab (e.g. explorer's "Open
  // with <viewer>" alternates). Empty for tabs no host claims.
  const tabMenuMount = tabMenu
    ? orderedMounts.find((m) => m.key === tabMenu.tabKey)
    : undefined;
  const tabMenuExtra = tabMenuMount
    ? scena.mountMenus.collect('tab:context', tabMenuMount)
    : undefined;

  return (
    <div
      className="oo-layout oo-layout--tab"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div className="tab-bar">
        <div className="tab-bar__strip" ref={tabsRef}>
          {orderedMounts.map((m, idx) => {
            // Per-field merge: mount.props wins where defined; otherwise
            // fall through to the component's registered default
            // (ComponentDefinition.props); finally to the raw key.
            const isPinned = pinned.has(m.key);
            return (
              <TabTitle
                key={m.key}
                resourceKey={m.key}
                m={m}
                idx={idx}
                isPinned={isPinned}
                isActive={m === active}
                dragOverTab={dragOverIdx}
                onDragStart={(e) => onTabDragStart(e, idx)}
                onDragOver={(e) => onTabDragOver(e, idx)}
                onDragLeave={onTabDragLeave}
                onDrop={(e) => onTabDrop(e, idx)}
                onClick={() => onActivate(m.key)}
                onContextMenu={(e) => onTabContextMenu(e, m.key, idx)}
                onClose={(e) => {
                  e.stopPropagation();
                  onClose(m.key);
                }}
                onUnpin={(e) => {
                  e.stopPropagation();
                  scena.store.set('$/tab/key', m.key);
                  scena.store.set('$/surface/name', surface);
                  void scena.commands.execute('tab.unpin');
                }}
              />
            );
          })}
        </div>
        <div className="tab-bar__extras">
          {titleEntries.map((cmd, i) => {
            const label = typeof cmd.title === 'function' ? cmd.title() : cmd.title;
            return (
              <button
                key={i}
                onClick={() => scena.commands.execute(cmd.id)}
                title={String(label)}
              >
                {cmd.icon ? `${cmd.icon} ` : ''}
                {String(label)}
              </button>
            );
          })}
          <button
            className="tab-bar__more"
            title="Group actions"
            aria-label="Group actions"
            onClick={openGroupMenu}
          >{NAMED_GLYPH.moreHoriz}</button>
        </div>
      </div>
      <div
        style={{ flex: 1, minHeight: 0, position: 'relative' }}
        onContextMenu={onBgContextMenu}
      >
        {orderedMounts.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--oo-color-muted)' }}>
            Nothing open.
          </div>
        ) : (
          // Keep every mount mounted (state/scroll survive tab switches) and
          // show only the active one. Conditionally rendering just the active
          // mount unmounts the others, losing their React state.
          orderedMounts.map((m) => (
            <div
              key={m.key}
              className="oo-layout__mount"
              data-active={m === active || undefined}
              style={{ height: '100%', overflow: 'auto', display: m === active ? 'block' : 'none' }}
            >
              {renderMount(m) as ReactNode}
            </div>
          ))
        )}
      </div>

      {tabMenu ? (
        <ContextMenu
          x={tabMenu.x}
          y={tabMenu.y}
          onClose={() => setTabMenu(null)}
          spec={{ query: { slot: 'tab:context' }, extraItems: tabMenuExtra, footerHints: true }}
          context={{
            ...baseContext,
            '$/tab/key': tabMenu.tabKey,
            '$/tab/index': tabMenu.tabIdx,
            '$/tab/isActive': tabMenu.tabKey === active?.key,
            '$/tab/isPinned': pinned.has(tabMenu.tabKey),
            '$/group/tabCount': orderedMounts.length,
          }}
        />
      ) : null}

      {groupMenu ? (
        <ContextMenu
          x={groupMenu.x}
          y={groupMenu.y}
          onClose={() => setGroupMenu(null)}
          spec={{ query: { slot: 'tab-group:context' }, footerHints: true }}
          context={{
            ...baseContext,
            '$/group/tabCount': orderedMounts.length,
          }}
        />
      ) : null}

      {bgMenu ? (
        <ContextMenu
          x={bgMenu.x}
          y={bgMenu.y}
          onClose={() => setBgMenu(null)}
          spec={{ query: { slot: 'surface:context' }, footerHints: true }}
          context={baseContext}
        />
      ) : null}
    </div>
  );
}
