import type { ThemeDefinition } from '../styles/index.js';
import { paletteTokens } from './palette.js';

/** Forest: deep greens, an emerald accent. */
export const forestTheme: ThemeDefinition = {
  id: 'forest',
  label: 'Forest',
  variants: {
    light: {
      kind: 'tokens',
      tokens: paletteTokens({
        canvas: '240 253 244', // #f0fdf4
        panel: '220 245 228', // #dcf5e4
        surface: '255 255 255', // #ffffff
        raised: '255 255 255', // #ffffff
        text: '5 46 22', // #052e16
        muted: '79 122 99', // #4f7a63
        subtle: '120 160 138', // #78a08a
        line: '220 242 228', // #dcf2e4
        border: '187 226 201', // #bbe2c9
        hover: '225 246 232', // #e1f6e8
        active: '204 236 214', // #ccecd6
        selected: '209 250 223', // #d1fadf
        accent: '5 150 105', // #059669
        primary: '4 120 87', // #047857, darker so white reads on it
        onAccent: '255 255 255', // #ffffff
      }),
    },
    dark: {
      kind: 'tokens',
      tokens: paletteTokens({
        canvas: '10 20 16', // #0a1410
        panel: '13 27 21', // #0d1b15
        surface: '15 31 24', // #0f1f18
        raised: '20 41 32', // #142920
        text: '220 252 231', // #dcfce7
        muted: '125 168 150', // #7da896
        subtle: '95 135 118', // #5f8776
        line: '22 53 40', // #163528
        border: '30 70 52', // #1e4634
        hover: '20 41 32', // #142920
        active: '26 55 42', // #1a372a
        selected: '18 62 45', // #123e2d
        accent: '52 211 153', // #34d399
        onAccent: '10 20 16', // #0a1410
      }),
    },
  },
};
