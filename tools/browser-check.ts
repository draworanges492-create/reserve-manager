// Cross-browser smoke test (Phase 14e, D145): builds nothing itself — run `npm run build`
// first. Serves dist/, opens it in Chromium, Firefox and WebKit (Safari's engine) at three
// window sizes, starts a game by keyboard, and saves screenshots plus a report.
//   npm run browser-check            (screenshots go to ./browser-check/)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type BrowserType, chromium, firefox, webkit } from 'playwright';

const PORT = 5199;
const URL = `http://localhost:${PORT}/`;
const OUT = join(process.cwd(), 'browser-check');
const SIZES = [
  { name: '1280x720', width: 1280, height: 720, dpr: 1 },
  { name: '1920x1080', width: 1920, height: 1080, dpr: 1 },
  { name: '1440x900-retina', width: 1440, height: 900, dpr: 2 },
];
const BROWSERS: [string, BrowserType][] = [
  ['chromium', chromium],
  ['firefox', firefox],
  ['webkit', webkit],
];

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 2500));
mkdirSync(OUT, { recursive: true });

const rows: string[] = [];
let failed = false;
try {
  for (const [name, type] of BROWSERS) {
    const browser = await type.launch();
    for (const size of SIZES) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: size.dpr,
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      const shot = (step: string) =>
        page.screenshot({ path: join(OUT, `${name}-${size.name}-${step}.png`) });
      const t0 = Date.now();
      let loadMs = -1;
      let saved = false;
      try {
        await page.goto(URL);
        await page.waitForFunction(() => document.documentElement.dataset.screen === 'menu', null, {
          timeout: 20_000,
        });
        loadMs = Date.now() - t0;
        await page.waitForTimeout(500);
        await shot('1-menu');
        // New game by keyboard: Tab to "New game", Enter, type a name, Enter.
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        await page.waitForSelector('input', { timeout: 5000 });
        await page.keyboard.type('Tester');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.documentElement.dataset.screen === 'game', null, {
          timeout: 15_000,
        });
        await page.waitForTimeout(1500);
        await shot('2-dialogue');
        // Talk through the opening: Space moves on, 1 picks the first answer.
        let seenOpen = false;
        for (let i = 0; i < 200; i++) {
          const open = await page.evaluate(() => document.documentElement.dataset.dialogue);
          seenOpen ||= open === 'open';
          if (seenOpen && open === 'closed') break;
          await page.keyboard.press(i % 2 ? 'Digit1' : 'Space');
          await page.waitForTimeout(150);
        }
        await shot('3-talk');
        await page.waitForTimeout(1000); // let the conversation finish closing
        await page.keyboard.press('KeyJ');
        await page.waitForTimeout(600);
        await shot('4-journal');
        saved = await page.evaluate(() => !!localStorage.getItem('reserve-manager.save.auto'));
      } catch (e) {
        errors.push(`check stopped: ${(e as Error).message.split('\n')[0]}`);
        await shot('x-failure').catch(() => undefined);
      }
      const ok = errors.length === 0 && saved && loadMs >= 0;
      if (!ok) failed = true;
      rows.push(
        `| ${name} | ${size.name} | ${loadMs} ms | ${saved ? 'yes' : 'no'} | ${errors.length ? errors.join('; ').slice(0, 160) : 'none'} | ${ok ? 'OK' : 'FAIL'} |`,
      );
      await context.close();
    }
    await browser.close();
  }
} finally {
  server.kill();
}
const report = [
  '| Browser | Window | Title screen after | Autosave works | Errors | Result |',
  '| ------- | ------ | ------------------ | -------------- | ------ | ------ |',
  ...rows,
].join('\n');
writeFileSync(join(OUT, 'report.md'), `${report}\n`);
console.log(report);
process.exit(failed ? 1 : 0);
