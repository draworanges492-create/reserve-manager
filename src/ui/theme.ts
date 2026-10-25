import { getSettings } from '../core/Settings';

/** Shared UI colours (match the palette in tools/palette.ts). */
export const UI = {
  panel: 0x241c16,
  panelAlpha: 0.92,
  border: 0x6a4a32,
  hover: 0x3a2e24,
  selected: 0x8b5a3c,
  text: '#e8d9a8',
  textDim: '#e8d9a8aa',
  accent: 0xe8d9a8,
  shadow: '#120d09',
} as const;

/** Ruth's journal (D130): ink on cream pages. Contrast checked in tests/ui/contrast.test.ts. */
export const JOURNAL = {
  ink: '#3a2a1c',
  faded: '#6a5236',
  new: '#b03a26',
  cover: 0x5a3a22,
  page: 0xefe2c4,
  pageEdge: 0xd8c8a2,
} as const;

/** Speaker names in the dialogue box. */
export const SPEAKER_COLOR = '#f0b46a';

/** Main-menu background. */
export const MENU_BACKGROUND = 0x1d2b1f;

const BASE_SIZES = { small: 9, body: 10, label: 11, title: 18 } as const;
const LARGE_SCALE = 1.2;

/**
 * Text sizes in game pixels (×2 on screen on a MacBook). Getters, so the "large text"
 * setting applies whenever the HUD is (re)built.
 */
export const TEXT_SIZE = {
  get small(): string {
    return size('small');
  },
  get body(): string {
    return size('body');
  },
  get label(): string {
    return size('label');
  },
  get title(): string {
    return size('title');
  },
};

function size(key: keyof typeof BASE_SIZES): string {
  const scale = getSettings().textSize === 'large' ? LARGE_SCALE : 1;
  return `${Math.round(BASE_SIZES[key] * scale)}px`;
}

export type Level = 'good' | 'fair' | 'poor';

/**
 * Status colours for meters and alerts. The colourblind set (Okabe–Ito) avoids red/green;
 * in that mode a status icon is shown too (spec §7.7).
 */
const LEVEL_COLORS: Record<'normal' | 'colorblind', Record<Level, number>> = {
  normal: { good: 0x6fbf4a, fair: 0xe0b53a, poor: 0xd2483a },
  colorblind: { good: 0x0072b2, fair: 0xe69f00, poor: 0xd55e00 },
};

export function levelColor(level: Level): number {
  return LEVEL_COLORS[getSettings().colorblind ? 'colorblind' : 'normal'][level];
}

export function levelOf(value: number): Level {
  return value >= 60 ? 'good' : value >= 35 ? 'fair' : 'poor';
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
