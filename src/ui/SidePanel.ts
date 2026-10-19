import type Phaser from 'phaser';
import type { PanelLine } from './animalInfo';
import { Button } from './Button';
import { crispText } from './crispText';
import { WARN_COLOR } from './InfoPanel';
import { TEXT_SIZE, UI } from './theme';

export interface RowAction {
  label: string;
  enabled: boolean;
  onClick: () => void;
}

export interface PanelRow {
  lines: PanelLine[];
  actions: RowAction[];
}

export interface SideContent {
  title: string;
  /** Optional heading lines above the rows (e.g. totals). */
  intro?: PanelLine[];
  rows: PanelRow[];
}

const WIDTH = 236;
const PAD = 6;
const ROW_GAP = 5;
const ACTION_W = 52;
const ACTION_H = 13;

/**
 * Right-hand list panel for the Build, Staff, Species, Journal and Settings menus. Rebuilt
 * only when its content changes (compared by text), so live data stays cheap to show every
 * frame. Taller than the screen allows? It scrolls with the mouse wheel.
 */
export class SidePanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly inner: Phaser.GameObjects.Container;
  private readonly maskShape: Phaser.GameObjects.Graphics;
  private parts: Phaser.GameObjects.GameObject[] = [];
  private signature = '';
  private contentHeight = 0;
  private maxHeight = Number.MAX_SAFE_INTEGER;
  private scroll = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.bg = scene.add
      .rectangle(0, 0, WIDTH, 10, UI.panel, UI.panelAlpha)
      .setOrigin(0)
      .setStrokeStyle(1, UI.border)
      .setInteractive(); // swallow clicks
    this.inner = scene.add.container(0, 0);
    // Clips rows to the panel when it scrolls (not on the display list itself).
    this.maskShape = scene.make.graphics({}, false);
    this.inner.setMask(this.maskShape.createGeometryMask());
    this.root = scene.add.container(0, 0, [this.bg, this.inner]).setVisible(false);
  }

  /** Scroll by a wheel delta; returns true if the panel used it. */
  scrollBy(delta: number): boolean {
    const max = Math.max(0, this.contentHeight - this.maxHeight);
    if (max === 0) return false;
    this.scroll = Math.min(max, Math.max(0, this.scroll + delta * 0.5));
    this.applyScroll();
    return true;
  }

  get visible(): boolean {
    return this.root.visible;
  }

  hide(): void {
    this.root.setVisible(false);
    this.signature = '';
    this.scroll = 0;
  }

  contains(x: number, y: number): boolean {
    if (!this.root.visible) return false;
    const { x: left, y: top } = this.root;
    return x >= left && y >= top && x <= left + this.bg.width && y <= top + this.bg.height;
  }

  /** Show `content` at the right edge, from `top`, at most `maxHeight` tall (then it scrolls). */
  show(content: SideContent, top: number, maxHeight: number): void {
    const wasHidden = !this.root.visible;
    this.root.setVisible(true).setPosition(this.scene.scale.width - WIDTH - PAD, top);
    if (wasHidden || maxHeight !== this.maxHeight) {
      this.maxHeight = maxHeight;
      this.signature = ''; // re-layout for the new size
    }
    const signature = JSON.stringify([
      content.title,
      content.intro,
      content.rows.map((r) => [r.lines, r.actions.map((a) => [a.label, a.enabled])]),
    ]);
    if (signature !== this.signature) {
      this.signature = signature;
      this.rebuild(content);
    }
    this.applyScroll(); // keeps the clip mask on the panel if the window resized
  }

  private rebuild(content: SideContent): void {
    for (const p of this.parts) p.destroy();
    this.parts = [];
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this.parts.push(obj);
      this.inner.add(obj);
      return obj;
    };
    const textWidth = WIDTH - PAD * 2;

    let y = PAD;
    const title = add(
      crispText(this.scene, PAD, y, content.title, {
        fontSize: TEXT_SIZE.label,
        fontStyle: 'bold',
      }),
    );
    y += title.height + 2;
    for (const line of content.intro ?? []) {
      const t = add(
        crispText(this.scene, PAD, y, line.text, {
          fontSize: TEXT_SIZE.small,
          color: line.warn ? WARN_COLOR : UI.textDim,
          wordWrap: { width: textWidth },
        }),
      );
      y += t.height;
    }
    for (const row of content.rows) {
      y += ROW_GAP;
      add(this.scene.add.rectangle(PAD, y - 2, textWidth, 1, UI.border).setOrigin(0));
      const linesWidth = row.actions.length ? textWidth - ACTION_W - 4 : textWidth;
      const rowTop = y;
      row.lines.forEach((line, i) => {
        const t = add(
          crispText(this.scene, PAD, y, line.text, {
            fontSize: i === 0 ? TEXT_SIZE.body : TEXT_SIZE.small,
            color: line.warn ? WARN_COLOR : i === 0 ? UI.text : UI.textDim,
            wordWrap: { width: linesWidth },
          }),
        );
        y += t.height;
      });
      row.actions.forEach((action, i) => {
        const button = new Button(this.scene, WIDTH - PAD - ACTION_W, rowTop + i * (ACTION_H + 2), {
          width: ACTION_W,
          height: ACTION_H,
          label: action.label,
          onClick: action.onClick,
        }).setEnabled(action.enabled);
        add(button);
        y = Math.max(y, rowTop + (i + 1) * (ACTION_H + 2));
      });
    }
    this.contentHeight = y + PAD;
    this.bg.setSize(WIDTH, Math.min(this.contentHeight, this.maxHeight));
    this.scroll = Math.min(this.scroll, Math.max(0, this.contentHeight - this.maxHeight));
    this.applyScroll();
  }

  private applyScroll(): void {
    this.inner.setY(-this.scroll);
    const { x, y } = this.root;
    this.maskShape.clear().fillStyle(0xffffff).fillRect(x, y, WIDTH, this.bg.height);
    // Masked-out buttons would still catch clicks, so hide the ones outside the window.
    for (const part of this.parts) {
      if (!(part instanceof Button)) continue;
      const top = part.y - this.scroll;
      part.setVisible(top >= 0 && top + 13 <= this.bg.height);
    }
  }
}
