import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the same build works on itch.io (zip) and GitHub Pages (sub-path).
  base: './',
  // Phaser alone is ~1.2 MB minified; warn only above that.
  // es2022 for top-level await (waiting for the UI font before the game starts).
  // Phaser gets its own file: it rarely changes, so browsers keep it cached across updates.
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: { manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) },
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
