// Helpers for world art (DECISIONS D106): shapes are written as SVG in world pixels, then
// rendered to crisp pixel art at ART_SCALE texels per world pixel (see raster.ts).
import { Resvg } from '@resvg/resvg-js';
import { ART_SCALE } from '../../src/config/game';

export { ART_SCALE };

/** Dark outline colour shared by everything clickable, so it reads against any ground. */
export const INK = '#2a1d14';

export function svg(width: number, height: number, body: string, defs = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${defs}</defs>${body}</svg>`;
}

/** Render an SVG drawn in world pixels to a PNG at ART_SCALE. */
export function renderPng(source: string, scale = ART_SCALE): Buffer {
  const resvg = new Resvg(source, { fitTo: { mode: 'zoom', value: scale } });
  return Buffer.from(resvg.render().asPng());
}

/** Vertical linear gradient from a list of [offset 0–1, colour]. */
export function vGradient(id: string, stops: [number, string][]): string {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join('')}</linearGradient>`;
}

export function radial(id: string, stops: [number, string][], cx = 0.35, cy = 0.3): string {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.75">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join('')}</radialGradient>`;
}

/** A filled path with the shared outline. */
export function shape(d: string, fill: string, outline = 0.4, extra = ''): string {
  const stroke =
    outline > 0 ? ` stroke="${INK}" stroke-width="${outline}" stroke-linejoin="round"` : '';
  return `<path d="${d}" fill="${fill}"${stroke} ${extra}/>`;
}

/** A stroked line (legs, horns, branches) with round ends; `outline` adds a dark rim. */
export function limb(d: string, color: string, width: number, outline = 0.4): string {
  const rim =
    outline > 0
      ? `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${width + outline * 2}" stroke-linecap="round" stroke-linejoin="round"/>`
      : '';
  return `${rim}<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Lay several frames (each `width` wide) side by side as a Phaser spritesheet. */
export function strip(width: number, height: number, frames: string[], defs = ''): string {
  return svg(
    width * frames.length,
    height,
    frames.map((f, i) => `<g transform="translate(${i * width} 0)">${f}</g>`).join(''),
    defs,
  );
}

/** Light, mid and dark tone of one material. */
export interface Ramp {
  light: string;
  mid: string;
  dark: string;
}

let clipCount = 0;

/** An ellipse as path data (so it can be clipped and offset like any shape). */
export function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0 Z`;
}

/**
 * A shape lit from the top left: dark tone, then the mid tone shifted up-left so a dark rim
 * stays on the shaded side, then optional lit patches and details, all clipped to the shape.
 */
export function shaded(
  d: string,
  ramp: Ramp,
  {
    rim = [0.6, 0.7],
    light = '',
    extra = '',
  }: { rim?: [number, number]; light?: string; extra?: string } = {},
): string {
  const id = `clip${clipCount++}`;
  const lit = light ? `<path d="${light}" fill="${ramp.light}"/>` : '';
  return (
    `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>` +
    `<path d="${d}" fill="${ramp.dark}"/>` +
    `<g clip-path="url(#${id})"><path d="${d}" transform="translate(${-rim[0]} ${-rim[1]})" fill="${ramp.mid}"/>${lit}${extra}</g>`
  );
}

/** Wrap content so it is clipped to `d` (stripes, spots, bands on a body). */
export function clipped(d: string, content: string): string {
  const id = `clip${clipCount++}`;
  return `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})">${content}</g>`;
}

export function fill(d: string, color: string): string {
  return `<path d="${d}" fill="${color}"/>`;
}

export function dot(cx: number, cy: number, r: number, color: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
}

/** Mirror a drawing horizontally inside a box of width `w`. */
export function mirror(w: number, content: string): string {
  return `<g transform="translate(${w} 0) scale(-1 1)">${content}</g>`;
}
