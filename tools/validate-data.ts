// Validates JSON content in src/data (spec §2). Phase 0: checks every file parses.
// Schema + cross-reference checks (e.g. dialogue `next` ids) arrive with the data in later phases.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = join(import.meta.dirname, '..', 'src', 'data');

function listJson(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listJson(path);
    return name.endsWith('.json') ? [path] : [];
  });
}

const errors: string[] = [];
const files = listJson(DATA_DIR);
for (const file of files) {
  try {
    JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    errors.push(`${file}: ${(err as Error).message}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`validate-data: ${files.length} file(s) OK`);
