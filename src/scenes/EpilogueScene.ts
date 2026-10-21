import Phaser from 'phaser';
import { t } from '../core/text';
import { endingOf, epilogueSlides } from '../story/Ending';
import { Button } from '../ui/Button';
import { crispText } from '../ui/crispText';
import { TEXT_SIZE, UI } from '../ui/theme';
import { fitUiCamera, viewHeight, viewWidth } from '../ui/view';
import { returnToMenu } from './launch';
import { getSession } from './session';

const MAX_W = 420;
const PAD = 14;
const BUTTON_W = 120;
const BUTTON_H = 18;

/**
 * The epilogue (spec §9.3, D126): after the final chapter, one slide per major decision,
 * the ending, then credits. Shows over everything with the clock paused; afterwards the
 * player keeps playing or goes back to the title screen.
 */
export class EpilogueScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private slides: { title: string; text: string }[] = [];
  private index = 0;
  private open = false;

  constructor() {
    super('EpilogueScene');
  }

  create(): void {
    fitUiCamera(this);
    this.root = this.add.container(0, 0).setVisible(false);
    const advance = (): void => {
      if (this.open && this.index < this.slides.length - 1) this.show(this.index + 1);
    };
    this.input.on(Phaser.Input.Events.POINTER_DOWN, advance);
    this.input.keyboard?.on('keydown-SPACE', advance);
    this.input.keyboard?.on('keydown-ENTER', advance);
  }

  override update(): void {
    const session = getSession(this);
    const { flags } = session.state;
    if (this.open || !flags.epilogue_ready || flags.epilogue_seen || session.dialogueView) return;
    const ending = endingOf(session.state);
    if (!ending) return;
    this.slides = epilogueSlides(session.state, ending);
    this.open = true;
    session.dispatch({ type: 'setPaused', paused: true });
    this.scene.bringToTop();
    this.show(0);
  }

  private show(i: number): void {
    this.index = i;
    const slide = this.slides[i];
    if (!slide) return;
    this.root.removeAll(true);
    const w = viewWidth(this);
    const h = viewHeight(this);
    const boxW = Math.min(MAX_W, w - 32);
    const shade = this.add.rectangle(0, 0, w, h, 0x0e0b08, 0.92).setOrigin(0).setInteractive();
    const title = crispText(this, w / 2, 0, slide.title, {
      fontSize: TEXT_SIZE.title,
      fontStyle: 'bold',
      color: '#f0d49a',
    }).setOrigin(0.5, 0);
    const body = crispText(this, w / 2, 0, slide.text, {
      fontSize: TEXT_SIZE.label,
      lineSpacing: 4,
      align: 'center',
      wordWrap: { width: boxW - PAD * 2 },
    }).setOrigin(0.5, 0);
    const last = i === this.slides.length - 1;
    const footer = crispText(
      this,
      w / 2,
      0,
      last ? '' : t('epilogue.next', { n: i + 1, total: this.slides.length }),
      { fontSize: TEXT_SIZE.small, color: UI.textDim },
    ).setOrigin(0.5, 0);
    const contentH = title.height + 10 + body.height + 18 + (last ? BUTTON_H : footer.height);
    let y = Math.round((h - contentH) / 2);
    title.setY(y);
    y += title.height + 10;
    body.setY(y);
    y += body.height + 18;
    footer.setY(y);
    this.root.add([shade, title, body, footer]);
    if (last) {
      const keep = new Button(this, w / 2 - BUTTON_W - 6, y, {
        width: BUTTON_W,
        height: BUTTON_H,
        label: t('epilogue.keepPlaying'),
        onClick: () => this.finish(false),
      });
      const menu = new Button(this, w / 2 + 6, y, {
        width: BUTTON_W,
        height: BUTTON_H,
        label: t('epilogue.menu'),
        onClick: () => this.finish(true),
      });
      this.root.add([keep, menu]);
    }
    this.root.setVisible(true);
  }

  private finish(toMenu: boolean): void {
    const session = getSession(this);
    session.dispatch({ type: 'finishEpilogue' });
    this.open = false;
    this.root.setVisible(false).removeAll(true);
    if (toMenu) returnToMenu(this);
    else session.dispatch({ type: 'setPaused', paused: false });
  }
}
