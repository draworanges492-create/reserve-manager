import Phaser from 'phaser';
import { ASSETS } from '../config/assets';
import { GAME_TITLE } from '../config/game';
import { createGameState } from '../core/GameState';
import type { TiledMap } from '../core/TiledFormat';
import { readWorldLayout } from '../core/WorldLayout';
import { GameSession } from '../core/GameSession';
import { crispText } from '../ui/crispText';
import { TEXT_SIZE } from '../ui/theme';
import { setSession } from './session';

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
    // New game for now; MenuScene (Phase 8) will offer Continue / load a slot instead.
    // Wall-clock seeding is fine here: only the sim must be deterministic, given its seed.
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const tmj = (this.cache.tilemap.get('reserve') as { data: TiledMap }).data;
    const session = new GameSession(createGameState({ seed, world: readWorldLayout(tmj) }));
    setSession(this, session);
    // Dev-only handle for debugging in the browser console; removed from production builds.
    if (import.meta.env.DEV) Object.assign(window, { __session: session });
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
