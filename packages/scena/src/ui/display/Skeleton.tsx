import type { CSSProperties } from 'react';
import './Skeleton.css';

// Loading placeholder. Two modes:
//   - lines (default): N horizontal bars stacked; last is shorter
//   - block: a single rectangle of width/height
export interface SkeletonProps {
  lines?: number;
  // Render a single block instead of stacked lines. When set, lineWidth /
  // last-line shortening is ignored.
  block?: boolean;
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  className?: string;
}

export function Skeleton({
  lines = 3,
  block,
  width,
  height,
  style,
  className,
}: SkeletonProps) {
  if (block) {
    return (
      <div
        className={['oo-skeleton', 'oo-skeleton--block', className].filter(Boolean).join(' ')}
        aria-busy="true"
        style={{ width: width ?? '100%', height: height ?? 80, ...style }}
      />
    );
  }
  return (
    <div
      className={['oo-skeleton-lines', className].filter(Boolean).join(' ')}
      aria-busy="true"
      style={style}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="oo-skeleton oo-skeleton--line"
          style={{
            width: i === lines - 1 ? '60%' : '100%',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
