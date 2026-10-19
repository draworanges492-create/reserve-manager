import Phaser from 'phaser';
import { DIALOGUE_CHARS_PER_SECOND } from '../config/game';
import { eventBus } from '../core/EventBus';
import { t } from '../core/text';
import type { DialogueView } from '../story/DialogueRunner';
import { Button } from '../ui/Button';
import { crispText } from '../ui/crispText';
import { TEXT_SIZE, UI } from '../ui/theme';
import { getSession } from './session';

const MAX_WIDTH = 600;
const MARGIN = 8;
const PAD = 8;
const PORTRAIT = 72;
const CHOICE_H = 16;
const EXPRESSION_FRAME: Record<string, number> = { neutral: 0, happy: 1, worried: 2, angry: 3 };

/**
 * The dialogue box (spec §8/§9): portrait + name + text, typewriter reveal, choices.
 * Sits above every other scene; while open it swallows map clicks and the clock is paused.
 */
export class DialogueScene extends Phaser.Scene {
  private blocker!: Phaser.GameObjects.Rectangle;
  private box!: Phaser.GameObjects.Rectangle;
  private portraitFrame!: Phaser.GameObjects.Rectangle;
  private portrait!: Phaser.GameObjects.Image;
  private name!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private choices: Button[] = [];
  /** Identity of the line on screen, to notice when it changes. */
  private lineKey = '';
  private fullText = '';
  private shown = 0;

  constructor() {
    super('DialogueScene');
  }

  create(): void {
    this.blocker = this.add.rectangle(0, 0, 1, 1, 0x000000, 0.25).setOrigin(0).setInteractive();
    this.blocker.on(Phaser.Input.Events.POINTER_DOWN, () => this.onClick());
    this.box = this.add
      .rectangle(0, 0, 1, 1, UI.panel, 0.96)
      .setOrigin(0)
      .setStrokeStyle(1, UI.border);
    this.box.setInteractive().on(Phaser.Input.Events.POINTER_DOWN, () => this.onClick());
    this.portraitFrame = this.add
      .rectangle(0, 0, PORTRAIT + 4, PORTRAIT + 4, UI.hover)
      .setOrigin(0)
      .setStrokeStyle(1, UI.border);
    this.portrait = this.add.image(0, 0, '__DEFAULT').setOrigin(0);
    this.name = crispText(this, 0, 0, '', {
      fontSize: TEXT_SIZE.label,
      fontStyle: 'bold',
      color: '#f0b46a',
    });
    this.body = crispText(this, 0, 0, '', { fontSize: TEXT_SIZE.label, lineSpacing: 3 });
    this.hint = crispText(this, 0, 0, '', {
      fontSize: TEXT_SIZE.small,
      color: UI.textDim,
    }).setOrigin(1, 1);

    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', () => this.onClick());
    kb?.on('keydown-ENTER', () => this.onClick());
    (['ONE', 'TWO', 'THREE', 'FOUR'] as const).forEach((key, i) =>
      kb?.on(`keydown-${key}`, () => this.choose(i)),
    );
    this.setOpen(false);
  }

  override update(_time: number, deltaMs: number): void {
    const view = getSession(this).dialogueView;
    if (!view) {
      if (this.blocker.visible) this.setOpen(false);
      return;
    }
    const key = `${view.speakerId}|${view.text}|${view.choices.map((c) => c.index).join(',')}`;
    if (key !== this.lineKey) this.showLine(view, key);
    if (this.shown < this.fullText.length) {
      this.shown = Math.min(
        this.fullText.length,
        this.shown + (DIALOGUE_CHARS_PER_SECOND * deltaMs) / 1000,
      );
      this.body.setText(this.fullText.slice(0, Math.floor(this.shown)));
      if (this.shown >= this.fullText.length) this.revealChoices(view);
    }
  }

  private setOpen(open: boolean): void {
    for (const o of [
      this.blocker,
      this.box,
      this.portraitFrame,
      this.portrait,
      this.name,
      this.body,
      this.hint,
    ]) {
      o.setVisible(open);
    }
    if (!open) {
      this.clearChoices();
      this.lineKey = '';
    }
  }

  private showLine(view: DialogueView, key: string): void {
    this.lineKey = key;
    this.setOpen(true);
    this.clearChoices();
    if (view.focus) eventBus.emit('focusRequested', view.focus);

    const w = this.scale.width;
    const h = this.scale.height;
    const boxW = Math.min(MAX_WIDTH, w - MARGIN * 2);
    const hasPortrait = !!view.portraitKey && this.textures.exists(view.portraitKey);
    const textX = PAD + (hasPortrait ? PORTRAIT + 4 + PAD : 0);
    const textW = boxW - textX - PAD;

    this.body.setWordWrapWidth(textW).setText(view.text);
    const choicesH = view.choices.length * (CHOICE_H + 3);
    const contentH = Math.max(
      hasPortrait ? PORTRAIT + 4 : 0,
      16 + this.body.height + (choicesH ? choicesH + 6 : 14),
    );
    const boxH = contentH + PAD * 2;
    const x = Math.round((w - boxW) / 2);
    const y = Math.round(h - boxH - MARGIN);

    this.blocker.setSize(w, h);
    this.box.setPosition(x, y).setSize(boxW, boxH);
    this.box.input?.hitArea.setSize(boxW, boxH);
    this.portraitFrame.setPosition(x + PAD, y + PAD).setVisible(hasPortrait);
    this.portrait.setVisible(hasPortrait);
    if (hasPortrait && view.portraitKey) {
      this.portrait
        .setTexture(view.portraitKey, EXPRESSION_FRAME[view.expression] ?? 0)
        .setPosition(x + PAD + 2, y + PAD + 2);
    }
    this.name.setText(view.speakerName).setPosition(x + textX, y + PAD);
    this.body.setPosition(x + textX, y + PAD + (view.speakerName ? 16 : 2));
    this.hint.setPosition(x + boxW - PAD, y + boxH - 3);
    this.hint.setText(
      view.choices.length
        ? t('dialogue.choose', { n: view.choices.length })
        : t('dialogue.continue'),
    );

    // Narration in italics, speech plain.
    this.body.setFontStyle(view.speakerId === 'narrator' ? 'italic' : '');
    this.fullText = view.text;
    this.shown = 0;
    this.body.setText('');
  }

  private revealChoices(view: DialogueView): void {
    if (this.choices.length || !view.choices.length) return;
    const textX = this.body.x;
    const textW = this.box.x + this.box.width - PAD - textX;
    let y = this.body.y + this.body.height + 6;
    this.choices = view.choices.map((c, i) => {
      const button = new Button(this, textX, y, {
        width: textW,
        height: CHOICE_H,
        label: `${i + 1}. ${c.text}`,
        onClick: () => this.choose(i),
      });
      y += CHOICE_H + 3;
      return button;
    });
  }

  private clearChoices(): void {
    for (const b of this.choices) b.destroy();
    this.choices = [];
  }

  /** First click finishes the typewriter; the next one moves on (if there are no choices). */
  private onClick(): void {
    const view = getSession(this).dialogueView;
    if (!view) return;
    if (this.shown < this.fullText.length) {
      this.shown = this.fullText.length;
      this.body.setText(this.fullText);
      this.revealChoices(view);
      return;
    }
    if (!view.choices.length) getSession(this).advanceDialogue();
  }

  private choose(position: number): void {
    const view = getSession(this).dialogueView;
    const choice = view?.choices[position];
    if (!choice || this.shown < this.fullText.length) return;
    getSession(this).advanceDialogue(choice.index);
  }
}
