import { surfaceSocket } from './register-shell.js';

export function simulateAgentSurface(): void {
  surfaceSocket.dispatch('surface:open', {
    surfaceId: 'demo:s1',
    schema: 'a2ui/v0.10',
    preferredSurface: 'main',
    payload: {
      root: 'card',
      dataModel: { counter: 0, lastEvent: '(none)', name: '' },
      components: {
        card: { component: 'Card', properties: { title: 'Demo surface' }, children: ['col'] },
        col: {
          component: 'Column',
          properties: { gap: 12 },
          children: ['greeting', 'counterText', 'lastText', 'nameField', 'nameEcho', 'incBtn', 'resetBtn'],
        },
        greeting: { component: 'Text', properties: { text: 'I was created by a fake a2ui v0.10 payload.' } },
        counterText: { component: 'Text', properties: { text: { dataBinding: { path: 'counter' } } } },
        lastText: { component: 'Text', properties: { text: { dataBinding: { path: 'lastEvent' } }, muted: true } },
        nameField: {
          component: 'TextField',
          properties: { label: 'Your name', value: { dataBinding: { path: 'name' } }, placeholder: 'Type here…' },
        },
        nameEcho: { component: 'Text', properties: { text: { dataBinding: { path: 'name' } } } },
        incBtn: {
          component: 'Button',
          properties: { label: 'Increment', variant: 'primary', onClick: { action: { type: 'event', name: 'increment' } } },
        },
        resetBtn: {
          component: 'Button',
          properties: { label: 'Close surface', variant: 'danger', onClick: { action: { type: 'event', name: 'close' } } },
        },
      },
    },
  });
}
