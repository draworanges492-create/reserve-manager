import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // Spec §0 rule 4: sim must be pure and deterministic so it can be unit-tested headless.
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['phaser', 'phaser/*'], message: 'sim/ must not import Phaser.' }] },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded Rng from core/Rng.ts.' },
        { object: 'Date', property: 'now', message: 'sim/ must not read wall-clock time.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'sim/ must not read wall-clock time.',
        },
      ],
    },
  },
  prettier,
);
