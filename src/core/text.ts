import strings from '../data/strings.json';

export type StringKey = keyof typeof strings;

/** Looks up player-facing text and fills `{placeholders}`. All such text lives in src/data. */
export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  return strings[key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}
