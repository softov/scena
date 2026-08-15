import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

export interface SplitterProps {
  orientation?: 'horizontal' | 'vertical';
  // Initial split position 0..1. If a parent rebinds this prop, the splitter
  // resets to the new value. To persist across drags, wire onRatioChange to a
  // $command (e.g., a Tela setProp that writes back to the bound path).
  ratio?: number;
  min?: number;
  max?: number;
  handleSize?: number;
  onRatioChange?: (ratio: number) => void;
  // Slot props injected by ViewMount when used inside a graph.
  first?: ReactNode;
  second?: ReactNode;
}

// Graph-renderable two-pane splitter. Used as a content primitive inside Pages
// (Tela) or any other graph. Distinct from chrome ShellSplitter, which writes
// to layout: state and lives between surfaces — this one is internal to a graph.
export function Splitter({
  orientation = 'horizontal',
  ratio: ratioProp = 0.5,
  min = 0.1,
  max = 0.9,
  handleSize = 4,
  onRatioChange,
  first,
  second,
}: SplitterProps) {
  const [ratio, setRatio] = useState(clamp(ratioProp, min, max));
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);

  // Sync from external prop when it changes (e.g., $bind path updates).
  useEffect(() => {
    setRatio(clamp(ratioProp, min, max));
  }, [ratioProp, min, max]);

  function commitPending() {
    if (pendingRef.current !== null) {
      const v = pendingRef.current;
      setRatio(v);
      onRatioChange?.(v);
      pendingRef.current = null;
    }
    rafRef.current = null;
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    draggingRef.current = true;
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio =
      orientation === 'horizontal'
        ? (e.clientX - rect.left) / rect.width
        : (e.clientY - rect.top) / rect.height;
    pendingRef.current = clamp(ratio, min, max);
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(commitPending);
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      commitPending();
    }
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    draggingRef.current = false;
  }

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: orientation === 'horizontal' ? 'row' : 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  };
  const handleStyle: CSSProperties =
    orientation === 'horizontal'
      ? { width: handleSize, cursor: 'ew-resize', background: 'var(--oo-color-border, rgba(0,0,0,0.1))' }
      : { height: handleSize, cursor: 'ns-resize', background: 'var(--oo-color-border, rgba(0,0,0,0.1))' };

  return (
    <div ref={containerRef} className="oo-splitter" style={containerStyle}>
      <div style={{ flex: ratio, overflow: 'auto', minWidth: 0, minHeight: 0 }}>
        {first}
      </div>
      <div
        className="oo-splitter-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ flex: '0 0 auto', userSelect: 'none', touchAction: 'none', ...handleStyle }}
      />
      <div style={{ flex: 1 - ratio, overflow: 'auto', minWidth: 0, minHeight: 0 }}>
        {second}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
