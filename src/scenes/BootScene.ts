import Phaser from 'phaser';
import { GAME_TITLE } from '../config/game';

/** Phase 0 boot: proves the pipeline renders. Later it will hand off to PreloadScene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const title = this.add
      .text(0, 0, GAME_TITLE, { fontFamily: 'monospace', fontSize: '24px', color: '#e8d9a8' })
      .setOrigin(0.5);

    // The canvas size changes with the window, so re-center on every resize.
    const center = (): void => {
      title.setPosition(Math.round(this.scale.width / 2), Math.round(this.scale.height / 2));
    };
    center();
    this.scale.on(Phaser.Scale.Events.RESIZE, center);
  }
}
