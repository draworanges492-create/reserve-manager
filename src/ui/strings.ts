import strings from '../data/strings.json';

type StringKey = keyof typeof strings;

/** Looks up UI text and fills `{placeholders}`. All player-facing text lives in src/data. */
export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  return strings[key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}
