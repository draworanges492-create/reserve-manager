import '@fontsource/alegreya/latin-400.css';
import '@fontsource/alegreya/latin-700.css';
import Phaser from 'phaser';
import { computeViewport } from './config/scaling';
import { BootScene } from './scenes/BootScene';
import { DialogueScene } from './scenes/DialogueScene';
import { GameScene } from './scenes/GameScene';
import { PreloadScene } from './scenes/PreloadScene';
import { UIScene } from './scenes/UIScene';
import { UI_FONT } from './ui/crispText';

// Phaser draws text to canvas, which silently falls back to another font if ours isn't
// loaded yet, so wait for both weights before starting.
await Promise.all([
  document.fonts.load(`10px ${UI_FONT}`),
  document.fonts.load(`bold 10px ${UI_FONT}`),
]).catch(() => undefined);

const initial = computeViewport(window.innerWidth, window.innerHeight);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: initial.width,
  height: initial.height,
  backgroundColor: '#1d2b1f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    // NONE + manual zoom/resize: Phaser's FIT mode scales fractionally, which blurs pixel art.
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: initial.zoom,
  },
  input: { activePointers: 2 }, // two fingers for pinch zoom
  // Later scenes render on top: world, then HUD, then dialogue.
  scene: [BootScene, PreloadScene, GameScene, UIScene, DialogueScene],
});

window.addEventListener('resize', () => {
  const { zoom, width, height } = computeViewport(window.innerWidth, window.innerHeight);
  // Resize first, then zoom: setZoom re-centres the canvas, and must see the new size.
  // (The other order left a stale margin that pushed part of the game off-screen.)
  game.scale.resize(width, height);
  game.scale.setZoom(zoom);
  game.scale.refresh();
});

// Dev-only handle for debugging in the browser console; removed from production builds.
if (import.meta.env.DEV) Object.assign(window, { __game: game });
