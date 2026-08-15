import { useEffect, useState, type ReactNode } from 'react';
import { resolveColorAlpha, type ComponentNode } from '@softov/scena/types';
import { ViewMount } from '@softov/scena/react';

// A simple dashboard written in React. useState + setInterval rebuild a
// ComponentNode every tick, rendered with <ViewMount>. Contrast with
// Showcase.Dashboard — a static template animated by an onMount store
// lifecycle (no React). Four live KPIs: Time, Date, Test 1, Test 2.

function kpi(icon: string, label: string, color: string, value: string): ComponentNode {
  return {
    component: 'Card',
    style: { flex: '1 1 0', minWidth: 0, border: 0 },
    child: {
      component: 'Column',
      gap: 4,
      children: [
        {
          component: 'Row',
          gap: 8,
          align: 'center',
          children: [
            {
              component: 'Icon', name: icon, size: 30,
              style: {
                flexShrink: 0,
                color: resolveColorAlpha(color, 0.6),
                backgroundColor: resolveColorAlpha(color, 0.1),
                borderColor: resolveColorAlpha(color, 0.2),
                borderStyle: 'solid',
                borderWidth: 2,
                padding: 'var(--oo-spacing-sm)',
                borderRadius: 'var(--oo-radius-lg)',

              }
            },
            {
              component: 'Column',
              gap: 0,
              children: [
                { component: 'Text', text: label, variant: 'caption', muted: true },
                {
                  component: 'Text', text: value, variant: 'h1', style: {
                    color: resolveColorAlpha(color),
                  }
                },
              ],
            }
          ],
        }
      ],
    },
  };
}

function buildDash(time: string, date: string, test1: string, test2: string): ComponentNode {
  return {
    component: 'Column',
    gap: 16,
    style: { padding: 20 },
    children: [
      { component: 'Text', text: 'Simple React Dashboard', variant: 'h1' },
      {
        component: 'Text',
        text: 'Built in React (useState + setInterval). The state is rebuilt into a ComponentNode each tick and rendered with <ViewMount>.',
        muted: true,
      },
      {
        component: 'Row',
        gap: 12,
        children: [
          kpi('⏲', 'Time', 'red', time),
          kpi('🗓', 'Date', 'blue', date),
          kpi('①', 'Test 1', 'green', test1),
          kpi('②', 'Test 2', 'yellow', test2),
        ],
      },
    ],
  };
}

export function SimpleDashPanel(): ReactNode {
  const [now, setNow] = useState<Date>(() => new Date());
  const [test1, setTest1] = useState(0);
  const [test2, setTest2] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setTest1((x) => x + 1);
      setTest2(() => Math.floor(Math.random() * 100));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const node = buildDash(
    now.toLocaleTimeString(),
    now.toLocaleDateString(),
    String(test1),
    String(test2),
  );

  return <ViewMount node={node} />;
}
