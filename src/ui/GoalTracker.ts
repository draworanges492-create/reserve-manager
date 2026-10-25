import type Phaser from 'phaser';
import { registerFocusable } from './focus';
import type { GameState } from '../core/GameState';
import { crispText } from './crispText';
import { trackerContent } from './storyInfo';
import { TEXT_SIZE, UI } from './theme';

const WIDTH = 214;
const PAD = 5;
const ICON = 9;

/** Chapter goals, top-left (spec §9.2). Click to fold it down to just the chapter title. */
export class GoalTracker {
  private readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private parts: Phaser.GameObjects.GameObject[] = [];
  private signature = '';
  private collapsed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.bg = scene.add
      .rectangle(0, 0, WIDTH, 10, UI.panel, 0.8)
      .setOrigin(0)
      .setStrokeStyle(1, UI.border);
    this.bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.collapsed = !this.collapsed;
      this.signature = '';
    });
    this.root = scene.add.container(x, y, [this.bg]);
    this.bg.once(
      'destroy',
      registerFocusable({
        scene,
        target: this.bg,
        activate: () => {
          this.collapsed = !this.collapsed;
          this.signature = '';
        },
      }),
    );
  }

  contains(x: number, y: number): boolean {
    const { x: left, y: top } = this.root;
    return x >= left && y >= top && x <= left + this.bg.width && y <= top + this.bg.height;
  }

  update(state: GameState): void {
    const content = trackerContent(state);
    const signature = JSON.stringify([content, this.collapsed]);
    if (signature === this.signature) return;
    this.signature = signature;
    for (const p of this.parts) p.destroy();
    this.parts = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.parts.push(o);
      this.root.add(o);
      return o;
    };
    const title = add(
      crispText(
        this.scene,
        PAD,
        PAD - 1,
        `${content.title}${this.collapsed && content.goals.length ? '  ▸' : ''}`,
        {
          fontSize: TEXT_SIZE.body,
          fontStyle: 'bold',
          wordWrap: { width: WIDTH - PAD * 2 },
        },
      ),
    );
    let y = PAD + title.height + 2;
    if (!this.collapsed) {
      for (const goal of content.goals) {
        add(
          this.scene.add.image(
            PAD + ICON / 2,
            y + 6,
            goal.done ? 'icon-goal-done' : 'icon-goal-open',
          ),
        );
        const text = add(
          crispText(this.scene, PAD + ICON + 4, y, goal.text, {
            fontSize: TEXT_SIZE.small,
            color: goal.done ? UI.textDim : UI.text,
            wordWrap: { width: WIDTH - PAD * 2 - ICON - 4 },
          }),
        );
        y += text.height + 2;
      }
    }
    this.bg.setSize(WIDTH, y + PAD - 2);
    this.bg.input?.hitArea.setSize(WIDTH, y + PAD - 2);
  }
}
