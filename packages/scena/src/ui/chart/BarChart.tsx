import type { CSSProperties } from 'react';
import './BarChart.css';

// Hand-drawn bar chart — flexbox, no dependency. A bar is either a single
// `value` or a list of `segments` (stacked, or side-by-side in grouped mode).
export interface BarChartSegment {
  value: number;
  color: string;
  label?: string;
}

export interface BarChartBar {
  key: string;
  value?: number;
  segments?: BarChartSegment[];
  title?: string;   // tooltip override
  label?: string;   // axis label
}

export interface BarChartProps {
  bars: BarChartBar[];
  height?: number;                 // track height in px (default 64)
  mode?: 'stacked' | 'grouped';    // default 'stacked'
  showLabels?: boolean;
  emptyLabel?: string;
  color?: string;                  // default fill for value-only bars
  style?: CSSProperties;
}

const DEFAULT_COLOR = 'var(--oo-color-accent)';

function segmentsOf(bar: BarChartBar, color: string): BarChartSegment[] {
  if (bar.segments && bar.segments.length > 0) return bar.segments;
  return [{ value: bar.value ?? 0, color }];
}

function totalOf(segs: BarChartSegment[]): number {
  return segs.reduce((sum, s) => sum + s.value, 0);
}

export function BarChart({
  bars,
  height = 64,
  mode = 'stacked',
  showLabels,
  emptyLabel,
  color = DEFAULT_COLOR,
  style,
}: BarChartProps) {
  // Bound props can resolve to undefined before their store path is seeded.
  bars = bars ?? [];
  if (bars.length === 0) {
    return (
      <div className="oo-barchart oo-barchart--empty" style={style}>
        {emptyLabel ?? 'No data'}
      </div>
    );
  }

  // Scale: grouped compares individual segments; stacked compares bar totals.
  const max = Math.max(
    1,
    ...bars.map((b) => {
      const segs = segmentsOf(b, color);
      return mode === 'grouped' ? Math.max(0, ...segs.map((s) => s.value)) : totalOf(segs);
    }),
  );

  return (
    <div className="oo-barchart" style={style}>
      <div className="oo-barchart__track" style={{ height }}>
        {bars.map((bar) => {
          const segs = segmentsOf(bar, color);
          const total = totalOf(segs);
          const title = bar.title ?? `${bar.label ?? bar.key}: ${total}`;

          if (mode === 'grouped') {
            return (
              <div key={bar.key} className="oo-barchart__bar oo-barchart__bar--grouped" title={title}>
                {segs.map((s, i) => (
                  <div
                    key={i}
                    className="oo-barchart__seg"
                    title={s.label}
                    style={{ height: `${(s.value / max) * 100}%`, background: s.color, opacity: s.value === 0 ? 0.25 : 1 }}
                  />
                ))}
              </div>
            );
          }

          return (
            <div
              key={bar.key}
              className="oo-barchart__bar oo-barchart__bar--stacked"
              title={title}
              style={{ height: `${(total / max) * 100}%`, opacity: total === 0 ? 0.25 : 1 }}
            >
              {segs.map((s, i) => (
                <div
                  key={i}
                  className="oo-barchart__seg"
                  title={s.label}
                  style={{ height: total > 0 ? `${(s.value / total) * 100}%` : '0%', background: s.color }}
                />
              ))}
            </div>
          );
        })}
      </div>
      {showLabels ? (
        <div className="oo-barchart__labels">
          {bars.map((bar) => (
            <div key={bar.key} className="oo-barchart__label">{bar.label ?? bar.key}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
