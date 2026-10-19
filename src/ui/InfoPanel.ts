import Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import { t } from '../core/text';
import { animalPanelText } from './animalInfo';
import { Button } from './Button';
import { crispText } from './crispText';
import { TEXT_SIZE, UI } from './theme';

const WIDTH = 190;
const PAD = 6;
const PORTRAIT = 48;
const CLOSE_SIZE = 14;
const WARN_COLOR = '#ff9b7a';

/**
 * Panel for a selected herd (spec §7.4 context panel, first piece): species, zone,
 * population, diet, status and water. Updates live while open.
 */
export class InfoPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Text;
  private readonly close: Button;
  private shown: { zoneId: string; speciesId: string } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    onClose: () => void,
  ) {
    this.bg = scene.add
      .rectangle(0, 0, WIDTH, 10, UI.panel, UI.panelAlpha)
      .setOrigin(0)
      .setStrokeStyle(1, UI.border)
      .setInteractive(); // swallow clicks so they don't reach the map
    this.portrait = scene.add.image(PAD + PORTRAIT / 2, PAD + PORTRAIT / 2, '__DEFAULT');
    const textX = PAD * 2 + PORTRAIT;
    this.title = crispText(scene, textX, PAD, '', { fontSize: TEXT_SIZE.label, fontStyle: 'bold' });
    this.subtitle = crispText(scene, textX, PAD + 14, '', {
      fontSize: TEXT_SIZE.small,
      color: UI.textDim,
    });
    this.body = crispText(scene, textX, PAD + 30, '', { fontSize: TEXT_SIZE.body, lineSpacing: 1 });
    this.status = crispText(scene, PAD, 0, '', {
      fontSize: TEXT_SIZE.body,
      wordWrap: { width: WIDTH - PAD * 2 },
    });
    this.close = new Button(scene, WIDTH - CLOSE_SIZE - 3, 3, {
      width: CLOSE_SIZE,
      height: CLOSE_SIZE,
      label: t('panel.close'),
      onClick: onClose,
    });
    this.root = scene.add
      .container(0, 0, [
        this.bg,
        this.portrait,
        this.title,
        this.subtitle,
        this.body,
        this.status,
        this.close,
      ])
      .setVisible(false);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  show(zoneId: string, speciesId: string, state: GameState): void {
    this.shown = { zoneId, speciesId };
    this.root.setVisible(true);
    this.update(state);
  }

  hide(): void {
    this.shown = null;
    this.root.setVisible(false);
  }

  /** True if a screen point is on the panel (for the HUD hit check). */
  contains(x: number, y: number): boolean {
    if (!this.root.visible) return false;
    return (
      x >= this.root.x &&
      y >= this.root.y &&
      x <= this.root.x + this.bg.width &&
      y <= this.root.y + this.bg.height
    );
  }

  /** Refresh text and keep the panel anchored above `bottom` on the left edge. */
  update(state: GameState, bottom = this.scene.scale.height): void {
    if (!this.shown) return;
    const text = animalPanelText(state, this.shown.zoneId, this.shown.speciesId);
    if (!text) return this.hide();
    const [population = '', diet = '', statusLine = '', water = ''] = text.lines;
    this.title.setText(text.title);
    this.subtitle.setText(text.subtitle);
    this.body.setText([population, diet].join('\n'));
    this.status
      .setText([statusLine, water].join('\n'))
      .setColor(text.critical ? WARN_COLOR : UI.text);

    const spriteKey = this.shown.speciesId;
    if (this.portrait.texture.key !== spriteKey && this.scene.textures.exists(spriteKey)) {
      this.portrait.setTexture(spriteKey, 0);
      const frame = this.scene.textures.getFrame(spriteKey, 0);
      // Whole-number scale keeps the pixel art crisp.
      this.portrait.setScale(
        Math.max(1, Math.floor(PORTRAIT / Math.max(frame.width, frame.height))),
      );
    }
    const statusY = Math.max(PAD * 2 + PORTRAIT, this.body.y + this.body.height + PAD);
    this.status.setY(statusY);
    const height = statusY + this.status.height + PAD;
    this.bg.setSize(WIDTH, height);
    this.root.setPosition(PAD, Math.round(bottom - height - PAD));
  }
}
