import '@fontsource/inter/latin-400.css';
import { installFocus } from './ui/focus';
import { installCrashScreen } from './ui/crashScreen';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import Phaser from 'phaser';
import { audio } from './audio/AudioManager';
import { computeRender } from './config/scaling';
import { BootScene } from './scenes/BootScene';
import { DialogueScene } from './scenes/DialogueScene';
import { EpilogueScene } from './scenes/EpilogueScene';
import { JournalScene } from './scenes/JournalScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { UIScene } from './scenes/UIScene';
import { UI_FONT } from './ui/crispText';
import { setViewScale } from './ui/view';

// Phaser draws text to canvas, which silently falls back to another font if ours isn't
// loaded yet, so wait for both weights before starting.
await Promise.all([
  document.fonts.load(`10px ${UI_FONT}`),
  document.fonts.load(`bold 10px ${UI_FONT}`),
]).catch(() => undefined);

const render = (): ReturnType<typeof computeRender> =>
  computeRender(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
const initial = render();
setViewScale(initial.scale);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // The canvas has one pixel per device pixel; cameras zoom by viewScale() (DECISIONS D102).
  width: initial.canvasWidth,
  height: initial.canvasHeight,
  backgroundColor: '#1d2b1f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    // NONE + manual resize: Phaser's FIT mode scales fractionally, which blurs pixel art.
    // CSS size = canvas size / devicePixelRatio = the window.
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: 1 / (window.devicePixelRatio || 1),
  },
  input: { activePointers: 2 }, // two fingers for pinch zoom
  // Later scenes render on top: world, then HUD, then dialogue.
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    GameScene,
    UIScene,
    DialogueScene,
    JournalScene,
    EpilogueScene,
  ],
});

window.addEventListener('resize', () => {
  const next = render();
  setViewScale(next.scale); // before resize(): its RESIZE listeners read the new scale
  // Resize first, then zoom: setZoom re-centres the canvas, and must see the new size.
  // (The other order left a stale margin that pushed part of the game off-screen.)
  game.scale.resize(next.canvasWidth, next.canvasHeight);
  game.scale.setZoom(1 / (window.devicePixelRatio || 1));
  game.scale.refresh();
});

// If something breaks, freeze the game (so nothing broken is autosaved) and say so (D142).
installCrashScreen(() => game.loop.sleep());

// Keyboard: Tab between controls, Enter to press (D139).
installFocus(game);

// Browsers only allow sound after the player does something (spec §11: muted until the
// first interaction), so the audio engine starts on the first click, tap or key press.
for (const type of ['pointerdown', 'keydown'] as const) {
  window.addEventListener(type, () => audio.unlock(), { once: true, capture: true });
}

// Dev-only: console handle and the backtick debug overlay (spec §13). Both are removed from
// production builds, because Vite drops this whole branch there.
if (import.meta.env.DEV) {
  Object.assign(window, { __game: game });
  const { DebugScene } = await import('./debug/DebugScene');
  game.scene.add('DebugScene', DebugScene, true);
}
