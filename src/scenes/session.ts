import type Phaser from 'phaser';
import type { GameSession } from '../core/GameSession';

const KEY = 'session';

/** The live session is shared between GameScene and UIScene via the game registry. */
export function setSession(scene: Phaser.Scene, session: GameSession): void {
  scene.registry.set(KEY, session);
}

export function getSession(scene: Phaser.Scene): GameSession {
  const session = scene.registry.get(KEY) as GameSession | undefined;
  if (!session) throw new Error('No GameSession: PreloadScene must create one first');
  return session;
}
