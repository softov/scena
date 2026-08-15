import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { useWriteBack } from '../../react/mount-context.js';
import { weightStyle } from '../_utils.js';
import './Tabs.css';
// a2ui v0.10: required `tabs[]` where each entry is `{ title, child }`.
// scena accepts legacy `{ label, content }` as transitional aliases and adds
// per-tab `disabled` + `value`/`defaultValue` for state binding (extensions).
export interface TabsTab {
  // Stable identity for selection — survives title changes (e.g. i18n). Falls
  // back to the tab index when omitted; do NOT derive it from the title.
  key?: string;
  // a2ui v0.10:
  title?: string;
  child?: ReactNode;
  // scena legacy aliases (deprecated):
  label?: string;
  content?: ReactNode;
  // scena extension:
  disabled?: boolean;
}

export interface TabsProps {
  tabs?: TabsTab[];
  weight?: number;
  // scena extensions:
  value?: string;
  defaultValue?: string;
  style?: CSSProperties;
}

function tabTitle(t: TabsTab): string {
  return t.title ?? t.label ?? '';
}
function tabChild(t: TabsTab): ReactNode {
  return t.child ?? t.content;
}

export function Tabs({ tabs = [], value, defaultValue, weight, style }: TabsProps) {
  const writeValue = useWriteBack('value');
  // Stable per-tab key: explicit `key`, else the index. Selection tracks this,
  // NOT the (possibly translated) title — so a language switch keeps the tab.
  const keys = tabs.map((t, i) => t.key ?? String(i));
  const [internal, setInternal] = useState<string | undefined>(value ?? defaultValue ?? keys[0]);

  useEffect(() => {
    if (value === undefined) return;
    setInternal((current) => (current === value ? current : value));
  }, [value]);

  function select(key: string): void {
    setInternal(key);
    writeValue(key);
  }

  const activeIdx = [keys.indexOf(internal ?? ''), keys.indexOf(defaultValue ?? ''), 0].find((i) => i >= 0) ?? 0;
  const active = tabs[activeIdx];

  // Default `flex: 1` fills the surface; weightStyle wins when set.
  const inlineStyle: CSSProperties = {
    // display: 'flex',
    // flexDirection: 'column',
    // minHeight: 0,
    // flex: 1,
    ...weightStyle(weight),
    ...style,
  };

  return (
    <div className="oo-tabs" style={inlineStyle}>
      <div className="oo-tabs__strip" role="tablist">
        {tabs.map((t, i) => {
          const title = tabTitle(t);
          return (
            <button
              key={keys[i]}
              className="oo-tabs__tab"
              role="tab"
              aria-selected={t === active}
              disabled={t.disabled}
              onClick={() => select(keys[i]!)}
              style={{
                // padding: 'var(--oo-spacing-xs) var(--oo-spacing-md)',
                // fontSize: 'var(--oo-font-size-sm)',
                // border: 'none',
                // borderBottom:
                //   t === active
                //     ? '2px solid var(--oo-color-accent)'
                //     : '2px solid transparent',
                // background: 'transparent',
                // color: t === active ? 'inherit' : 'var(--oo-color-muted)',
                // cursor: t.disabled ? 'not-allowed' : 'pointer',
                // opacity: t.disabled ? 0.5 : 1,
                // font: 'inherit',
              }}
            >
              {title}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        style={{ flex: 1, minHeight: 0, overflow: 'auto' }}
      >
        {active ? tabChild(active) : null}
      </div>
    </div>
  );
}
