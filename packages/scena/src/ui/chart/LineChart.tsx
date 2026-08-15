import type { CSSProperties } from 'react';
import './LineChart.css';

// Hand-drawn line chart — pure SVG, no dependency. Multiple series share one
// auto-scaled y-axis. A 0..100 viewBox with non-scaling strokes keeps line
// weight constant regardless of render size.
export interface LineSeries {
  points: number[];
  color?: string;
  label?: string;
}

export interface LineChartProps {
  series: LineSeries[];
  height?: number;              // px (default 80)
  width?: number | string;      // default '100%'
  fill?: boolean;               // shade the area under each line
  showAxis?: boolean;           // baseline at the bottom
  style?: CSSProperties;
}

const DEFAULT_COLOR = 'var(--oo-color-accent)';

export function LineChart({ series, height = 80, width = '100%', fill, showAxis, style }: LineChartProps) {
  // Bound props can resolve to undefined before their store path is seeded.
  const safeSeries = (series ?? []).map((s) => ({ ...s, points: s.points ?? [] }));
  const all = safeSeries.flatMap((s) => s.points);
  const min = all.length > 0 ? Math.min(...all) : 0;
  const max = all.length > 0 ? Math.max(...all) : 1;
  const span = max - min || 1;

  const toXY = (points: number[]): string =>
    points
      .map((v, i) => {
        const x = points.length > 1 ? (i / (points.length - 1)) * 100 : 0;
        const y = 100 - ((v - min) / span) * 100;
        return `${x},${y}`;
      })
      .join(' ');

  return (
    <svg
      className="oo-linechart"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width, height, ...style }}
    >
      {showAxis ? (
        <line className="oo-linechart__axis" x1="0" y1="100" x2="100" y2="100" vectorEffect="non-scaling-stroke" />
      ) : null}
      {safeSeries.map((s, i) => {
        const color = s.color ?? DEFAULT_COLOR;
        const xy = toXY(s.points);
        if (!xy) return null;
        return (
          <g key={i}>
            {fill ? <polygon points={`0,100 ${xy} 100,100`} fill={color} opacity={0.15} /> : null}
            <polyline
              points={xy}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
}

export interface SparklineProps {
  points: number[];
  color?: string;
  height?: number;
  fill?: boolean;
  style?: CSSProperties;
}

// A single-series LineChart, compact, no axis. The common inline use.
export function Sparkline({ points, color, height = 24, fill, style }: SparklineProps) {
  return <LineChart series={[{ points, color }]} height={height} fill={fill} style={style} />;
}
