# Progress

## Phase 0 — Scaffolding ✅ (2026-10-19)

**Done**

- Vite + Phaser 3 + TypeScript (strict, plus `noUncheckedIndexedAccess`) project.
- ESLint (flat config, typescript-eslint strict) + Prettier; Vitest.
- Folder structure from spec §3 (empty dirs hold `.gitkeep`).
- `CLAUDE.md`, `docs/SPEC.md` (retitled), `docs/PROGRESS.md`, `docs/DECISIONS.md`, `public/assets/ASSETS.md`.
- `BootScene` shows "Reserve Manager", integer-scaled and centered; re-scales on window resize.
- Viewport scaling function + unit tests.
- `npm run validate-data` stub: checks every JSON file in `src/data` parses (no data yet).
- Lint guard that keeps `src/sim/` free of Phaser, `Math.random` and wall-clock time.

**Checks:** `dev` ✅ · `build` ✅ · `test` ✅ · `lint` ✅ · `validate-data` ✅

### Phase 0 follow-up (user feedback)

- Game now fills the whole browser window at a whole-number zoom (MacBook Pro: 2×), no black bars.
- Art detail raised to 24×24 tiles / 24 & 48 px animals / 640×360 minimum view (DECISIONS D11–D13).
- Animal-vs-map readability rules recorded (D13); applied from Phase 1.

**Checks:** `build` ✅ · `test` ✅ (5) · `lint` ✅

**Next — Phase 1 (Placeholders & map):** `tools/generate-placeholders.ts`, `assets.json` texture manifest, 120×80 Tiled map with every layer/zone from §5, `GameScene` + camera pan/zoom/clamp (mouse, WASD, edge scroll, touch drag + pinch), zone hover labels.

**Known issues**

- None.
