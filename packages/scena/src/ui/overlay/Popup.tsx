import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

export interface PopupProps {
  // Anchor position (typically a mouse event's clientX / clientY). The
  // popup is clamped to the viewport after mount so it never overflows.
  x: number;
  y: number;
  // Called when the user clicks outside or presses Escape. The parent owns
  // the open/closed state and is responsible for unmounting on close.
  onClose?: () => void;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  // Extra class names appended to `oo-popup` for styling overrides.
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

// Reusable popup positioned at fixed (x, y). Handles outside-click close,
// Escape key close, and viewport-edge clamping. Used by the MenuPopup wrapper
// in CustomShell and available to any layout / app that wants an anchored
// floating panel.
//
// Decisions baked in (per PENDING):
//   - No per-SurfaceArea portal. Caller renders <Popup> wherever it wants.
//   - No graph-component registration. Popup is React-only for now — agent
//     surfaces that want a graph-driven popup can wrap this in a built-in
//     graph component later.
export function Popup({
  x,
  y,
  onClose,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  className,
  style,
  children,
}: PopupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Clamp to viewport once we know our own bounding box.
  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const margin = 4;
    const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxY = Math.max(margin, window.innerHeight - rect.height - margin);
    setPos({
      left: Math.max(margin, Math.min(x, maxX)),
      top: Math.max(margin, Math.min(y, maxY)),
    });
  }, [x, y]);

  // Outside-click close. We defer adding the listener one tick so the click
  // that opened the popup doesn't immediately close it (the click handler
  // that called onOpen lives in the same microtask as the document listener
  // attachment, so the bubbling click would otherwise re-enter here).
  useEffect(() => {
    if (!closeOnOutsideClick || !onClose) return;
    let mounted = true;
    function onMouseDown(e: MouseEvent) {
      if (!mounted || !ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      onClose?.();
    }
    const id = setTimeout(() => {
      if (mounted) document.addEventListener('mousedown', onMouseDown);
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(id);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [closeOnOutsideClick, onClose]);

  // Escape close.
  useEffect(() => {
    if (!closeOnEscape || !onClose) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeOnEscape, onClose]);

  return (
    <div
      ref={ref}
      className={['oo-popup', className].filter(Boolean).join(' ')}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        zIndex: 9999,
        ...style,
      }}
      // Stop clicks from bubbling into the outside-click listener.
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
