// Starting, loading and leaving a game: wires a GameSession to the scenes and to autosave.
import type Phaser from 'phaser';
import { createGameState, type GameState, withWorldUpdates } from '../core/GameState';
import { GameSession } from '../core/GameSession';
import { localSaveStore, readSlot, type SlotId, writeSlot } from '../core/Save';
import { getSettings } from '../core/Settings';
import type { TiledMap } from '../core/TiledFormat';
import { readWorldLayout } from '../core/WorldLayout';
import { getSession, setSession } from './session';

const GAME_SCENES = ['GameScene', 'UIScene', 'DialogueScene', 'EpilogueScene'] as const;

function now(): string {
  return new Date().toISOString();
}

/** Write the session to a slot. False if the browser refused (storage full / blocked). */
export function saveTo(session: GameSession, slot: SlotId): boolean {
  return writeSlot(localSaveStore(), slot, session.saveSnapshot(), now());
}

function run(scene: Phaser.Scene, state: GameState, fresh: boolean): void {
  const session = new GameSession(state, (snapshot) => {
    writeSlot(localSaveStore(), 'auto', snapshot, now());
  });
  if (fresh) session.beginStory();
  setSession(scene, session);
  // Dev-only handle for debugging in the browser console; removed from production builds.
  if (import.meta.env.DEV) Object.assign(window, { __session: session });
  saveTo(session, 'auto');
  scene.scene.stop('MenuScene');
  scene.scene.start('GameScene');
  scene.scene.launch('UIScene');
  scene.scene.launch('DialogueScene');
  scene.scene.launch('EpilogueScene');
}

function worldOf(scene: Phaser.Scene): ReturnType<typeof readWorldLayout> {
  return readWorldLayout((scene.cache.tilemap.get('reserve') as { data: TiledMap }).data);
}

export function startNewGame(scene: Phaser.Scene, playerName: string): void {
  // Wall-clock seeding is fine here: only the sim must be deterministic, given its seed.
  const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const state = createGameState({
    seed,
    world: worldOf(scene),
    playerName,
    speed: getSettings().defaultSpeed,
  });
  run(scene, state, true);
}

/** Load a slot; returns the error if it can't be loaded. */
export function loadGame(scene: Phaser.Scene, slot: SlotId): ReturnType<typeof readSlot> {
  const result = readSlot(localSaveStore(), slot);
  if (result.ok) run(scene, withWorldUpdates(result.state, worldOf(scene)), false);
  return result;
}

/** Autosave, close the game scenes and go back to the title screen. */
export function returnToMenu(scene: Phaser.Scene): void {
  saveTo(getSession(scene), 'auto');
  for (const key of GAME_SCENES) scene.scene.stop(key);
  scene.scene.start('MenuScene');
}
