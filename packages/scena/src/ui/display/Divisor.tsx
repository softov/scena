import { type PointerEvent, useRef } from 'react';
import './Divisor.css';

// Draggable resize handle shared by SplitLayout and TabPanelLayout. Reports
// the cursor's position relative to `containerRef` as a 0..1 ratio.
// `id` is opaque — SplitLayout uses it to identify which divider in a row of
// many fired; TabPanelLayout omits it because each split owns one Divisor.
export interface DivisorProps {
  id?: string | number;
  direction: 'row' | 'col';
  containerRef: React.RefObject<HTMLDivElement | null>;
  min?: number;
  max?: number;
  disabled?: boolean;
  onCommit: (ratio: number, id?: string | number) => void;
}

export function Divisor({
  id,
  direction,
  containerRef,
  min = 0.01,
  max = 0.99,
  disabled = false,
  onCommit,
}: DivisorProps) {
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);

  function flush() {
    if (pendingRef.current !== null) {
      onCommit(pendingRef.current, id);
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
      direction === 'row'
        ? (e.clientX - rect.left) / Math.max(1, rect.width)
        : (e.clientY - rect.top) / Math.max(1, rect.height);
    pendingRef.current = clamp(ratio, min, max);
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(flush);
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      flush();
    }
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    draggingRef.current = false;
  }

  return (
    <div
      className={`oo-divisor oo-divisor__${direction}`}
      data-divisor-id={id}
      // aria-controls={aria.valueControls}
      aria-disabled={disabled || undefined}
      aria-direction={direction}
      aria-valuemax={max}
      aria-valuemin={min}
      aria-valuenow={pendingRef.current ?? undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseDown={(e) => e.preventDefault()}
    />
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
