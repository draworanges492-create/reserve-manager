// The project palette (spec §12: ≤32 colours). Every generated pixel uses one of these.
import { hex } from './lib/canvas';

export const PAL = {
  // Map: muted, low-saturation, no outlines (DECISIONS D13).
  grassDark: hex('#4a5e3a'),
  grass: hex('#62754a'),
  grassLight: hex('#7a8a56'),
  grassDry: hex('#9a9058'),
  dirt: hex('#8a6f4e'),
  dirtDark: hex('#6b5440'),
  sand: hex('#b8a77a'),
  rock: hex('#7d7768'),
  rockDark: hex('#5e5a52'),
  waterDeep: hex('#3d6079'),
  water: hex('#56809a'),
  waterLight: hex('#7fa3b5'),
  mud: hex('#6f6650'),
  treeDark: hex('#33482c'),
  tree: hex('#43603a'),
  wood: hex('#6a4a32'),
  roof: hex('#8b5a3c'),
  // Animals and people: saturated colours that never appear on the map.
  outline: hex('#1a1410'),
  impala: hex('#d9822b'),
  impalaLight: hex('#f0b46a'),
  white: hex('#f2f0e6'),
  lionGold: hex('#e8b23a'),
  lionMane: hex('#a0521d'),
  elephant: hex('#a79bb5'),
  elephantLight: hex('#c7bdd2'),
  skin: hex('#c68a5e'),
  red: hex('#d2483a'),
  blue: hex('#3a8ee6'),
  shadow: hex('#000000'),
  // UI and debug.
  uiPanel: hex('#241c16'),
  uiText: hex('#e8d9a8'),
  debug: hex('#ff00ff'),
} as const;

export type PaletteName = keyof typeof PAL;
