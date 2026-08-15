import { resolveColorAlpha, type BindingPath, type ComponentNode } from '@softov/scena/types';

type Bind = { path: string | BindingPath };
type KpiCardProps = {
  icon?: string;
  label: string;
  value: Bind;
  text?: Bind;
  tone?: 'success' | 'warning' | 'danger';
  color?: string;
};

export function kpiCard2(props: KpiCardProps): ComponentNode {
  const { icon, label, value = 'default', text, tone, color: colorProp } = props;
  const color = colorProp ?? 'default';
  return {
    component: 'Card',
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
              component: 'Icon',
              name: icon,
              size: 30,
              style: {
                flexShrink: 0,
                color: resolveColorAlpha(color, 0.6),
                backgroundColor: resolveColorAlpha(color, 0.1),
                borderColor: resolveColorAlpha(color, 0.2),
                borderStyle: 'solid',
                borderWidth: 2,
                padding: 'var(--oo-spacing-sm)',
                borderRadius: 'var(--oo-radius-lg)',
              },
            },
            {
              component: 'Column',
              gap: 0,
              children: [
                { component: 'Text', text: label, variant: 'caption', muted: true },
                {
                  component: 'Text',
                  text: value,
                  variant: 'h1',
                  style: {
                    color: resolveColorAlpha(color),
                  },
                },
              ],
            },
          ],
        },
        ...(text
          ? [
              {
                component: 'Text',
                text: text,
                variant: 'caption',
                tone: tone,
              } satisfies ComponentNode,
            ]
          : []),
      ],
    },
  };
}

export function kpiCard(props: KpiCardProps): ComponentNode {
  const { icon, label, value = 'default', text, tone } = props;
  return {
    component: 'Card',
    child: {
      component: 'Column',
      gap: 4,
      children: [
        {
          component: 'Row',
          gap: 8,
          align: 'center',
          children: [
            { component: 'Icon', name: icon, size: 18 },
            { component: 'Text', text: label, variant: 'caption', muted: true },
          ],
        },
        { component: 'Text', text: value, variant: 'h1' },
        ...(text
          ? [
              {
                component: 'Text',
                text: text,
                variant: 'caption',
                tone: tone,
              } satisfies ComponentNode,
            ]
          : []),
      ],
    },
  };
}
