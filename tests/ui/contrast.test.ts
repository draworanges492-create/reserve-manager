import { describe, expect, it } from 'vitest';
import { hex, JOURNAL, MENU_BACKGROUND, SPEAKER_COLOR, UI } from '../../src/ui/theme';

// WCAG 2.1 contrast (D141): body text needs at least 4.5:1 against what's behind it.
type Rgb = [number, number, number];

function parse(color: string): { rgb: Rgb; alpha: number } {
  const h = color.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
  return { rgb, alpha: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
}

function over(top: Rgb, bottom: Rgb, alpha: number): Rgb {
  return top.map((c, i) => c * alpha + (bottom[i] ?? 0) * (1 - alpha)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const f = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(text: string, background: Rgb): number {
  const { rgb, alpha } = parse(text);
  const fg = over(rgb, background, alpha);
  const [hi, lo] = [luminance(fg), luminance(background)].sort((a, b) => b - a);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const solid = (color: number): Rgb => parse(hex(color)).rgb;
// HUD panels are slightly see-through: check them over the brightest ground they can cover.
const panelOverLightGround = over(solid(UI.panel), [240, 230, 200], UI.panelAlpha);

describe('text contrast (WCAG AA)', () => {
  const cases: [string, string, Rgb][] = [
    ['HUD text', UI.text, panelOverLightGround],
    ['dim HUD text', UI.textDim, panelOverLightGround],
    ['speaker names', SPEAKER_COLOR, solid(UI.panel)],
    ['menu text', UI.text, solid(MENU_BACKGROUND)],
    ['dim menu text', UI.textDim, solid(MENU_BACKGROUND)],
    ['journal ink', JOURNAL.ink, solid(JOURNAL.page)],
    ['journal dates', JOURNAL.faded, solid(JOURNAL.page)],
    ['journal "new" and links', JOURNAL.new, solid(JOURNAL.page)],
  ];
  for (const [name, text, bg] of cases)
    it(`${name} is at least 4.5:1`, () => expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5));
});
