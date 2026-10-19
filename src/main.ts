import Phaser from 'phaser';
import { computeViewport } from './config/scaling';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { PreloadScene } from './scenes/PreloadScene';
import { UIScene } from './scenes/UIScene';

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
  // UIScene last so it renders above the world.
  scene: [BootScene, PreloadScene, GameScene, UIScene],
});

window.addEventListener('resize', () => {
  const { zoom, width, height } = computeViewport(window.innerWidth, window.innerHeight);
  game.scale.setZoom(zoom);
  game.scale.resize(width, height);
});
