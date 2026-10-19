// Pure helpers for drawing animal groups (no Phaser), so they can be unit-tested.

/** Spec §5: at most `max` sprites per zone/species; each stands for a share of the count. */
export function spriteCountFor(population: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(population)));
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A random walkable point near `centre` (within `radius`) and inside `area`, or null if
 * none was found in a few tries. `random` returns [0, 1); `blocked` tests a world point.
 */
export function pickSpot(
  centre: { x: number; y: number },
  radius: number,
  area: Rect,
  blocked: (x: number, y: number) => boolean,
  random: () => number,
  tries = 12,
): { x: number; y: number } | null {
  for (let i = 0; i < tries; i++) {
    const angle = random() * Math.PI * 2;
    const dist = Math.sqrt(random()) * radius; // sqrt: even spread over the disc
    const x = Math.round(centre.x + Math.cos(angle) * dist);
    const y = Math.round(centre.y + Math.sin(angle) * dist);
    const inside = x >= area.x && y >= area.y && x < area.x + area.w && y < area.y + area.h;
    if (inside && !blocked(x, y)) return { x, y };
  }
  return null;
}

/** Move `from` toward `to` by at most `step`; returns the new point and whether it arrived. */
export function stepToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
  step: number,
): { x: number; y: number; arrived: boolean } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= step) return { x: to.x, y: to.y, arrived: true };
  return { x: from.x + (dx / dist) * step, y: from.y + (dy / dist) * step, arrived: false };
}
