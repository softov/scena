import { useEffect, useState, type ReactNode } from 'react';
import { BarChart, LineChart, Sparkline, Donut, type BarChartBar } from '@softov/scena/ui';
import './catalog-chart-panel.css';

// Showcase for src/ui/chart — BarChart (stacked / grouped), LineChart,
// Sparkline, Donut. All hand-drawn (flexbox + SVG), no charting library. The
// bottom row animates via React useState + setInterval.

const C = {
  blue: 'var(--oo-color-blue)',
  green: 'var(--oo-color-green)',
  purple: 'var(--oo-color-purple)',
  amber: 'var(--oo-color-amber)',
};

const STACKED: BarChartBar[] = Array.from({ length: 12 }, (_, i) => ({
  key: `b${i}`,
  label: `${i}`,
  segments: [
    { value: 5 + ((i * 7) % 18), color: C.blue, label: 'input' },
    { value: 3 + ((i * 5) % 12), color: C.green, label: 'output' },
    { value: 1 + ((i * 3) % 8), color: C.purple, label: 'cache' },
  ],
}));

const GROUPED: BarChartBar[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d, i) => ({
  key: d,
  label: d,
  segments: [
    { value: 10 + ((i * 9) % 20), color: C.blue, label: 'agents' },
    { value: 6 + ((i * 7) % 14), color: C.amber, label: 'tools' },
  ],
}));

const LINE_SERIES = [
  { points: [12, 18, 9, 22, 16, 28, 20, 30, 24, 33], color: C.blue, label: 'latency' },
  { points: [5, 8, 6, 10, 9, 7, 12, 11, 9, 14], color: C.green, label: 'errors' },
];

const DONUT_SLICES = [
  { value: 8, color: C.blue, label: 'GPT-5.2' },
  { value: 3, color: C.green, label: 'Opus' },
  { value: 1, color: C.amber, label: 'Haiku' },
];

function seedLive(): BarChartBar[] {
  return Array.from({ length: 8 }, (_, i) => ({
    key: `l${i}`,
    segments: [
      { value: 5 + Math.round(Math.random() * 15), color: C.blue },
      { value: 3 + Math.round(Math.random() * 10), color: C.amber },
    ],
  }));
}

function Frame({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="chart-demo__card">
      <h3>{title}</h3>
      {subtitle ? <p>{subtitle}</p> : null}
      <div className="chart-demo__body">{children}</div>
    </section>
  );
}

export function CatalogChartPanel(): ReactNode {
  const [liveBars, setLiveBars] = useState<BarChartBar[]>(() => seedLive());
  const [spark, setSpark] = useState<number[]>(() => Array.from({ length: 24 }, () => 20 + Math.random() * 30));

  useEffect(() => {
    const id = setInterval(() => {
      setLiveBars((prev) =>
        prev.map((b) => ({
          ...b,
          segments: (b.segments ?? []).map((s) => ({
            ...s,
            value: Math.max(1, s.value + Math.round((Math.random() - 0.5) * 8)),
          })),
        })),
      );
      setSpark((prev) => [...prev.slice(1), Math.max(0, (prev[prev.length - 1] ?? 0) + (Math.random() - 0.5) * 12)]);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="chart-demo">
      <header>
        <h2>Catalog — Charts</h2>
        <p>
          Hand-drawn charts: <code>BarChart</code> (stacked / grouped), <code>LineChart</code>,{' '}
          <code>Sparkline</code>, <code>Donut</code>. Flexbox + SVG, no charting library. The bottom
          row updates live (React <code>useState</code> + <code>setInterval</code>).
        </p>
      </header>

      <div className="chart-demo__grid">
        <Frame title="BarChart — stacked" subtitle="Token usage by bucket (input / output / cache)">
          <BarChart bars={STACKED} height={80} showLabels />
        </Frame>
        <Frame title="BarChart — grouped" subtitle="Agents vs tools per day">
          <BarChart bars={GROUPED} height={80} mode="grouped" showLabels />
        </Frame>
        <Frame title="LineChart" subtitle="Two series, auto-scaled, filled">
          <LineChart series={LINE_SERIES} height={100} fill showAxis />
        </Frame>
        <Frame title="Donut" subtitle="Model share">
          <Donut slices={DONUT_SLICES} size={120} thickness={16} centerLabel="12" />
        </Frame>
        <Frame title="Live BarChart" subtitle="Grouped, updates every second">
          <BarChart bars={liveBars} height={80} mode="grouped" />
        </Frame>
        <Frame title="Live Sparkline" subtitle="Rolling 24-point window">
          <Sparkline points={spark} color={C.purple} height={48} fill />
        </Frame>
      </div>
    </div>
  );
}
