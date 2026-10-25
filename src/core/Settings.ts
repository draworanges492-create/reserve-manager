// Player preferences (spec §7.7). Kept per browser in localStorage, separate from save
// games, so loading another save never changes how the game looks or sounds (DECISIONS D69).
import { type GameSpeed, GAME_SPEEDS } from '../config/game';

export interface Settings {
  /** 0–1. Stored now; audio arrives in Phase 9. */
  musicVolume: number;
  sfxVolume: number;
  /** Speed a new game starts at. */
  defaultSpeed: GameSpeed;
  /** Spec §7.7: alternate meter colours plus status icons. */
  colorblind: boolean;
  textSize: 'normal' | 'large';
  /** Cosmetic dawn / dusk / night wash (DECISIONS D31). */
  timeOfDay: boolean;
  /** Mouse at the screen edge scrolls the map (DECISIONS D25). */
  edgeScroll: boolean;
  /** No camera glides, sliding alerts or bobbing markers (D138). */
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.6,
  sfxVolume: 0.8,
  defaultSpeed: 1,
  colorblind: false,
  textSize: 'normal',
  timeOfDay: true,
  edgeScroll: true,
  reduceMotion: false,
};

/** Follows the system "reduce motion" preference until the player picks for themselves. */
function systemPrefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

const STORAGE_KEY = 'reserve-manager.settings.v1';
const VOLUME_STEP = 0.1;

type Listener = (settings: Settings) => void;

/** Fills gaps and drops invalid values, so an old or hand-edited entry can't break the game. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  const volume = (v: unknown, fallback: number): number =>
    typeof v === 'number' && v >= 0 && v <= 1 ? Math.round(v * 10) / 10 : fallback;
  const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
  const d = DEFAULT_SETTINGS;
  return {
    musicVolume: volume(r.musicVolume, d.musicVolume),
    sfxVolume: volume(r.sfxVolume, d.sfxVolume),
    defaultSpeed: (GAME_SPEEDS as readonly unknown[]).includes(r.defaultSpeed)
      ? (r.defaultSpeed as GameSpeed)
      : d.defaultSpeed,
    colorblind: bool(r.colorblind, d.colorblind),
    textSize: r.textSize === 'large' ? 'large' : 'normal',
    timeOfDay: bool(r.timeOfDay, d.timeOfDay),
    edgeScroll: bool(r.edgeScroll, d.edgeScroll),
    reduceMotion: bool(r.reduceMotion, systemPrefersReducedMotion()),
  };
}

function load(): Settings {
  try {
    return sanitizeSettings(JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_SETTINGS }; // private mode / blocked storage: use defaults
  }
}

let current: Settings = load();
const listeners = new Set<Listener>();

export function getSettings(): Readonly<Settings> {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = sanitizeSettings({ ...current, ...patch });
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable: the change still applies for this session.
  }
  listeners.forEach((l) => l(current));
}

export function onSettingsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Next volume in 10% steps, wrapping from 100% back to 0. */
export function nextVolume(v: number): number {
  const next = Math.round((v + VOLUME_STEP) * 10) / 10;
  return next > 1 ? 0 : next;
}

/** True when animations that move things around should be skipped (D138). */
export function reduceMotion(): boolean {
  return getSettings().reduceMotion;
}
