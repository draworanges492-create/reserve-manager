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

/** Text sizes in game pixels (×2 on screen on a MacBook). */
export const TEXT_SIZE = {
  small: '9px',
  body: '10px',
  label: '11px',
  title: '18px',
} as const;
