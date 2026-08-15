import type { CSSProperties } from 'react';
import './Donut.css';

// Hand-drawn donut — pure SVG, stacked stroke-dasharray arcs, no dependency.
export interface DonutSlice {
  value: number;
  color: string;
  label?: string;
}

export interface DonutProps {
  slices: DonutSlice[];
  size?: number;          // px (default 96)
  thickness?: number;     // ring width (default 12)
  centerLabel?: string;
  style?: CSSProperties;
}

export function Donut({ slices, size = 96, thickness = 12, centerLabel, style }: DonutProps) {
  // Bound props can resolve to undefined before their store path is seeded.
  slices = slices ?? [];
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  let acc = 0;

  return (
    <div className="oo-donut" style={{ width: size, height: size, ...style }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* rotate so arcs start at 12 o'clock */}
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--oo-color-border)" strokeWidth={thickness} />
          {slices.map((s, i) => {
            const frac = s.value / total;
            const dash = frac * c;
            const arc = (
              <circle
                key={i}
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-acc * c}
              >
                {s.label ? <title>{`${s.label}: ${s.value}`}</title> : null}
              </circle>
            );
            acc += frac;
            return arc;
          })}
        </g>
      </svg>
      {centerLabel ? <div className="oo-donut__center">{centerLabel}</div> : null}
    </div>
  );
}
