import Phaser from 'phaser';

/** Minimal first scene; hands straight off to PreloadScene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
