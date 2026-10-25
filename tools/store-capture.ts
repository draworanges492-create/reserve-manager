// Store page captures (Phase 14f): screenshots, the itch.io cover and a short GIF, taken
// from the real game. Uses the dev server (for its console handles) and a late-game save
// played by the automated player, so the reserve looks like a real mid-story game.
//   npm run store:capture        (writes docs/store/)
// See docs/store/CAPTURE.md for what each image shows and how to change them.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import gifenc from 'gifenc';
import { chromium, type Page } from 'playwright';
import { PNG } from 'pngjs';
import { createGameState } from '../src/core/GameState';
import { serialize } from '../src/core/Save';
import type { TiledMap } from '../src/core/TiledFormat';
import { readWorldLayout } from '../src/core/WorldLayout';
import { play, strategies } from './autoPlayer';

// gifenc ships CommonJS, so its functions hang off the default export.
const { GIFEncoder, applyPalette, quantize } = gifenc;

const PORT = 5195;
const URL = `http://localhost:${PORT}/`;
const OUT = join(process.cwd(), 'docs', 'store');
const TILE = 24;
/** Where the shots look (tiles). */
const SPOTS = {
  waterholeA: { x: 53.5, y: 47 },
  river: { x: 26, y: 50 },
  hq: { x: 52, y: 70 },
};

/** The dev build's console handle (D93); loosely typed, since this only drives captures. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DevWindow = { __game: any };

// A save from the middle of Chapter 5: ten species, buildings, visitors, a lived-in reserve.
function lateSave(): string {
  const map = join(import.meta.dirname, '..', 'public', 'assets', 'maps', 'reserve.tmj');
  const world = readWorldLayout(JSON.parse(readFileSync(map, 'utf8')) as TiledMap);
  const start = { ...createGameState({ seed: 7, world }), playerName: 'Amani' };
  const state = play(start, strategies.first, { maxDays: 92 });
  return serialize(
    { ...state, clock: { ...state.clock, dayProgress: 0.35 } },
    new Date().toISOString(),
  );
}

async function startPage(width: number, height: number, dpr: number, save: string | null) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  // No edge scrolling: the parked mouse would slide the camera away.
  await context.addInitScript(() =>
    localStorage.setItem('reserve-manager.settings.v1', JSON.stringify({ edgeScroll: false })),
  );
  if (save)
    await context.addInitScript((s) => localStorage.setItem('reserve-manager.save.auto', s), save);
  const page = await context.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => document.documentElement.dataset.screen === 'menu');
  await page.waitForTimeout(400);
  return { browser, page };
}

/** Into the game from the title screen: Continue for a save, otherwise a new game. */
async function enterGame(page: Page, newName?: string): Promise<void> {
  if (newName) {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForSelector('input');
    await page.keyboard.type(newName);
  }
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.documentElement.dataset.screen === 'game');
  await page.waitForTimeout(1200);
}

/** Tidy the screen: finish any conversation, clear alerts, frame the camera. */
async function frame(page: Page, spot: { x: number; y: number }, zoomIndex: number) {
  await page.evaluate(
    ({ x, y, zoomIndex }) => {
      const g = (window as unknown as DevWindow).__game;
      const session = g.registry.get('session');
      for (let i = 0; i < 300 && session.dialogueView; i++)
        session.advanceDialogue(session.dialogueView.choices[0]?.index);
      const ui = g.scene.getScene('UIScene');
      for (const a of [...ui.alerts.all]) ui.alerts.remove(a.key);
      const gs = g.scene.getScene('GameScene');
      const cc = gs.cameraController;
      const levels: number[] = cc.levels();
      cc.zoomStep = levels[Math.min(zoomIndex, levels.length - 1)];
      cc.applyZoom();
      gs.cameras.main.centerOn(x, y);
    },
    { x: spot.x * TILE, y: spot.y * TILE, zoomIndex },
  );
  await page.mouse.move(120, 140); // over the goal list: no tooltip, no zone label
  await page.waitForTimeout(1500);
  await clearAlerts(page);
}

async function clearAlerts(page: Page): Promise<void> {
  await page.evaluate(() => {
    const ui = (window as unknown as DevWindow).__game.scene.getScene('UIScene');
    for (const a of [...ui.alerts.all]) ui.alerts.remove(a.key);
  });
  await page.waitForTimeout(200);
}

/** The middle of the biggest gathering of animals on the map (world px → tiles). */
interface MapSprite {
  type: string;
  texture: { key: string };
  x: number;
  y: number;
}

async function busiestSpot(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate((tile) => {
    const gs = (window as unknown as DevWindow).__game.scene.getScene('GameScene');
    const animals = new Set([
      'impala',
      'zebra',
      'lion',
      'elephant',
      'hyena',
      'vulture',
      'giraffe',
      'wildebeest',
      'leopard',
      'rhino',
    ]);
    const pts: { x: number; y: number; big: boolean }[] = gs.children.list
      .filter((o: MapSprite) => o.type === 'Sprite' && animals.has(o.texture.key))
      .map((o: MapSprite) => ({
        x: o.x,
        y: o.y,
        big: ['elephant', 'giraffe', 'rhino'].includes(o.texture.key),
      }));
    let best = { x: 0, y: 0, score: -1 };
    for (const p of pts) {
      // Count neighbours within ~7 tiles; big animals count double (they make the shot).
      const near = pts.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) < tile * 7);
      const score = near.reduce((n, q) => n + (q.big ? 2 : 1), 0);
      if (score > best.score) {
        const cx = near.reduce((a, q) => a + q.x, 0) / near.length;
        const cy = near.reduce((a, q) => a + q.y, 0) / near.length;
        best = { x: cx / tile, y: cy / tile, score };
      }
    }
    return { x: best.x, y: best.y };
  }, TILE);
}

async function shot(page: Page, name: string): Promise<Buffer> {
  const file = join(OUT, name);
  const buffer = await page.screenshot({ path: file });
  console.log('wrote', file);
  return buffer;
}

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 3000));
mkdirSync(OUT, { recursive: true });

try {
  const save = lateSave();

  // 1. Title screen.
  {
    const { browser, page } = await startPage(1280, 720, 1.5, null);
    await shot(page, 'screenshot-1-title.png');
    // 2. The first conversation, at the dry, broken reserve.
    await enterGame(page, 'Amani');
    // Narrator line (finish, move on), then Tendai's first line (finish typing).
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(800);
    await page.mouse.move(2, 360);
    await shot(page, 'screenshot-2-arrival.png');
    await browser.close();
  }

  // 3–5. The reserve in Chapter 5.
  let coverShot: Buffer;
  {
    const { browser, page } = await startPage(1280, 720, 1.5, save);
    await enterGame(page);
    const busy = await busiestSpot(page);
    await frame(page, busy, 2);
    await shot(page, 'screenshot-3-herds.png');
    // The cover's picture: closer in, no HUD.
    await frame(page, busy, 3);
    await page.evaluate(() =>
      (window as unknown as DevWindow).__game.scene.getScene('UIScene').scene.setVisible(false),
    );
    await page.waitForTimeout(400);
    coverShot = await page.screenshot();
    await page.evaluate(() =>
      (window as unknown as DevWindow).__game.scene.getScene('UIScene').scene.setVisible(true),
    );
    await frame(page, SPOTS.waterholeA, 0);
    await shot(page, 'screenshot-4-birds-eye.png');
    await frame(page, SPOTS.hq, 2);
    await page.evaluate(() =>
      (window as unknown as DevWindow).__game.scene.getScene('JournalScene').openAt('notes'),
    );
    await page.waitForTimeout(600);
    await shot(page, 'screenshot-5-journal.png');
    await browser.close();
  }

  // Cover (630×500): the waterhole shot with the title over it.
  {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 630, height: 500 } });
    const bg = `data:image/png;base64,${coverShot.toString('base64')}`;
    const font = readFileSync(
      join('node_modules', '@fontsource', 'inter', 'files', 'inter-latin-700-normal.woff2'),
    ).toString('base64');
    await page.setContent(`<style>
      @font-face { font-family: Inter; src: url(data:font/woff2;base64,${font}); font-weight: 700; }
      body { margin: 0; width: 630px; height: 500px; overflow: hidden; font-family: Inter; }
      .bg { position: absolute; inset: 0; background: url(${bg}) center / cover; image-rendering: pixelated; }
      .shade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(18,13,9,0.82), rgba(18,13,9,0) 42%, rgba(18,13,9,0) 70%, rgba(18,13,9,0.75)); }
      h1 { position: absolute; top: 34px; width: 100%; margin: 0; text-align: center; color: #e8d9a8; font-size: 52px; letter-spacing: 0.5px; text-shadow: 0 2px 0 #120d09; }
      p { position: absolute; bottom: 26px; width: 100%; margin: 0; text-align: center; color: #e8d9a8; font-size: 20px; text-shadow: 0 1px 0 #120d09; }
    </style><div class="bg"></div><div class="shade"></div><h1>Reserve Manager</h1><p>Bring a forgotten wildlife reserve back to life</p>`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, 'cover-630x500.png') });
    console.log('wrote cover');
    await browser.close();
  }

  // GIF: 12 s of the reserve at the waterhole, HUD hidden, running at 2×.
  {
    const { browser, page } = await startPage(640, 360, 1, save);
    await enterGame(page);
    await frame(page, await busiestSpot(page), 2);
    await page.evaluate(() => {
      const g = (window as unknown as DevWindow).__game;
      g.scene.getScene('UIScene').scene.setVisible(false);
      g.registry.get('session').dispatch({ type: 'setSpeed', speed: 2 });
      g.registry.get('session').dispatch({ type: 'setPaused', paused: false });
    });
    const gif = GIFEncoder();
    const FRAMES = 80;
    const DELAY = 125;
    let palette: ReturnType<typeof quantize> | null = null;
    let previous: Uint8Array | null = null;
    for (let i = 0; i < FRAMES; i++) {
      const png = PNG.sync.read(await page.screenshot());
      const rgba = new Uint8Array(png.data);
      // One palette for the whole clip (255 colours + 1 kept for "unchanged").
      palette ??= quantize(rgba, 255);
      const index = applyPalette(rgba, palette);
      const clear = palette.length;
      // Only pixels that changed since the last frame are stored; the rest stay see-through.
      const frameIndex = previous ? index.map((v, p) => (v === previous?.[p] ? clear : v)) : index;
      gif.writeFrame(frameIndex, png.width, png.height, {
        palette: previous ? [...palette, [0, 0, 0]] : palette,
        delay: DELAY,
        ...(previous ? { transparent: true, transparentIndex: clear } : {}),
      });
      previous = index;
      await page.waitForTimeout(DELAY);
    }
    gif.finish();
    writeFileSync(join(OUT, 'reserve.gif'), gif.bytes());
    console.log('wrote gif');
    await browser.close();
  }
} finally {
  server.kill();
}
