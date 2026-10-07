import type { ThemeDefinition } from '../styles/index.js';
import { paletteTokens } from './palette.js';

/**
 * Solarized, from Ethan Schoonover's sixteen colours: base3 to base03 for the
 * ground and the text, and the text colour as the accent, so nothing but state
 * is coloured.
 */
export const solarizedTheme: ThemeDefinition = {
  id: 'solarized',
  label: 'Solarized',
  variants: {
    light: {
      kind: 'tokens',
      tokens: {
        ...paletteTokens({
          canvas: '253 246 227', // base3 #fdf6e3
          panel: '238 232 213', // base2 #eee8d5
          surface: '253 246 227', // base3
          raised: '253 246 227', // base3
          text: '88 110 117', // base01 #586e75
          muted: '131 148 150', // base0 #839496
          subtle: '147 161 161', // base1 #93a1a1
          line: '238 232 213', // base2
          border: '219 213 193', // #dbd5c1
          hover: '227 220 196', // #e3dcc4
          active: '216 208 182', // #d8d0b6
          selected: '227 220 196', // #e3dcc4
          accent: '88 110 117', // base01
          onAccent: '253 246 227', // base3
          danger: '220 50 47', // red #dc322f
          success: '133 153 0', // green #859900
          warning: '181 137 0', // yellow #b58900
          info: '38 139 210', // blue #268bd2
        }),
        '--load-border': '220 220 228',
        '--load-accent': '56 110 117',
        '--load-accent-2': '88 143 143',
      },
    },
    dark: {
      kind: 'tokens',
      tokens: {
        ...paletteTokens({
          canvas: '0 43 54', // base03 #002b36
          panel: '7 54 66', // base02 #073642
          surface: '0 43 54', // base03
          raised: '7 54 66', // base02
          text: '147 161 161', // base1 #93a1a1
          muted: '101 123 131', // base00 #657b83
          subtle: '88 110 117', // base01 #586e75
          line: '7 54 66', // base02
          border: '8 67 82', // #084352
          hover: '9 67 82', // #094352
          active: '12 78 95', // #0c4e5f
          selected: '9 67 82', // #094352
          accent: '147 161 161', // base1
          onAccent: '0 43 54', // base03
          danger: '220 50 47', // red
          success: '133 153 0', // green
          warning: '181 137 0', // yellow
          info: '38 139 210', // blue
        }),
        '--load-border': '8 67 82',
        '--load-accent': '147 161 161',
        '--load-accent-2': '147 161 161',
      },
    },
  },
};
