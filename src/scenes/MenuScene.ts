import Phaser from 'phaser';
import { GAME_TITLE } from '../config/game';
import {
  deleteSlot,
  latestSlot,
  listSlots,
  localSaveStore,
  readSlot,
  type SlotId,
} from '../core/Save';
import { t } from '../core/text';
import { Button } from '../ui/Button';
import { crispText } from '../ui/crispText';
import { WARN_COLOR } from '../ui/InfoPanel';
import { askPlayerName } from '../ui/namePrompt';
import { savedAtText, slotName, slotText, summaryText } from '../ui/saveInfo';
import { TEXT_SIZE, UI } from '../ui/theme';
import { loadGame, startNewGame } from './launch';

const BUTTON_W = 170;
const BUTTON_H = 20;
const ROW_W = 380;
const BACKGROUND = 0x1d2b1f;
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
    this.view = 'main';
    this.message = '';
    this.busy = false;
    this.render();
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
    for (const p of this.parts) p.destroy();
    this.parts = [];
    const w = this.scale.width;
    const h = this.scale.height;
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
    y += 26;
    PARADE.forEach((key, i) => {
      this.keep(
        this.add
          .image(w / 2 + (i - 1) * 40, y + 24, key, 0)
          .setScale(2)
          .setOrigin(0.5, 1),
      );
    });
    y += 40;
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
    const x = this.scale.width / 2 - BUTTON_W / 2;
    let y = top;
    const latest = latestSlot(localSaveStore());
    this.button(x, y, t('menu.continue'), () => latest && this.loadSlot(latest), !!latest);
    y += BUTTON_H + 3;
    if (latest) {
      const result = readSlot(localSaveStore(), latest);
      if (result.ok) {
        this.keep(
          crispText(this, this.scale.width / 2, y, summaryText(result.summary), {
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
    const w = this.scale.width;
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
