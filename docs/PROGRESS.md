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

## Phase 1 — Placeholders & map ✅ (2026-10-19)

**Done**

- `tools/generate-placeholders.ts` (`npm run gen:placeholders`): 26 terrain tiles, impala /
  zebra / lion / elephant / ranger / visitor walk strips, shadows, 31-colour `palette.gpl`.
  Pure Node, no image libraries; never overwrites non-placeholder art.
- `tools/generate-map.ts` (`npm run gen:map -- --force`): 120×80 `reserve.tmj` with every
  layer from spec §5 — tile layers `ground`, `vegetation_deco`, `water`, `objects`,
  `collision`; object layers `zones` (7), `waterholes` (A dry, B pond), `spawns`,
  `build_slots` (8), `fence_segments` (30, incl. `hq_gate`), `poacher_entries` (5).
- `src/data/zones.json` (names, unlock chapters); `validate-data` now checks the map
  against it (layers, ids, overlaps, objects inside their zones, unique ids).
- Asset manifest `src/config/assets.json`; Boot → Preload (progress bar) → GameScene + UIScene.
- GameScene: tilemap, run-down dashed fences, locked zones dimmed, hovered zone outlined,
  preview animal groups (shadow + idle bob).
- Camera: drag (mouse / one finger), WASD + arrows, edge scroll, wheel / trackpad zoom
  around the cursor, two-finger pinch zoom; steps 0.5×–3×; clamped to the map.
- UIScene: zone name on hover ("Locked until Chapter N" for locked zones), controls hint.
- `docs/ART_GUIDE.md`, `public/assets/ASSETS.md` filled in.

**Checks:** `build` ✅ · `test` ✅ (17) · `lint` ✅ · `validate-data` ✅ · browser at
1512×865: map renders, zones identifiable, 60 fps at the widest zoom, 0 console errors.

**Next — Phase 2 (Core state, clock, seasons):** GameState + factory, Clock (pause / 1× / 2× /
4×, 120 s days, 30-day seasons), Seasons sim, HUD date/season and speed controls, season
visual change, tests.

**Known issues**

- Ground types meet with hard, blocky tile edges (no transition tiles yet; listed in ART_GUIDE).
- Animal sprites always draw in front of trees (tile layers can't depth-sort with sprites);
  revisit when animals wander (Phase 4).
- Touch pan/pinch is implemented but only tested with a mouse; needs a check on a real
  touch screen.
