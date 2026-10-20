import type Phaser from 'phaser';
import type { GameState } from '../core/GameState';
import { t } from '../core/text';
import type { PanelContent } from './animalInfo';
import { Button } from './Button';
import { crispText } from './crispText';
import { TEXT_SIZE, UI } from './theme';
import { viewHeight } from './view';

const WIDTH = 220;
const PAD = 6;
const PORTRAIT = 40;
const CLOSE_SIZE = 14;
const LINE_GAP = 2;
const MAX_LINES = 10;
const ACTION_H = 14;
export const WARN_COLOR = '#ff9b7a';

/** Supplies fresh content each frame (null closes the panel). */
export type PanelSource = (state: GameState) => PanelContent | null;

/**
 * Bottom-left context panel (spec §7.4) for whatever is selected — a herd or a zone.
 * Content is rebuilt every frame so the numbers stay live.
 */
export class InfoPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly lines: Phaser.GameObjects.Text[] = [];
  private source: PanelSource | null = null;
  private actions: Button[] = [];
  private actionSignature = '';

  constructor(
    private readonly scene: Phaser.Scene,
    onClose: () => void,
  ) {
    this.bg = scene.add
      .rectangle(0, 0, WIDTH, 10, UI.panel, UI.panelAlpha)
      .setOrigin(0)
      .setStrokeStyle(1, UI.border)
      .setInteractive(); // swallow clicks so they don't reach the map
    this.portrait = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.title = crispText(scene, PAD, PAD, '', { fontSize: TEXT_SIZE.label, fontStyle: 'bold' });
    this.subtitle = crispText(scene, PAD, PAD + 14, '', {
      fontSize: TEXT_SIZE.small,
      color: UI.textDim,
    });
    for (let i = 0; i < MAX_LINES; i++) {
      this.lines.push(
        crispText(scene, PAD, 0, '', {
          fontSize: TEXT_SIZE.body,
          wordWrap: { width: WIDTH - PAD * 2 },
        }),
      );
    }
    const close = new Button(scene, WIDTH - CLOSE_SIZE - 3, 3, {
      width: CLOSE_SIZE,
      height: CLOSE_SIZE,
      label: t('panel.close'),
      onClick: onClose,
    });
    this.root = scene.add
      .container(0, 0, [this.bg, this.portrait, this.title, this.subtitle, ...this.lines, close])
      .setVisible(false);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  show(source: PanelSource, state: GameState): void {
    this.source = source;
    this.root.setVisible(true);
    this.update(state);
  }

  hide(): void {
    this.source = null;
    this.root.setVisible(false);
  }

  /** True if a screen point is on the panel (for the HUD hit check). */
  contains(x: number, y: number): boolean {
    if (!this.root.visible) return false;
    const { x: left, y: top } = this.root;
    return x >= left && y >= top && x <= left + this.bg.width && y <= top + this.bg.height;
  }

  /** Refresh and keep the panel anchored above `bottom` on the left edge. */
  update(state: GameState, bottom = viewHeight(this.scene)): void {
    if (!this.source) return;
    const content = this.source(state);
    if (!content) return this.hide();

    const textX = this.layoutPortrait(content.portrait);
    this.title.setText(content.title).setX(textX);
    this.subtitle
      .setText(content.subtitle)
      .setX(textX)
      .setColor(content.subtitleWarn ? WARN_COLOR : UI.textDim);

    let y = Math.max(
      this.subtitle.y + this.subtitle.height + PAD,
      content.portrait ? PAD * 2 + PORTRAIT : 0,
    );
    this.lines.forEach((label, i) => {
      const line = content.lines[i];
      label.setVisible(!!line);
      if (!line) return;
      label
        .setText(line.text)
        .setColor(line.warn ? WARN_COLOR : UI.text)
        .setY(y);
      y += label.height + LINE_GAP;
    });
    y = this.layoutActions(content.actions ?? [], y + PAD);
    const height = y + PAD - LINE_GAP;
    this.bg.setSize(WIDTH, height);
    this.root.setPosition(PAD, Math.round(bottom - height - PAD));
  }

  /** (Re)creates the bottom buttons when their labels change; returns the y below them. */
  private layoutActions(
    actions: NonNullable<ReturnType<PanelSource>>['actions'] & object,
    y: number,
  ): number {
    const signature = actions.map((a) => a.label).join('|');
    if (signature !== this.actionSignature) {
      this.actionSignature = signature;
      for (const b of this.actions) b.destroy();
      this.actions = actions.map((a, i) => {
        // Two buttons per row; more wrap onto further rows.
        const button = new Button(this.scene, PAD + (i % 2) * 106, 0, {
          width: 102,
          height: ACTION_H,
          label: a.label,
          onClick: () => a.onClick(),
        });
        this.root.add(button);
        return button;
      });
    }
    if (!this.actions.length) return y - PAD;
    this.actions.forEach((b, i) => b.setY(y + Math.floor(i / 2) * (ACTION_H + LINE_GAP)));
    return y + Math.ceil(this.actions.length / 2) * (ACTION_H + LINE_GAP);
  }

  /** Shows a crisp (whole-number scaled) portrait; returns where text should start. */
  private layoutPortrait(key: string | undefined): number {
    if (!key || !this.scene.textures.exists(key)) {
      this.portrait.setVisible(false);
      return PAD;
    }
    if (this.portrait.texture.key !== key) {
      this.portrait.setTexture(key, 0);
      const frame = this.scene.textures.getFrame(key, 0);
      // Exact fit: portraits are drawn at 2× detail, so this is a whole number of screen
      // pixels per texel at every display scale.
      this.portrait.setScale(PORTRAIT / Math.max(frame.width, frame.height));
    }
    this.portrait.setPosition(PAD + PORTRAIT / 2, PAD + PORTRAIT / 2).setVisible(true);
    return PAD * 2 + PORTRAIT;
  }
}
