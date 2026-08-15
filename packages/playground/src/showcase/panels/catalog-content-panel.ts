import type { ComponentNode } from '@softov/scena/types';

function entry(title: string, body: ComponentNode): ComponentNode {
  return { component: 'Card', title, child: body };
}

export const catalogContentPanelNode: ComponentNode = {
  component: 'Column',
  gap: 16,
  style: { padding: 16 },
  children: [
    { component: 'Text', text: 'Catalog — Content / Media', variant: 'h1' },
    {
      component: 'Text',
      text: 'Text, Image, Icon, Video, AudioPlayer.',
      muted: true,
    },

    entry('Text variants', {
      component: 'Column',
      gap: 4,
      children: [
        { component: 'Text', text: 'Heading 1', variant: 'h1' },
        { component: 'Text', text: 'Heading 2', variant: 'h2' },
        { component: 'Text', text: 'Heading 3', variant: 'h3' },
        { component: 'Text', text: 'Body text (the default).', variant: 'body' },
        { component: 'Text', text: 'Caption text.', variant: 'caption', muted: true },
      ],
    }),

    entry('Text tones', {
      component: 'Column',
      gap: 4,
      children: [
        { component: 'Text', text: 'Accent tone', tone: 'accent' },
        { component: 'Text', text: 'Success tone', tone: 'success' },
        { component: 'Text', text: 'Warning tone', tone: 'warning' },
        { component: 'Text', text: 'Danger tone', tone: 'danger' },
        { component: 'Text', text: 'Muted (no tone)', muted: true },
      ],
    }),

    entry('Image', {
      component: 'Image',
      url: 'https://placehold.co/240x120/3b82f6/ffffff?text=Image',
      description: 'Demo image',
      width: 240,
      height: 120,
      fit: 'cover',
    }),

    entry('Icon (literal glyph)', {
      component: 'Row',
      gap: 12,
      // align: 'center',
      wrap: true,
      children: [

        { component: 'Icon', name: '❤', size: 128, color: 'var(--oo-color-red)' },

        { component: 'Icon', name: '⚙', size: 32, color: 'var(--oo-color-white)' },
        { component: 'Icon', name: '⚙', size: 32, color: 'var(--oo-color-black)' },
        { component: 'Icon', name: '⚙', size: 32, color: 'var(--oo-color-gray)' },
        { component: 'Icon', name: '⚙', size: 32, color: 'var(--oo-color-slate)' },
        { component: 'Icon', name: '⚙', size: 32, color: 'var(--oo-color-zinc)' },
        { component: 'Icon', name: '⚙', size: 32, color: 'var(--oo-color-neutral)' },
        { component: 'Icon', name: '⚙', size: 32, color: 'var(--oo-color-stone)' },

        { component: 'Icon', name: '▣', size: 32, color: 'var(--oo-color-teal)' },
        { component: 'Icon', name: '☷', size: 32, color: 'var(--oo-color-sky)' },
        { component: 'Icon', name: '☻', size: 32, color: 'var(--oo-color-emerald)' },

        { component: 'Icon', name: '⚇', size: 32, color: 'var(--oo-color-yellow)' },
        { component: 'Icon', name: '◎', size: 32, color: 'var(--oo-color-cyan)' },
        { component: 'Icon', name: '◈', size: 32, color: 'var(--oo-color-orange)' },
        { component: 'Icon', name: '⚒', size: 32, color: 'var(--oo-color-amber)' },
        { component: 'Icon', name: '✨︎', size: 32, color: 'var(--oo-color-indigo)' },
        { component: 'Icon', name: '☰', size: 32, color: 'var(--oo-color-cyan)' },

        { component: 'Icon', name: '✣', size: 32, color: 'var(--oo-color-purple)' },
        
        { component: 'Icon', name: '⛓', size: 32, color: 'var(--oo-color-orange)' },
        { component: 'Icon', name: '◌', size: 32, color: 'var(--oo-color-emerald)' },
        { component: 'Icon', name: '⌁', size: 32, color: 'var(--oo-color-blue)' },
        { component: 'Icon', name: '▤', size: 32, color: 'var(--oo-color-pink)' },
        { component: 'Icon', name: '✓', size: 32, color: 'var(--oo-color-violet)' },
        { component: 'Icon', name: '◷', size: 32, color: 'var(--oo-color-indigo)' },

        { component: 'Icon', name: '▧', size: 32, color: 'var(--oo-color-teal)' },
        { component: 'Icon', name: '▦', size: 32, color: 'var(--oo-color-fg)' },
        { component: 'Icon', name: '☷', size: 32, color: 'var(--oo-color-fg)' },
        { component: 'Icon', name: '♟', size: 32, color: 'var(--oo-color-fg)' },
        { component: 'Icon', name: '⚠︎', size: 32, color: 'var(--oo-color-fg)' },
        { component: 'Icon', name: '⚙', size: 32, color: 'var(--oo-color-fg)' },

        { component: 'Icon', name: '⚇', size: 32, color: 'var(--oo-color-violet)' },
        { component: 'Icon', name: '⌕', size: 32, color: 'var(--oo-color-sky)' },
        { component: 'Icon', name: '+', size: 32, color: 'var(--oo-color-sky)' },
        { component: 'Icon', name: '▥', size: 32, color: 'var(--oo-color-fg)' },
        { component: 'Icon', name: '◐', size: 32, color: 'var(--oo-color-fg)' },
        { component: 'Icon', name: '⌘', size: 32, color: 'var(--oo-color-emerald)' },

        { component: 'Icon', name: '▣', size: 32, color: 'var(--oo-color-fg)' },
        { component: 'Icon', name: '❕︎', size: 32, color: 'var(--oo-color-orange)' },
        { component: 'Icon', name: '⚇', size: 32, color: 'var(--oo-color-violet)' },
        { component: 'Icon', name: '◌', size: 32, color: 'var(--oo-color-sky)' },
        { component: 'Icon', name: '#', size: 32, color: 'var(--oo-color-fg)' },
      ],
    }),

    entry('Badges', {
      component: 'Row',
      gap: 12,
      // align: 'center',
      wrap: true,
      children: [
        { component: 'Badge', label: 'Default' },
        { component: 'Badge', tone: 'info', text: 'Info' },
        { component: 'Badge', tone: 'success', label: 'Success' },
        { component: 'Badge', tone: 'warning', text: 'Warning' },
        { component: 'Badge', tone: 'danger', text: 'Danger' },
      ],
    }),
    entry('Alerts', {
      component: 'Row',
      gap: 12,
      // align: 'center',
      wrap: true,
      children: [
        { component: 'Alert', title: 'Default', message: 'This is an alert message.' },
        { component: 'Alert', tone: 'info', title: 'Info', message: 'This is an info alert message.' },
        { component: 'Alert', tone: 'success', title: 'Success', message: 'This is a success alert message.' },
        { component: 'Alert', tone: 'warning', title: 'Warning', message: 'This is a warning alert message.' },
        { component: 'Alert', tone: 'danger', title: 'Danger', message: 'This is a danger alert message.' },
      ],
    }),

    entry('Video', {
      component: 'Video',
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      width: 320,
    }),

    entry('AudioPlayer', {
      component: 'AudioPlayer',
      url: 'https://www.w3schools.com/html/horse.mp3',
      description: 'Big Buck Bunny soundtrack sample',
    }),
  ],
};
