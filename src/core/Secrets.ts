// Easter eggs (EXTRAS_PLAN part 2, D132): which secrets the player has found. Kept per
// browser in localStorage like settings, so they count across every save.
export const SECRET_IDS = [
  'albino',
  'honey_badger',
  'name',
  'lazy_lion',
  'shooting_star',
  'parade',
  'tea',
  'hat',
  'visitor_1000',
] as const;
export type SecretId = (typeof SECRET_IDS)[number];

const STORAGE_KEY = 'reserve-manager.secrets.v1';

type Listener = (id: SecretId, found: number) => void;
const listeners = new Set<Listener>();
let cache: Set<SecretId> | null = null;

function load(): Set<SecretId> {
  if (cache) return cache;
  let raw: unknown;
  try {
    raw = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    raw = []; // private mode / blocked storage
  }
  const ids = Array.isArray(raw) ? raw : [];
  cache = new Set(SECRET_IDS.filter((id) => ids.includes(id)));
  return cache;
}

export function secretsFound(): SecretId[] {
  return SECRET_IDS.filter((id) => load().has(id));
}

export function hasSecret(id: SecretId): boolean {
  return load().has(id);
}

/** Marks a secret found. Returns true the first time; listeners hear about it then. */
export function findSecret(id: SecretId): boolean {
  const found = load();
  if (found.has(id)) return false;
  found.add(id);
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify([...found]));
  } catch {
    // Storage blocked: the secret still counts for this session.
  }
  listeners.forEach((l) => l(id, found.size));
  return true;
}

export function onSecretFound(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Tests only: forget the cached list so the next read comes from storage again. */
export function resetSecretsCache(): void {
  cache = null;
}
