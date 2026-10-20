// Small world effects at 2× detail (DECISIONS D106): ground shadows, refill bucket, water
// drop, dust puff and the clue marker.
import { dot, ellipse, fill, limb, shaded } from './svg';

export function shadowArt(w: number, h: number): string {
  return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="#000" opacity="0.35"/>`;
}

/** Bucket shown when the player hand-refills (spec §6.1). 12×12 world px. */
export function bucket(): string {
  return [
    limb('M2.6,4.4 Q6,-0.6 9.4,4.4', '#5f666a', 0.6, 0),
    shaded(
      'M2,4 L10,4 L9,11 L3,11 Z',
      { light: '#c4cacc', mid: '#a2a8aa', dark: '#5f666a' },
      { rim: [1, 0] },
    ),
    fill(ellipse(6, 4.2, 4, 0.9), '#7fa3b5'),
    fill(ellipse(5.4, 4, 1.6, 0.4), '#cfe6ee'),
    limb('M2.4,7 L9.6,7', '#5f666a', 0.4, 0),
  ].join('');
}

/** Water drop particle, 3×3 world px. */
export function drop(): string {
  return fill(ellipse(1.5, 1.6, 1.3, 1.3), '#7fa3b5') + dot(1.1, 1.1, 0.45, '#ffffff');
}

/** Dust puff particle, 4×4 world px. */
export function dust(): string {
  return fill(ellipse(2, 2.1, 1.9, 1.7), '#b8a77a') + fill(ellipse(1.6, 1.6, 0.9, 0.7), '#d6c79c');
}

/** Magnifying glass marking a clue to examine, 16×16 world px. */
export function clueMarker(): string {
  return [
    limb('M10,10 L14.6,14.6', '#4a3424', 2, 0),
    limb('M10.4,10.4 L14,14', '#8c6a48', 1, 0),
    shaded(
      ellipse(6.5, 6.5, 5, 5),
      { light: '#f6d27a', mid: '#e8b23a', dark: '#b8862a' },
      { rim: [0.8, 0.8] },
    ),
    fill(ellipse(6.5, 6.5, 3.4, 3.4), '#9cc4d8'),
    fill(ellipse(5.6, 5.4, 1.4, 1), '#e6f4f8'),
  ].join('');
}
