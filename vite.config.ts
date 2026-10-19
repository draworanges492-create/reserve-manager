import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the same build works on itch.io (zip) and GitHub Pages (sub-path).
  base: './',
  // Phaser alone is ~1.2 MB minified; warn only above that.
  build: { assetsInlineLimit: 0, chunkSizeWarningLimit: 1600 },
  test: { include: ['tests/**/*.test.ts'] },
});
