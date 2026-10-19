import Phaser from 'phaser';
import { START_CHAPTER } from '../config/game';
import { eventBus } from '../core/EventBus';
import { crispText } from '../ui/crispText';
import { t } from '../ui/strings';
import { zoneDef } from './map/mapObjects';

const MARGIN = 6;

/** HUD overlay, running in parallel with GameScene. Phase 1: zone hover label + controls hint. */
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create(): void {
    const zoneLabel = crispText(this, 0, MARGIN, '', {
      fontSize: '10px',
      backgroundColor: '#241c16dd',
      padding: { x: 5, y: 3 },
    })
      .setOrigin(0.5, 0)
      .setVisible(false);
    const hint = crispText(this, MARGIN, 0, t('camera.hint'), { color: '#e8d9a8aa' }).setOrigin(
      0,
      1,
    );

    const layout = (): void => {
      zoneLabel.setX(Math.round(this.scale.width / 2));
      hint.setY(this.scale.height - MARGIN);
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);

    const off = eventBus.on('zoneHover', ({ zoneId }) => {
      const def = zoneId ? zoneDef(zoneId) : undefined;
      if (!def) {
        zoneLabel.setVisible(false);
        return;
      }
      const locked = def.unlockChapter > START_CHAPTER;
      zoneLabel
        .setText(
          locked ? t('zone.locked', { name: def.name, chapter: def.unlockChapter }) : def.name,
        )
        .setVisible(true);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
    });
  }
}
