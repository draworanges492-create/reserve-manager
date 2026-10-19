// In-memory RGBA pixel canvas used by the placeholder generator.
import { GLYPH_WIDTH, glyph } from './font3x5';

export type Rgba = readonly [number, number, number, number];

export const TRANSPARENT: Rgba = [0, 0, 0, 0];

export function hex(value: string, alpha = 255): Rgba {
  const n = parseInt(value.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, alpha];
}

export function sameColor(a: Rgba, b: Rgba): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

export class PixelCanvas {
  readonly data: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8Array(width * height * 4);
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  set(x: number, y: number, color: Rgba): void {
    const px = Math.round(x);
    const py = Math.round(y);
    if (!this.inBounds(px, py)) return;
    this.data.set(color, (py * this.width + px) * 4);
  }

  get(x: number, y: number): Rgba {
    if (!this.inBounds(x, y)) return TRANSPARENT;
    const i = (y * this.width + x) * 4;
    const d = this.data;
    return [d[i] ?? 0, d[i + 1] ?? 0, d[i + 2] ?? 0, d[i + 3] ?? 0];
  }

  isOpaque(x: number, y: number): boolean {
    return this.get(x, y)[3] > 0;
  }

  fillRect(x: number, y: number, w: number, h: number, color: Rgba): void {
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) this.set(px, py, color);
  }

  /** Filled ellipse; optional `where` restricts which pixels are painted (used for shading). */
  fillEllipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: Rgba,
    where: (x: number, y: number) => boolean = () => true,
  ): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && where(x, y)) this.set(x, y, color);
      }
    }
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, color: Rgba): void {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const tx = Math.round(x1);
    const ty = Math.round(y1);
    const dx = Math.abs(tx - x);
    const dy = -Math.abs(ty - y);
    const sx = x < tx ? 1 : -1;
    const sy = y < ty ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x, y, color);
      if (x === tx && y === ty) return;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** Replace opaque pixels where `fn` returns a colour. */
  recolor(fn: (x: number, y: number, current: Rgba) => Rgba | null): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const current = this.get(x, y);
        if (current[3] === 0) continue;
        const next = fn(x, y, current);
        if (next) this.set(x, y, next);
      }
    }
  }

  /** 1 px outline around all opaque pixels (4-neighbour), so sprites read against any ground. */
  outline(color: Rgba): void {
    const solid = (x: number, y: number): boolean => this.isOpaque(x, y);
    const targets: [number, number][] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (solid(x, y)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
          targets.push([x, y]);
        }
      }
    }
    for (const [x, y] of targets) this.set(x, y, color);
  }

  text(str: string, x: number, y: number, color: Rgba): void {
    [...str].forEach((char, i) => {
      glyph(char)?.forEach((row, gy) =>
        row.forEach((on, gx) => {
          if (on) this.set(x + i * (GLYPH_WIDTH + 1) + gx, y + gy, color);
        }),
      );
    });
  }

  blit(src: PixelCanvas, dx: number, dy: number): void {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const c = src.get(x, y);
        if (c[3] > 0) this.set(dx + x, dy + y, c);
      }
    }
  }
}

/** Lays frames out left-to-right as a Phaser spritesheet. */
export function stripOf(frames: PixelCanvas[]): PixelCanvas {
  const first = frames[0];
  if (!first) throw new Error('stripOf: no frames');
  const sheet = new PixelCanvas(first.width * frames.length, first.height);
  frames.forEach((frame, i) => sheet.blit(frame, i * first.width, 0));
  return sheet;
}
