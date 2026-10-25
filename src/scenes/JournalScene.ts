import Phaser from 'phaser';
import { registerFocusable } from '../ui/focus';
import { eventBus } from '../core/EventBus';
import { t } from '../core/text';
import { audio } from '../audio/AudioManager';
import { Button } from '../ui/Button';
import { crispText } from '../ui/crispText';
import { type BookEntry, JOURNAL_TABS, type JournalTab, tabEntries } from '../ui/journalBook';
import { JOURNAL, TEXT_SIZE } from '../ui/theme';
import { fitUiCamera, viewHeight, viewWidth } from '../ui/view';
import { getSession } from './session';

const MAX_W = 600;
const MAX_H = 330;
const COVER = 6;
const PAD = 14;
const TAB_W = 74;
const TAB_H = 18;
const SPRITE = 26;
const GAP = 10;
const INK = JOURNAL.ink;
const FADED = JOURNAL.faded;
const NEW = JOURNAL.new;
const COVER_COLOR = JOURNAL.cover;
const PAGE_COLOR = JOURNAL.page;
const PAGE_EDGE = JOURNAL.pageEdge;

interface Placed {
  entry: BookEntry;
  objects: Phaser.GameObjects.GameObject[];
  height: number;
}

/**
 * The journal book (D130): Ruth's old field journal, opened over the map. Two pages per
 * spread, tabs for Diary, Field notes, Records and Decisions. The clock pauses while it's
 * open; closing it marks every entry read.
 */
export class JournalScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private open = false;
  private tab: JournalTab = 'diary';
  private spread = 0;
  private pages: Placed[][] = [];
  private pausedBefore = false;
  /** Book frame, tabs and buttons of the current spread (rebuilt on every page turn). */
  private chrome: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('JournalScene');
  }

  create(): void {
    fitUiCamera(this);
    this.root = this.add.container(0, 0).setVisible(false);
    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', () => this.open && this.close());
    kb?.on('keydown-LEFT', () => this.open && this.turn(-1));
    kb?.on('keydown-RIGHT', () => this.open && this.turn(1));
    this.scale.on(Phaser.Scale.Events.RESIZE, this.redraw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, this.redraw, this),
    );
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    if (this.open) this.close();
    else this.openAt('diary');
  }

  /** Open at a tab, optionally at the spread holding `key` (e.g. `notes:impala`). */
  openAt(tab: JournalTab, key?: string): void {
    const session = getSession(this);
    if (!this.open) {
      this.pausedBefore = session.state.clock.paused;
      session.dispatch({ type: 'setPaused', paused: true });
      audio.sfx('page');
    }
    this.open = true;
    this.tab = tab;
    this.scene.bringToTop();
    this.layout();
    const at = key ? this.pages.findIndex((p) => p.some((e) => e.entry.key === key)) : -1;
    // The diary opens at its newest pages; the other tabs at the start.
    this.spread =
      at >= 0
        ? Math.floor(at / 2)
        : tab === 'diary'
          ? Math.max(0, Math.ceil(this.pages.length / 2) - 1)
          : 0;
    this.showSpread();
  }

  close(): void {
    if (!this.open) return;
    const session = getSession(this);
    this.open = false;
    this.root.setVisible(false).removeAll(true);
    this.chrome = [];
    this.pages = [];
    session.dispatch({ type: 'markJournalRead' });
    session.dispatch({ type: 'setPaused', paused: this.pausedBefore });
  }

  private redraw(): void {
    if (this.open) this.openAt(this.tab);
  }

  private turn(by: number): void {
    const next = this.spread + by;
    if (next < 0 || next * 2 >= Math.max(1, this.pages.length)) return;
    this.spread = next;
    audio.sfx('page');
    this.showSpread();
  }

  private bookRect(): { x: number; y: number; w: number; h: number } {
    const w = Math.min(MAX_W, viewWidth(this) - TAB_W - 24);
    const h = Math.min(MAX_H, viewHeight(this) - 36);
    return {
      x: Math.round((viewWidth(this) - w - TAB_W) / 2),
      y: Math.round((viewHeight(this) - h) / 2),
      w,
      h,
    };
  }

  private pageWidth(): number {
    return this.bookRect().w / 2 - COVER - PAD * 2;
  }

  private pageHeight(): number {
    return this.bookRect().h - COVER * 2 - PAD * 2 - 14; // room for the page number
  }

  /** Build every entry's text once and cut the tab into pages. */
  private layout(): void {
    this.root.removeAll(true);
    for (const page of this.pages) for (const e of page) for (const o of e.objects) o.destroy();
    const session = getSession(this);
    const entries = tabEntries(session.state, this.tab);
    const pw = this.pageWidth();
    const ph = this.pageHeight();
    this.pages = [[]];
    let used = 0;
    for (const entry of entries) {
      const placed = this.build(entry, pw);
      const page = this.pages[this.pages.length - 1] ?? [];
      if (used > 0 && used + placed.height > ph) {
        this.pages.push([placed]);
        used = placed.height + GAP;
      } else {
        page.push(placed);
        used += placed.height + GAP;
      }
    }
  }

  /** Text objects for one entry, laid out from (0, 0); hidden until its page shows. */
  private build(entry: BookEntry, width: number): Placed {
    const objects: Phaser.GameObjects.GameObject[] = [];
    let x = 0;
    if (entry.sprite && this.textures.exists(entry.sprite)) {
      const frame = this.textures.getFrame(entry.sprite, 0);
      const img = this.add
        .image(SPRITE / 2, SPRITE, entry.sprite, 0)
        .setOrigin(0.5, 1)
        .setScale(SPRITE / Math.max(frame.width, frame.height));
      objects.push(img);
      x = SPRITE + 6;
    }
    const title = crispText(this, x, 0, entry.title, {
      fontSize: TEXT_SIZE.label,
      fontStyle: 'bold',
      color: INK,
      wordWrap: { width: width - x - 40 },
    });
    objects.push(title);
    if (entry.isNew) {
      objects.push(
        crispText(this, x + title.width + 6, 2, t('journal.new'), {
          fontSize: TEXT_SIZE.small,
          color: NEW,
        }),
      );
    }
    let y = title.height + 1;
    if (entry.meta) {
      const meta = crispText(this, x, y, entry.meta, {
        fontSize: TEXT_SIZE.small,
        color: FADED,
        wordWrap: { width: width - x },
      });
      objects.push(meta);
      y += meta.height + 3;
    }
    y = Math.max(y, entry.sprite ? SPRITE + 4 : y);
    for (const line of entry.body) {
      const body = crispText(this, 0, y, line, {
        fontSize: TEXT_SIZE.small,
        color: INK,
        lineSpacing: 2,
        wordWrap: { width },
      });
      objects.push(body);
      y += body.height + 3;
    }
    if (entry.focus) {
      const link = crispText(this, 0, y, `→ ${t('journal.goThere')}`, {
        fontSize: TEXT_SIZE.small,
        color: NEW,
      }).setInteractive({ useHandCursor: true });
      const focus = entry.focus;
      link.on(
        Phaser.Input.Events.POINTER_DOWN,
        (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
          ev.stopPropagation();
          this.close();
          eventBus.emit('focusRequested', focus);
        },
      );
      link.once(
        Phaser.GameObjects.Events.DESTROY,
        registerFocusable({
          scene: this,
          target: link,
          activate: () => {
            this.close();
            eventBus.emit('focusRequested', focus);
          },
        }),
      );
      objects.push(link);
      y += link.height + 2;
    }
    for (const o of objects)
      (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
    return { entry, objects, height: y };
  }

  private showSpread(): void {
    this.root.removeAll(false);
    for (const o of this.chrome) o.destroy();
    this.chrome = [];
    const { x, y, w, h } = this.bookRect();
    const vw = viewWidth(this);
    const vh = viewHeight(this);
    const shade = this.add.rectangle(0, 0, vw, vh, 0x000000, 0.55).setOrigin(0).setInteractive();
    shade.on(Phaser.Input.Events.POINTER_DOWN, () => this.close());
    const cover = this.add
      .rectangle(x, y, w, h, COVER_COLOR)
      .setOrigin(0)
      .setStrokeStyle(1, 0x2a1d14)
      .setInteractive();
    const left = this.add
      .rectangle(x + COVER, y + COVER, w / 2 - COVER, h - COVER * 2, PAGE_COLOR)
      .setOrigin(0);
    const right = this.add
      .rectangle(x + w / 2, y + COVER, w / 2 - COVER, h - COVER * 2, PAGE_COLOR)
      .setOrigin(0);
    const spine = this.add
      .rectangle(x + w / 2 - 1, y + COVER, 2, h - COVER * 2, PAGE_EDGE)
      .setOrigin(0);
    this.root.add([shade, cover, left, right, spine]);

    // Pages of the spread.
    const total = Math.max(1, this.pages.length);
    for (const [side, pageIndex] of [
      [0, this.spread * 2],
      [1, this.spread * 2 + 1],
    ] as const) {
      const px = x + (side === 0 ? COVER + PAD : w / 2 + PAD);
      let py = y + COVER + PAD;
      for (const placed of this.pages[pageIndex] ?? []) {
        for (const o of placed.objects) {
          const go = o as unknown as Phaser.GameObjects.Components.Transform &
            Phaser.GameObjects.Components.Visible;
          const baseX = (o.getData('baseX') as number | undefined) ?? go.x;
          const baseY = (o.getData('baseY') as number | undefined) ?? go.y;
          o.setData({ baseX, baseY });
          go.setPosition(px + baseX, py + baseY);
          go.setVisible(true);
          this.root.add(o);
        }
        py += placed.height + GAP;
      }
      if (pageIndex < total) {
        const num = crispText(
          this,
          px + this.pageWidth() / 2,
          y + h - COVER - 14,
          t('journal.page', { n: pageIndex + 1, total }),
          {
            fontSize: TEXT_SIZE.small,
            color: FADED,
          },
        ).setOrigin(0.5, 0);
        this.root.add(num);
      }
    }
    // Hide entries of other spreads.
    this.pages.forEach((page, i) => {
      if (Math.floor(i / 2) === this.spread) return;
      for (const p of page)
        for (const o of p.objects)
          (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
    });

    // Tabs along the right edge, page arrows, close button and a hint.
    JOURNAL_TABS.forEach((tab, i) => {
      const b = new Button(this, x + w + 2, y + 10 + i * (TAB_H + 4), {
        width: TAB_W,
        height: TAB_H,
        label: t(`journal.tab.${tab}`),
        onClick: () => this.openAt(tab),
      });
      b.setSelected(tab === this.tab);
      this.root.add(b);
    });
    const prev = new Button(this, x + COVER + 4, y + h - COVER - 18, {
      width: 22,
      height: 14,
      label: '◀',
      onClick: () => this.turn(-1),
    });
    const next = new Button(this, x + w - COVER - 26, y + h - COVER - 18, {
      width: 22,
      height: 14,
      label: '▶',
      onClick: () => this.turn(1),
    });
    prev.setVisible(this.spread > 0);
    next.setVisible((this.spread + 1) * 2 < total);
    const close = new Button(this, x + w - 16, y - 16, {
      width: 14,
      height: 14,
      label: '×',
      onClick: () => this.close(),
    });
    const hint = crispText(this, x + w / 2, y + h + 6, t('journal.hint'), {
      fontSize: TEXT_SIZE.small,
      color: '#e8d9a8aa',
    }).setOrigin(0.5, 0);
    this.root.add([prev, next, close, hint]);
    const entryObjects = new Set(this.pages.flat().flatMap((p) => p.objects));
    this.chrome = this.root.list.filter((o) => !entryObjects.has(o));
    this.root.setVisible(true);
  }
}
