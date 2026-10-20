// Debug overlay (spec §13). Loaded only in dev builds (see main.ts), so it never ships.
// Backtick (`) toggles it.
import Phaser from 'phaser';
import { SPECIES } from '../core/content';
import { getSession } from '../scenes/session';
import { Button } from '../ui/Button';
import { crispText } from '../ui/crispText';
import { TEXT_SIZE, UI } from '../ui/theme';
import { fitUiCamera, viewWidth } from '../ui/view';

const WIDTH = 150;
const BUTTON_H = 13;

export class DebugScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private info!: Phaser.GameObjects.Text;

  constructor() {
    super('DebugScene');
  }

  create(): void {
    fitUiCamera(this);
    const bg = this.add
      .rectangle(0, 0, WIDTH, 10, 0x000000, 0.75)
      .setOrigin(0)
      .setStrokeStyle(1, UI.border);
    this.info = crispText(this, 4, 4, '', { fontSize: TEXT_SIZE.small, color: '#9fe870' });
    const actions: [string, () => void][] = [
      ['+1 day', () => getSession(this).debugAdvanceDays(1)],
      ['+10 days', () => getSession(this).debugAdvanceDays(10)],
      ['+500 money', () => getSession(this).debugAddMoney(500)],
      ['Finish chapter goals', () => getSession(this).debugCompleteChapterGoals()],
      [
        'Jump to next chapter',
        () => {
          const s = getSession(this);
          s.debugJumpToChapter(s.state.chapter.current + 1);
        },
      ],
      [
        '+10 of each animal (plains)',
        () =>
          getSession(this).debugApplyEffects(
            SPECIES.map((sp) => ({ op: 'population', species: sp.id, zone: 'plains', value: 10 })),
          ),
      ],
      [
        'Set a flag…',
        () => {
          const flag = window.prompt('Flag to set (true):');
          if (flag) getSession(this).debugApplyEffects([{ op: 'setFlag', flag }]);
        },
      ],
    ];
    let y = 56;
    const buttons = actions.map(([label, onClick]) => {
      const b = new Button(this, 4, y, { width: WIDTH - 8, height: BUTTON_H, label, onClick });
      y += BUTTON_H + 2;
      return b;
    });
    // Random/scripted events arrive with sim/Events (a later phase); nothing to trigger yet.
    bg.setSize(WIDTH, y + 2);
    this.root = this.add.container(0, 0, [bg, this.info, ...buttons]).setVisible(false);
    this.input.keyboard?.on('keydown-BACKTICK', () => this.root.setVisible(!this.root.visible));
  }

  override update(): void {
    this.root.setPosition(viewWidth(this) - WIDTH - 6, 30);
    if (!this.root.visible || !this.registry.get('session')) return;
    const s = getSession(this).state;
    this.info.setText(
      [
        `FPS ${Math.round(this.game.loop.actualFps)}`,
        `Day ${s.clock.day} · Ch ${s.chapter.current}`,
        `Seed ${s.seed} · RNG ${s.rngState}`,
        `Money ${Math.round(s.resources.money)}`,
      ].join('\n'),
    );
    // Stay on top of every other scene.
    this.scene.bringToTop();
  }
}
