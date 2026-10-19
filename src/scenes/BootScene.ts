import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_TITLE, GAME_WIDTH } from '../config/game';

/** Phase 0 boot: proves the pipeline renders. Later it will hand off to PreloadScene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_TITLE, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#e8d9a8',
      })
      .setOrigin(0.5);
  }
}
