import Phaser from 'phaser';
import { BALANCE } from '../../config/balance';
import { eventBus } from '../../core/EventBus';
import type { GameSession } from '../../core/GameSession';
import { visibleClues } from '../../story/storyCommands';
import { DEPTH } from '../depth';

const BOB_PX = 3;

/** Clue markers for the Chapter 2 investigation (spec §9.2): bobbing, clickable. */
export class ClueLayer {
  private readonly markers = new Map<string, Phaser.GameObjects.Image>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: GameSession,
    private readonly tileSize: number,
  ) {}

  update(): void {
    const visible = visibleClues(this.session.state);
    const ids = new Set(visible.map((c) => c.id));
    for (const [id, marker] of this.markers) {
      if (!ids.has(id)) {
        marker.destroy();
        this.markers.delete(id);
        eventBus.emit('clueHover', { clueId: null });
      }
    }
    for (const clue of visible) {
      if (this.markers.has(clue.id)) continue;
      const x = clue.at.x * this.tileSize;
      const y = clue.at.y * this.tileSize;
      const marker = this.scene.add
        .image(x, y, 'clue-marker')
        .setDepth(DEPTH.effects)
        .setInteractive({ useHandCursor: true });
      marker.setData('blocksDrag', true);
      marker.on(Phaser.Input.Events.POINTER_OVER, () =>
        eventBus.emit('clueHover', { clueId: clue.id }),
      );
      marker.on(Phaser.Input.Events.POINTER_OUT, () =>
        eventBus.emit('clueHover', { clueId: null }),
      );
      marker.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
        if (p.getDistance() <= BALANCE.render.animals.clickMaxMovePx) {
          this.session.dispatch({ type: 'examineClue', clueId: clue.id });
        }
      });
      this.scene.tweens.add({
        targets: marker,
        y: y - BOB_PX,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.markers.set(clue.id, marker);
    }
  }
}
