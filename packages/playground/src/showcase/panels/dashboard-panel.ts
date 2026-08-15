import type { BindingPath, ComponentMountHandler, ComponentNode } from '@softov/scena/types';
import { kpiCard, kpiCard2 } from '../components/kpiCard';

// An "agent platform" dashboard built purely from the catalog. Most of it is
// static; a few fields bind to `$/dash/*` and are animated by the registration's
// onMount timers (see register.ts). Demonstrates a template made dynamic purely
// through the store + a mount lifecycle, with no per-panel React.

type Bind = { path: BindingPath };

function statusRow(
  name: string,
  status: 'healthy' | 'degraded' | 'down',
  detail: string | Bind,
): ComponentNode {
  const tone = status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'danger';
  const dot = status === 'healthy' ? '●' : status === 'degraded' ? '◐' : '✕';
  return {
    component: 'Row',
    gap: 12,
    align: 'center',
    justify: 'spaceBetween',
    children: [
      {
        component: 'Row',
        gap: 8,
        align: 'center',
        children: [
          {
            component: 'Icon',
            name: dot,
            size: 14,
            color: `var(--oo-color-${tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'danger'})`,
          },
          { component: 'Text', text: name, weight: 'bold' },
        ],
      },
      { component: 'Text', text: detail, variant: 'caption', muted: true },
      { component: 'Text', text: status, variant: 'caption', tone },
    ],
  };
}

export const dashboardPanelNode: ComponentNode = {
  component: 'Column',
  gap: 20,
  style: { padding: 20 },
  // HERE
  children: [
    // Hero
    {
      component: 'Column',
      gap: 4,
      children: [
        {
          component: 'Row',
          gap: 12,
          align: 'center',
          children: [
            { component: 'Icon', name: '🏛', size: 28 },
            { component: 'Text', text: 'Doop Platform · Overview', variant: 'h1' },
          ],
        },
        {
          component: 'Text',
          text: 'Agent runtime where decisions drive execution. All systems nominal.',
          muted: true,
        },
      ],
    },

    // KPI row
    {
      component: 'Grid',
      gap: 12,
      children: [
        kpiCard({
          icon: '🤖︎',
          label: 'Active agents',
          value: { path: '$/dash/activeAgents' },
          text: { path: '$/dash/activeAgentsDelta' },
          tone: 'success',
        }),
        kpiCard({
          icon: '✺',
          label: 'Models',
          value: { path: '$/dash/models' },
          text: { path: '$/dash/modelsDelta' },
          tone: 'success',
        }),
        kpiCard({
          icon: '🛠︎',
          label: 'Tool calls',
          value: { path: '$/dash/toolCalls' },
          text: { path: '$/dash/toolCallsDelta' },
          tone: 'success',
        }),
        kpiCard({
          icon: '🔌︎',
          label: 'Channels',
          value: { path: '$/dash/channels' },
          text: { path: '$/dash/channelsDelta' },
          tone: 'warning',
        }),
      ],
    },

    // KPI row
    {
      component: 'Grid',
      gap: 12,
      children: [
        kpiCard2({
          icon: '🤖︎',
          label: 'Active agents',
          value: { path: '$/dash/activeAgents' },
          text: { path: '$/dash/activeAgentsDelta' },
          tone: 'success',
          color: 'green',
        }),
        kpiCard2({
          icon: '✺', // 🧠
          label: 'Models',
          value: { path: '$/dash/models' },
          text: { path: '$/dash/modelsDelta' },
          tone: 'success',
          color: 'green',
        }),
        kpiCard2({
          icon: '🛠︎',
          label: 'Tool calls',
          value: { path: '$/dash/toolCalls' },
          text: { path: '$/dash/toolCallsDelta' },
          tone: 'success',
          color: 'green',
        }),
        kpiCard2({
          icon: '🔌︎',
          label: 'Channels',
          value: { path: '$/dash/channels' },
          text: { path: '$/dash/channelsDelta' },
          tone: 'warning',
          color: 'amber',
        }),
      ],
    },

    // Two columns: status + activity
    {
      component: 'Row',
      gap: 16,
      align: 'start',
      children: [
        {
          component: 'Card',
          title: 'Subsystem status',
          subtitle: 'Live health of each subsystem.',
          child: {
            component: 'Column',
            gap: 10,
            children: [
              statusRow('Agents', 'healthy', '12 / 12 running'),
              { component: 'Divider' },
              statusRow('Models', 'healthy', 'gpt-5.2 · claude-opus-4-7'),
              { component: 'Divider' },
              statusRow('Tools', 'healthy', '34 tool definitions'),
              { component: 'Divider' },
              statusRow('Plugins', 'degraded', 'whatsapp-baileys ratelimited'),
              { component: 'Divider' },
              statusRow('Channels', 'down', { path: '$/dash/channelsStatus' }),
              { component: 'Divider' },
              statusRow('Memory', 'healthy', 'knowledge.db · 240 MB'),
            ],
          },
        },
        {
          component: 'Card',
          title: 'Recent activity',
          subtitle: 'Live — newest first, rolling window of 7.',
          child: {
            component: 'List',
            gap: 8,
            // DynamicChildList: one row per item in $/dash/activities. Each
            // item supplies /icon /action /target /when via its data context.
            children: {
              path: '$/dash/activities',
              template: {
                component: 'Row',
                gap: 2,
                justify: 'spaceBetween',
                align: 'center',
                style: {
                  display: 'grid',
                  'grid-template-columns':
                    '24px minmax(70px, max-content) minmax(0, 1fr) max-content',
                },
                children: [
                  {
                    component: 'Icon',
                    name: { path: '/icon' },
                    size: 14,
                    color: 'var(--oo-color-accent)',
                    style: {
                      flex: 'none',
                      display: 'inline-grid',
                    },
                  },
                  {
                    component: 'Text',
                    text: { path: '/action' },
                    weight: 'bold',
                    style: {
                      display: 'block',
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  },
                  {
                    component: 'Text',
                    text: { path: '/target' },
                    tone: 'accent',
                    style: {
                      display: 'block',
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  },
                  {
                    component: 'Text',
                    text: { path: '/when' },
                    variant: 'caption',
                    muted: true,
                    style: {
                      display: 'block',
                      minWidth: 0,
                      justifySelf: 'end',
                      // whiteSpace: 'nowrap',
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },

    // Live line chart bound to a store path (animated by onMount). Each series
    // point comes from $/dash/trend; ViewMount subscribes and re-renders.
    {
      component: 'Card',
      title: 'Tool-call throughput',
      subtitle: 'Calls added per tick — LineChart bound to $/dash/trend.',
      child: {
        component: 'LineChart',
        series: [{ points: { path: '$/dash/trend' }, color: 'var(--oo-color-blue)' }],
        height: 72,
        fill: true,
        showAxis: true,
      },
    },

    // Tabs of resource lists
    {
      component: 'Card',
      title: 'Resources',
      subtitle: 'Browse the platform inventory.',
      child: {
        component: 'Tabs',
        defaultValue: 'Agents',
        tabs: [
          {
            label: 'Agents',
            content: {
              component: 'Column',
              gap: 4,
              children: [
                { component: 'Text', text: '🤖 customer-success · 4 sessions · gpt-5.2' },
                { component: 'Text', text: '🤖 invoice-bot · 1 session · claude-opus-4-7' },
                { component: 'Text', text: '🤖 oncall-triage · 7 sessions · gpt-5.2' },
                {
                  component: 'Text',
                  text: '🤖 docs-writer · 0 sessions · claude-opus-4-7',
                  muted: true,
                },
              ],
            },
          },
          {
            label: 'Models',
            content: {
              component: 'Column',
              gap: 4,
              children: [
                { component: 'Text', text: '🧠 openai/gpt-5.2 · used by 8 agents' },
                { component: 'Text', text: '🧠 anthropic/claude-opus-4-7 · used by 3 agents' },
                {
                  component: 'Text',
                  text: '🧠 anthropic/claude-haiku-4-5 · used by 1 agent',
                  muted: true,
                },
              ],
            },
          },
          {
            label: 'Tools',
            content: {
              component: 'Column',
              gap: 4,
              children: [
                { component: 'Text', text: '🔧 search.web · 2,304 calls' },
                { component: 'Text', text: '🔧 fs.read · 1,180 calls' },
                { component: 'Text', text: '🔧 calendar.create · 412 calls' },
                { component: 'Text', text: '🔧 slack.send · 88 calls' },
              ],
            },
          },
          {
            label: 'Channels',
            content: {
              component: 'Column',
              gap: 4,
              children: [
                { component: 'Text', text: '🔌 slack · connected', tone: 'success' },
                { component: 'Text', text: '🔌 imap-email · connected', tone: 'success' },
                { component: 'Text', text: '🔌 whatsapp-baileys · degraded', tone: 'warning' },
                { component: 'Text', text: '🔌 telegram · offline', tone: 'danger' },
              ],
            },
          },
        ],
      },
    },
  ],
};

// ── Live data: the bound `$/dash/*` fields, animated by timers. ───────────

interface DashActivity {
  icon: string;
  action: string;
  target: string;
  when: string;
}

const ACTIVITY_POOL: Omit<DashActivity, 'when'>[] = [
  { icon: '▶', action: 'started', target: 'cron://invoice-rollup' },
  { icon: '✉', action: 'replied', target: 'support@acme.example' },
  { icon: '🔧', action: 'invoked', target: 'tool://search.web' },
  { icon: '🤖', action: 'spawned', target: 'agent://customer-success' },
  { icon: '🔌', action: 'connected', target: 'channel://slack' },
  { icon: '✕', action: 'failed', target: 'channel://telegram' },
  { icon: '◷', action: 'scheduled', target: 'cron://nightly-sync' },
  { icon: '◆', action: 'updated', target: 'memory://knowledge' },
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickActivity(): DashActivity {
  return { ...ACTIVITY_POOL[rand(0, ACTIVITY_POOL.length - 1)]!, when: 'just now' };
}

// Seeds $/dash/* then animates it. The return value is the unmount cleanup.
// This is what makes the static template above live — driven entirely through
// the store + this mount lifecycle, with no per-panel React component.
export const dashboardOnMount: ComponentMountHandler = ({ store }) => {
  let toolCalls = 8392;
  let channelsUp = true;
  let trend = Array.from({ length: 20 }, () => rand(2, 14));

  store.set('$/dash/activeAgents', '12');
  store.set('$/dash/activeAgentsDelta', '+2 this week');
  store.set('$/dash/models', '5');
  store.set('$/dash/modelsDelta', 'gpt-5.2 default');
  store.set('$/dash/toolCalls', toolCalls.toLocaleString());
  store.set('$/dash/channels', '7');
  store.set('$/dash/channelsDelta', 'all connected');
  store.set('$/dash/channelsStatus', '7 / 7 running');
  store.set('$/dash/activities', Array.from({ length: 5 }, pickActivity));
  store.set('$/dash/trend', trend);

  // Tool calls: + rand(1..15) each rand(3..15)s — recursive setTimeout. The
  // per-tick delta also feeds the bound LineChart's rolling trend window.
  let toolTimer: ReturnType<typeof setTimeout>;
  const bumpTools = (): void => {
    const delta = rand(1, 15);
    toolCalls += delta;
    trend = [...trend.slice(1), delta];
    store.set('$/dash/toolCalls', toolCalls.toLocaleString());
    store.set('$/dash/trend', trend);
    toolTimer = setTimeout(bumpTools, rand(3, 15) * 1000);
  };
  toolTimer = setTimeout(bumpTools, rand(3, 15) * 1000);

  // Active channels: 7 ↔ 6/7 every 15s, with matching status + delta.
  const channelsTimer = setInterval(() => {
    channelsUp = !channelsUp;
    store.set('$/dash/channels', channelsUp ? '7' : '6/7');
    store.set('$/dash/channelsStatus', channelsUp ? '7 / 7 running' : 'telegram bot offline');
    store.set('$/dash/channelsDelta', channelsUp ? 'all connected' : '1 disconnected');
  }, 15000);

  // Activity rollup: prepend an event each rand(3..9)s, keep the newest 7.
  let activityTimer: ReturnType<typeof setTimeout>;
  const addActivity = (): void => {
    const list = (store.get('$/dash/activities') as DashActivity[] | undefined) ?? [];
    store.set('$/dash/activities', [pickActivity(), ...list].slice(0, 7));
    activityTimer = setTimeout(addActivity, rand(3, 9) * 1000);
  };
  activityTimer = setTimeout(addActivity, rand(3, 9) * 1000);

  return () => {
    clearTimeout(toolTimer);
    clearTimeout(activityTimer);
    clearInterval(channelsTimer);
  };
};
