import type { CSSProperties } from 'react';
import './Icon.css';

// a2ui v0.10: `name` is required and is either a known enum value (~58 names)
// OR an object `{ path: <svg path> }` for custom SVG glyphs. scena also
// tolerates a freeform string (any unicode/emoji glyph) as a scena extension.
const VS_TEXT = '\uFE0E'; // text / monochrome request
const VS_EMOJI = '\uFE0F'; // emoji / color request

// Emoji-ish chars that commonly accept FE0E.
// Includes pictographic emoji + older symbol emoji like ⏰, ⚙, ★, etc.
const TEXT_VARIANT_TARGET =
  /[\p{Extended_Pictographic}\u2194-\u21AA\u231A-\u231B\u23E9-\u23F3\u2460-\u24FF\u25A0-\u25FF\u2600-\u27BF\u2B00-\u2BFF]/u;

export function toMonochromeEmoji(input: string) {
  const chars = Array.from(String(input));
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    // Convert FE0F -> FE0E
    if (ch === VS_EMOJI) {
      out += VS_TEXT;
      continue;
    }

    // Keep existing FE0E
    if (ch === VS_TEXT) {
      out += ch;
      continue;
    }

    out += ch;

    // If char can use text presentation and does not already have a selector,
    // append FE0E.
    const next = chars[i + 1];
    if (TEXT_VARIANT_TARGET.test(ch) && next !== VS_TEXT && next !== VS_EMOJI) {
      out += VS_TEXT;
    }
  }

  return out;
}

// Unicode glyph fallback for the enum names. Until a real font / SVG sprite
// registry lands, this gives `{name:'check'}` a sensible rendering.
export const NAMED_GLYPH: Record<string, string> = {
  accountCircle: '\u{1F464}',
  add: '+',
  // add: '＋',
  arrowBack: '←',
  arrowDown: '↓',
  arrowForward: '→',
  arrowLeft: '←',
  arrowRight: '→',
  arrowUp: '↑',
  // attachFile: '\u{1F4CE}',
  attachFile: toMonochromeEmoji('📎'), // 📎
  calendarToday: toMonochromeEmoji('\u{1F4C5}'), 
  call: toMonochromeEmoji('\u{1F4DE}'),
  camera: toMonochromeEmoji('\u{1F4F7}'), 
  // camera: toMonochromeEmoji('📸'), // 📸
  chatModeAsk: toMonochromeEmoji('❓'), // ❓ 💬
  chatModeAuto: toMonochromeEmoji('⚡'), // ⚡
  chatModeDirect: toMonochromeEmoji('📨'), // 📨
  chatModePlan: '🗒',
  check: '✓',
  chevronDown: '⮟',
  chevronUp: '⮝',
  close: '✕', 
  // close: toMonochromeEmoji('×'), // ×
  closePanel: '⨉',
  copy: '⎘',
  cut: '✂',
  delete: '🗑', 
  // delete: toMonochromeEmoji('⌫'), // ⌫
  // download: '↓',
  download: toMonochromeEmoji('⏬'), // ⏬
  edit: '✎', 
  error: '!', 
  event: toMonochromeEmoji('\u{1F4C5}'),
  fastForward: toMonochromeEmoji('⏩'),
  favorite: '♥',
  favoriteOff: '♡',
  fileText: '▤',
  folder: toMonochromeEmoji('\u{1F4C1}'),
  folderNormal: toMonochromeEmoji('📁'), // 📁︎
  folderOpen: toMonochromeEmoji('📂'), // 📂︎
  help: '?',
  home: '⌂',
  imageVideo: '🖼', // 🖼
  info: 'ℹ',
  locationOn: toMonochromeEmoji('\u{1F4CD}'),
  lock: toMonochromeEmoji('🔒'),
  lockOpen: toMonochromeEmoji('🔓'),
  mail: '✉',
  menu: '☰',
  mobileGo: toMonochromeEmoji('📲'), // 📲
  mobileOff: toMonochromeEmoji('📴'), // 📴
  mobileStatus: toMonochromeEmoji('📳'), // 📳
  moreHoriz: '⋯',
  moreVert: '⋮',
  notifications: toMonochromeEmoji('\u{1F514}'),
  notificationsOff: toMonochromeEmoji('\u{1F515}'),
  pause: '⏸', 
  payment: toMonochromeEmoji('\u{1F4B3}'),
  person: toMonochromeEmoji('\u{1F464}'),
  phone: toMonochromeEmoji('\u{1F4DE}'),
  photo: toMonochromeEmoji('\u{1F5BC}'), 
  pin: toMonochromeEmoji('📌'),
  play: '▶',
  print: toMonochromeEmoji('\u{1F5A8}'),
  profile: toMonochromeEmoji('♙'), // ♙︎
  recordAudio: toMonochromeEmoji('🎙'), // 🎙
  refresh: '↻', 
  reload: toMonochromeEmoji('⟳'), // ⟳
  rewind: '⏪',
  route: toMonochromeEmoji('⤳'), // ⤳
  run: toMonochromeEmoji('▶'), // ▶
  save: toMonochromeEmoji('✓'), // ✓
  // search: toMonochromeEmoji('\u{1F50D}'),
  search: toMonochromeEmoji('⌕'), // ⌕
  send: '➤',
  settings: '⚙', 
  share: '↗',
  shoppingCart: toMonochromeEmoji('\u{1F6D2}'),
  skipNext: '⏭', 
  skipPrevious: '⏮',
  star: '★', 
  starHalf: '⯨',
  starOff: '☆', 
  stop: '⏹',
  trash: toMonochromeEmoji('🗑'), // 🗑
  unpin: toMonochromeEmoji('📍'),
  upload: toMonochromeEmoji('⏫'), // ⏫
  visibility: '👁',
  visibilityOff: toMonochromeEmoji('\u{1F576}'),
  volumeDown: toMonochromeEmoji('\u{1F509}'),
  volumeMute: toMonochromeEmoji('\u{1F507}'),
  volumeOff: toMonochromeEmoji('\u{1F507}'),
  volumeUp: toMonochromeEmoji('\u{1F50A}'),
  warning: '⚠',  
};

export type IconName = keyof typeof NAMED_GLYPH;

function isKnownName(v: string): v is IconName {
  return Object.prototype.hasOwnProperty.call(NAMED_GLYPH, v);
}

export interface IconProps {
  // a2ui v0.10: known enum name OR `{ path }`. scena extension: any freeform
  // string is rendered verbatim as a glyph.
  name?: IconName | string | { path: string };
  // scena extensions:
  size?: number;
  color?: string;
  style?: CSSProperties;
}

export function Icon({ name = '•', size = 16, color, style }: IconProps) {
  if (typeof name === 'object' && name && 'path' in name) {
    return (
      <span
        aria-hidden
        className="oo-icon oo-icon--svg"
        style={{ width: size, height: size, color, display: 'inline-flex', ...style }}
      >
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={name.path} />
        </svg>
      </span>
    );
  }
  const text =
    typeof name === 'string' && isKnownName(name) ? NAMED_GLYPH[name] : (name as string);
  return (
    <span
      aria-hidden
      className="oo-icon"
      style={{ fontSize: size, color, ...style }}
    >
      {text}
    </span>
  );
}
