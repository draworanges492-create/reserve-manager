// Keyboard focus (D139): Tab / Shift+Tab move between everything clickable on screen, Enter
// activates it, Esc lets go. Buttons register themselves; map objects (build spots, fences,
// clues, buildings) register with `world: true`, and focusing one moves the camera to it.
import Phaser from 'phaser';
import { UI } from './theme';

export interface Focusable {
  scene: Phaser.Scene;
  /** What the focus ring is drawn around; also decides visibility. */
  target: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.GetBounds;
  activate: () => void;
  /** False while it can't be used (a disabled button, a fence that can't be mended). */
  available?: () => boolean;
  /** Lives on the map rather than in the HUD. */
  world?: boolean;
  /** Higher wins: while placing a building, only build spots can take focus. */
  priority?: () => number;
  /** Called when it takes focus (e.g. a tooltip, or moving the camera). */
  onFocus?: () => void;
  onBlur?: () => void;
}

/** Scenes that cover everything below them: only their own items can take focus. */
const MODAL = new Set(['MenuScene', 'DialogueScene', 'JournalScene', 'EpilogueScene']);
const RING_PAD = 2;
const ROW_SLACK = 4;

const items = new Set<Focusable>();
const rings = new Map<Phaser.Scene, Phaser.GameObjects.Graphics>();
let focused: Focusable | null = null;
let game: Phaser.Game | null = null;

export function registerFocusable(item: Focusable): () => void {
  items.add(item);
  return () => {
    items.delete(item);
    if (focused === item) setFocus(null);
  };
}

export function focusedItem(): Focusable | null {
  return focused;
}

function shown(o: Phaser.GameObjects.GameObject): boolean {
  let node: Phaser.GameObjects.GameObject | null = o;
  while (node) {
    const v = node as Phaser.GameObjects.GameObject & { visible?: boolean };
    if (!node.active || v.visible === false) return false;
    node = node.parentContainer;
  }
  return true;
}

function usable(item: Focusable): boolean {
  const sys = item.scene.sys;
  return (
    !!sys && sys.isActive() && sys.isVisible() && shown(item.target) && (item.available?.() ?? true)
  );
}

function sceneIndex(scene: Phaser.Scene): number {
  return scene.scene.manager.getIndex(scene);
}

/** What Tab can reach right now, in reading order (HUD first, then the map). */
export function candidates(): Focusable[] {
  let list = [...items].filter(usable);
  const top = Math.max(0, ...list.map((i) => i.priority?.() ?? 0));
  list = list.filter((i) => (i.priority?.() ?? 0) === top);
  const hud = list.filter((i) => !i.world);
  const topScene = hud.reduce<Phaser.Scene | null>(
    (best, i) => (!best || sceneIndex(i.scene) > sceneIndex(best) ? i.scene : best),
    null,
  );
  const modal = !!topScene && MODAL.has(topScene.scene.key);
  const order = (a: Focusable, b: Focusable): number => {
    const ra = a.target.getBounds();
    const rb = b.target.getBounds();
    return Math.abs(ra.y - rb.y) > ROW_SLACK ? ra.y - rb.y : ra.x - rb.x;
  };
  const inTop = hud.filter((i) => i.scene === topScene).sort(order);
  const world = modal ? [] : list.filter((i) => i.world).sort(order);
  return [...inTop, ...world];
}

function setFocus(item: Focusable | null): void {
  if (item === focused) return;
  focused?.onBlur?.();
  focused = item;
  focused?.onFocus?.();
}

export function moveFocus(step: 1 | -1): void {
  const list = candidates();
  if (!list.length) return setFocus(null);
  const at = focused ? list.indexOf(focused) : -1;
  const next = at < 0 ? (step > 0 ? 0 : list.length - 1) : (at + step + list.length) % list.length;
  setFocus(list[next] ?? null);
}

function ringFor(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  let g = rings.get(scene);
  if (!g || !g.active) {
    g = scene.add.graphics().setDepth(Number.MAX_SAFE_INTEGER);
    rings.set(scene, g);
  }
  return g;
}

function drawRing(): void {
  for (const [scene, g] of rings) {
    if (g.active) g.clear();
    else rings.delete(scene);
  }
  if (focused && !usable(focused)) setFocus(null);
  if (!focused) return;
  const g = ringFor(focused.scene);
  // Keep the ring on top of anything the scene added since.
  focused.scene.children.bringToTop(g);
  const b = focused.target.getBounds();
  g.lineStyle(2, UI.accent, 1).strokeRect(
    b.x - RING_PAD,
    b.y - RING_PAD,
    b.width + RING_PAD * 2,
    b.height + RING_PAD * 2,
  );
}

function onKey(e: KeyboardEvent): void {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.key === 'Tab') {
    e.preventDefault();
    moveFocus(e.shiftKey ? -1 : 1);
    return;
  }
  if (!focused) return;
  if (e.key === 'Enter') {
    // The focused control gets Enter, not the scene's own Enter shortcut underneath.
    e.preventDefault();
    e.stopImmediatePropagation();
    const item = focused;
    if (usable(item)) item.activate();
  } else if (e.key === 'Escape') {
    setFocus(null);
  }
}

/** Starts listening for Tab / Enter. Call once when the game boots. */
export function installFocus(g: Phaser.Game): void {
  if (game) return;
  game = g;
  // Capture phase, so Enter on a focused control never also reaches Phaser's listeners.
  window.addEventListener('keydown', onKey, true);
  // A mouse click hands control back to the pointer.
  window.addEventListener('pointerdown', () => setFocus(null), true);
  g.events.on(Phaser.Core.Events.POST_STEP, drawRing);
}
