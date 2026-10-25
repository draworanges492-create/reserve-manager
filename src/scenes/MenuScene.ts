import Phaser from 'phaser';
import { findSecret } from '../core/Secrets';
import { GAME_TITLE, WORLD_ART } from '../config/game';
import {
  deleteSlot,
  latestSlot,
  listSlots,
  localSaveStore,
  readSlot,
  type SlotId,
} from '../core/Save';
import { t } from '../core/text';
import { audio } from '../audio/AudioManager';
import { Button } from '../ui/Button';
import { crispText } from '../ui/crispText';
import { WARN_COLOR } from '../ui/InfoPanel';
import { askPlayerName } from '../ui/namePrompt';
import { savedAtText, slotName, slotText, summaryText } from '../ui/saveInfo';
import { MENU_BACKGROUND, TEXT_SIZE, UI } from '../ui/theme';
import { loadGame, startNewGame } from './launch';
import { fitUiCamera, viewHeight, viewWidth } from '../ui/view';

const BUTTON_W = 170;
const BUTTON_H = 20;
const ROW_W = 380;
const BACKGROUND = MENU_BACKGROUND;
const PARADE = ['impala', 'zebra', 'lion'];

/** Title screen (spec Phase 8): Continue, New game, Load game. */
export class MenuScene extends Phaser.Scene {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private view: 'main' | 'load' = 'main';
  private confirmDelete: SlotId | null = null;
  private message = '';
  private busy = false;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    // Which screen is up, for automated browser checks (tools/browser-check.ts).
    document.documentElement.dataset.screen = 'menu';
    fitUiCamera(this);
    this.view = 'main';
    // The title screen gets the quiet Chapter 1 loop, without the outdoor ambience.
    audio.setMusic('ruin');
    audio.setAmbience('none');
    this.message = '';
    this.busy = false;
    this.render();
    this.cameras.main.fadeIn(300);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.render, this);
    this.input.keyboard?.on('keydown-ENTER', () => {
      const latest = latestSlot(localSaveStore());
      if (this.view === 'main' && latest && !this.busy) this.loadSlot(latest);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, this.render, this),
    );
  }

  /** Track an object so the next render can clear it. */
  private keep<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.parts.push(obj);
    return obj;
  }

  private render(): void {
    for (const p of this.parts) {
      this.tweens.killTweensOf(p);
      p.destroy();
    }
    this.parts = [];
    const w = viewWidth(this);
    const h = viewHeight(this);
    this.keep(this.add.rectangle(0, 0, w, h, BACKGROUND).setOrigin(0));
    let y = Math.max(24, h * 0.14);
    this.keep(
      crispText(this, w / 2, y, GAME_TITLE, { fontSize: '30px', fontStyle: 'bold' }).setOrigin(
        0.5,
        0,
      ),
    );
    y += 38;
    this.keep(
      crispText(this, w / 2, y, t('menu.subtitle'), {
        fontSize: TEXT_SIZE.label,
        color: UI.textDim,
      }).setOrigin(0.5, 0),
    );
    y += 18;
    // The parade stands below the subtitle (sprites are 24 px tall, drawn at 2×).
    const tapped = new Set<number>();
    const animals = PARADE.map((key, i) =>
      this.keep(
        this.add
          .sprite(w / 2 + (i - 1) * 44, y + 48, key, 0)
          .setScale(2 * WORLD_ART)
          .setOrigin(0.5, 1)
          .setInteractive({ useHandCursor: true }),
      ),
    );
    // Easter egg (D132): click all three and they walk off the screen and back.
    animals.forEach((a, i) =>
      a.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.tweens.isTweening(a)) return;
        tapped.add(i);
        this.tweens.add({ targets: a, y: a.y - 6, duration: 110, yoyo: true });
        if (tapped.size === PARADE.length) {
          tapped.clear();
          this.parade(animals);
        }
      }),
    );
    y += 60;
    if (this.view === 'main') this.renderMain(y);
    else this.renderLoad(y);
    if (this.message) {
      this.keep(
        crispText(this, w / 2, h - 34, this.message, {
          fontSize: TEXT_SIZE.body,
          color: WARN_COLOR,
          wordWrap: { width: Math.min(ROW_W, w - 32) },
          align: 'center',
        }).setOrigin(0.5, 1),
      );
    }
    this.keep(
      crispText(this, w / 2, h - 10, t('menu.footer'), {
        fontSize: TEXT_SIZE.small,
        color: UI.textDim,
      }).setOrigin(0.5, 1),
    );
  }

  /** Walk the title animals off to the right and back in from the left. */
  private parade(animals: Phaser.GameObjects.Sprite[]): void {
    findSecret('parade');
    const w = viewWidth(this);
    animals.forEach((a, i) => {
      const home = a.x;
      const walk = this.time.addEvent({
        delay: 180,
        loop: true,
        callback: () => {
          if (!a.active)
            walk.remove(); // the menu was redrawn mid-parade
          else a.setFrame(String(a.frame.name) === '0' ? 1 : 0);
        },
      });
      this.tweens.chain({
        targets: a,
        tweens: [
          { x: w + 40, duration: 1800 + i * 150, delay: 300 + i * 200, ease: 'Sine.easeIn' },
          { x: -40, duration: 0 },
          { x: home, duration: 1800, ease: 'Sine.easeOut' },
        ],
        onComplete: () => {
          walk.remove();
          if (a.active) a.setFrame(0);
        },
      });
    });
  }

  private button(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    enabled = true,
    width = BUTTON_W,
  ): Button {
    return this.keep(
      new Button(this, x, y, { width, height: BUTTON_H, label, onClick }).setEnabled(enabled),
    );
  }

  private renderMain(top: number): void {
    const x = viewWidth(this) / 2 - BUTTON_W / 2;
    let y = top;
    const latest = latestSlot(localSaveStore());
    this.button(x, y, t('menu.continue'), () => latest && this.loadSlot(latest), !!latest);
    y += BUTTON_H + 3;
    if (latest) {
      const result = readSlot(localSaveStore(), latest);
      if (result.ok) {
        this.keep(
          crispText(this, viewWidth(this) / 2, y, summaryText(result.summary), {
            fontSize: TEXT_SIZE.small,
            color: UI.textDim,
          }).setOrigin(0.5, 0),
        );
        y += 14;
      }
    }
    y += 6;
    this.button(x, y, t('menu.newGame'), () => this.newGame());
    y += BUTTON_H + 8;
    this.button(x, y, t('menu.load'), () => {
      this.view = 'load';
      this.message = '';
      this.render();
    });
  }

  private renderLoad(top: number): void {
    const w = viewWidth(this);
    const rowW = Math.min(ROW_W, w - 24);
    const x = w / 2 - rowW / 2;
    let y = top;
    this.keep(
      crispText(this, w / 2, y, t('menu.loadTitle'), {
        fontSize: TEXT_SIZE.label,
        fontStyle: 'bold',
      }).setOrigin(0.5, 0),
    );
    y += 20;
    const actionW = 54;
    for (const { slot, result } of listSlots(localSaveStore())) {
      const info = slotText(result);
      const textW = rowW - actionW * 2 - 12;
      const title = this.keep(
        crispText(this, x, y, slotName(slot), { fontSize: TEXT_SIZE.body, fontStyle: 'bold' }),
      );
      const detail = this.keep(
        crispText(this, x, y + title.height, info.text, {
          fontSize: TEXT_SIZE.small,
          color: info.loadable ? UI.text : UI.textDim,
          wordWrap: { width: textW },
        }),
      );
      let rowH = title.height + detail.height;
      if (result.ok) {
        const when = this.keep(
          crispText(this, x, y + rowH, savedAtText(result.summary), {
            fontSize: TEXT_SIZE.small,
            color: UI.textDim,
          }),
        );
        rowH += when.height;
      }
      const bx = x + rowW - actionW * 2 - 4;
      this.button(bx, y, t('menu.loadButton'), () => this.loadSlot(slot), info.loadable, actionW);
      this.button(
        bx + actionW + 4,
        y,
        this.confirmDelete === slot ? t('menu.sure') : t('menu.delete'),
        () => this.delete(slot),
        info.deletable,
        actionW,
      );
      y += Math.max(rowH, BUTTON_H) + 8;
    }
    this.button(w / 2 - BUTTON_W / 2, y + 4, t('menu.back'), () => {
      this.view = 'main';
      this.confirmDelete = null;
      this.render();
    });
  }

  private loadSlot(slot: SlotId): void {
    if (this.busy) return;
    const result = loadGame(this, slot);
    if (!result.ok) {
      this.message = t('menu.loadFailed', { why: slotText(result).text });
      this.render();
    }
  }

  /** Deleting asks once more ("Sure?") so a stray click can't lose a game. */
  private delete(slot: SlotId): void {
    if (this.confirmDelete !== slot) {
      this.confirmDelete = slot;
    } else {
      deleteSlot(localSaveStore(), slot);
      this.confirmDelete = null;
    }
    this.render();
  }

  private newGame(): void {
    if (this.busy) return;
    this.busy = true;
    // The name box is HTML, so keep Phaser from grabbing keys like W/A/S/D while typing.
    if (this.input.keyboard) this.input.keyboard.enabled = false;
    void askPlayerName(document.body).then((name) => {
      if (this.input.keyboard) this.input.keyboard.enabled = true;
      startNewGame(this, name);
    });
  }
}
