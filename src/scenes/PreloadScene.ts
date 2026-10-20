import Phaser from 'phaser';
import { ASSETS } from '../config/assets';
import { GAME_TITLE } from '../config/game';
import { crispText } from '../ui/crispText';
import { TEXT_SIZE } from '../ui/theme';

const BAR_WIDTH = 200;
const BAR_COLOR = 0xe8d9a8;

/** Loads everything listed in assets.json behind a title and progress bar. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    crispText(this, cx, cy - 12, GAME_TITLE, {
      fontSize: TEXT_SIZE.title,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.rectangle(cx, cy + 12, BAR_WIDTH + 2, 6).setStrokeStyle(1, BAR_COLOR);
    const bar = this.add.rectangle(cx - BAR_WIDTH / 2, cy + 12, 0, 4, BAR_COLOR).setOrigin(0, 0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => (bar.width = BAR_WIDTH * p));

    for (const [key, path] of Object.entries(ASSETS.images)) this.load.image(key, path);
    for (const [key, s] of Object.entries(ASSETS.spritesheets)) {
      this.load.spritesheet(key, s.path, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
    }
    for (const [key, path] of Object.entries(ASSETS.tilemaps))
      this.load.tilemapTiledJSON(key, path);
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
