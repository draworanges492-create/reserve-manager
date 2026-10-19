// Placeholder HUD icons (12×12), outlined like sprites so they read on any panel.
import { PixelCanvas } from '../lib/canvas';
import { PAL } from '../palette';

const SIZE = 12;

function sun(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  for (const [x0, y0, x1, y1] of [
    [6, 0, 6, 2],
    [6, 9, 6, 11],
    [0, 6, 2, 6],
    [9, 6, 11, 6],
    [2, 2, 3, 3],
    [9, 2, 8, 3],
    [2, 10, 3, 9],
    [10, 10, 9, 9],
  ] as const)
    c.line(x0, y0, x1, y1, PAL.impala);
  c.fillEllipse(6, 6, 3, 3, PAL.lionGold);
  return c;
}

function raindrop(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  c.fillEllipse(6, 7.5, 3.5, 3.5, PAL.blue);
  for (let y = 1; y <= 5; y++)
    c.fillRect(6 - Math.floor(y / 2), y, 1 + 2 * Math.floor(y / 2), 1, PAL.blue);
  c.set(5, 7, PAL.white);
  c.set(5, 8, PAL.white);
  c.outline(PAL.outline);
  return c;
}

function pause(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  c.fillRect(3, 2, 2, 8, PAL.uiText);
  c.fillRect(7, 2, 2, 8, PAL.uiText);
  return c;
}

function coin(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  c.fillEllipse(6, 6, 5, 5, PAL.lionGold);
  c.fillEllipse(6, 6, 3, 3, PAL.impala);
  c.line(6, 4, 6, 8, PAL.lionGold);
  c.outline(PAL.outline);
  return c;
}

function hammer(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  c.line(3, 10, 8, 5, PAL.wood);
  c.line(4, 10, 9, 5, PAL.wood);
  c.fillRect(6, 1, 5, 4, PAL.rock);
  c.outline(PAL.outline);
  return c;
}

function staffIcon(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  c.fillEllipse(6, 3.5, 2.5, 2.5, PAL.skin);
  c.fillRect(3, 6, 6, 5, PAL.red);
  c.outline(PAL.outline);
  return c;
}

function leaf(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  c.fillEllipse(6.5, 5.5, 4, 5, PAL.grassLight);
  c.line(3, 10, 8, 3, PAL.tree);
  c.outline(PAL.outline);
  return c;
}

function heart(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  c.fillEllipse(4, 4.5, 2.5, 2.5, PAL.red);
  c.fillEllipse(8, 4.5, 2.5, 2.5, PAL.red);
  for (let y = 5; y <= 10; y++) c.fillRect(1 + (y - 5), y, 10 - (y - 5) * 2, 1, PAL.red);
  c.outline(PAL.outline);
  return c;
}

function star(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 5 : 2.2;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([6 + r * Math.cos(a), 6 + r * Math.sin(a)]);
  }
  // Fill by scanning: a pixel is inside if it's inside the polygon.
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i] ?? [0, 0];
        const [xj, yj] = pts[j] ?? [0, 0];
        if (
          yi > y + 0.5 !== yj > y + 0.5 &&
          x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi
        )
          inside = !inside;
      }
      if (inside) c.set(x, y, PAL.lionGold);
    }
  }
  c.outline(PAL.outline);
  return c;
}

/** Alert badges: shape + symbol, so severity reads without colour. */
function badge(kind: 'info' | 'warning' | 'critical'): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  if (kind === 'warning') {
    for (let y = 1; y <= 10; y++) {
      const half = Math.floor(y / 2);
      c.fillRect(6 - half, y, half * 2 + 1, 1, PAL.lionGold);
    }
    c.line(6, 4, 6, 7, PAL.outline);
    c.set(6, 9, PAL.outline);
  } else {
    c.fillEllipse(6, 6, 5, 5, kind === 'info' ? PAL.blue : PAL.red);
    if (kind === 'info') {
      c.set(6, 3, PAL.white);
      c.line(6, 5, 6, 9, PAL.white);
    } else {
      c.line(4, 4, 8, 8, PAL.white);
      c.line(8, 4, 4, 8, PAL.white);
    }
  }
  c.outline(PAL.outline);
  return c;
}

/** Colourblind-mode meter status: up arrow, level bar, down arrow. */
function levelIcon(kind: 'good' | 'fair' | 'poor'): PixelCanvas {
  const c = new PixelCanvas(7, 7);
  if (kind === 'fair') c.fillRect(1, 3, 5, 1, PAL.uiText);
  for (let i = 0; i < 4; i++) {
    const y = kind === 'good' ? 1 + i : 5 - i;
    if (kind !== 'fair') c.fillRect(3 - i, y, i * 2 + 1, 1, PAL.uiText);
  }
  return c;
}

function paw(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  c.fillEllipse(6, 8, 3, 2.5, PAL.impala);
  for (const [x, y] of [
    [2.5, 4.5],
    [5, 2.5],
    [7.5, 2.5],
    [10, 4.5],
  ] as const)
    c.fillEllipse(x, y, 1.3, 1.3, PAL.impala);
  c.outline(PAL.outline);
  return c;
}

function book(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  c.fillRect(2, 2, 8, 9, PAL.roof);
  c.fillRect(3, 3, 6, 7, PAL.sand);
  c.line(4, 5, 7, 5, PAL.dirt);
  c.line(4, 7, 7, 7, PAL.dirt);
  c.outline(PAL.outline);
  return c;
}

function gear(): PixelCanvas {
  const c = new PixelCanvas(SIZE, SIZE);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    c.fillRect(
      Math.round(6 + 4.5 * Math.cos(a)) - 1,
      Math.round(6 + 4.5 * Math.sin(a)) - 1,
      2,
      2,
      PAL.rock,
    );
  }
  c.fillEllipse(6, 6, 3.6, 3.6, PAL.rock);
  c.fillEllipse(6, 6, 1.4, 1.4, PAL.uiPanel);
  c.outline(PAL.outline);
  return c;
}

/** Icon key → image. Keys must match src/config/assets.json. */
export function drawIcons(): Record<string, PixelCanvas> {
  return {
    'icon-dry': sun(),
    'icon-wet': raindrop(),
    'icon-pause': pause(),
    'icon-coin': coin(),
    'icon-build': hammer(),
    'icon-staff': staffIcon(),
    'icon-ecosystem': leaf(),
    'icon-trust': heart(),
    'icon-reputation': star(),
    'icon-alert-info': badge('info'),
    'icon-alert-warning': badge('warning'),
    'icon-alert-critical': badge('critical'),
    'icon-level-good': levelIcon('good'),
    'icon-level-fair': levelIcon('fair'),
    'icon-level-poor': levelIcon('poor'),
    'icon-species': paw(),
    'icon-journal': book(),
    'icon-settings': gear(),
  };
}
