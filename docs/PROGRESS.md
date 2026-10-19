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

**Known issues**

- Ground types meet with hard, blocky tile edges (no transition tiles yet; listed in ART_GUIDE).
- Animal sprites always draw in front of trees (tile layers can't depth-sort with sprites);
  revisit when animals wander (Phase 4).
- Touch pan/pinch is implemented but only tested with a mouse; needs a check on a real
  touch screen.

## Phase 2 — Core state, clock, seasons ✅ (2026-10-19)

**Done**

- `core/GameState.ts`: serializable state + `createGameState` (seed, RNG state, clock,
  chapter, zone locks, money, flags).
- `config/balance.json` + typed `balance.ts`: time, start money, start chapter, render tunables.
- `core/Clock.ts`: real time → day ticks (120 s/day at 1×; pause, 1×, 2×, 4×; capped per frame).
- `sim/Seasons.ts` (calendar: year / season / day-of-season; 30-day seasons) and
  `sim/tick.ts` (day tick in spec §4 order; only Seasons exists yet).
- `core/Commands.ts`: `setSpeed`, `setPaused`, `togglePause`, validated with reasons.
- `core/GameSession.ts`: ties clock, sim and commands to the EventBus.
- HUD top bar: season icon, "Year 1 · Dry season · Day 1/30", day progress bar, pause and
  1× / 2× / 4× buttons (Space, 1, 2, 3 on the keyboard), "Paused" label. Clicks on the HUD
  never pan the map.
- Seasons tint the terrain (fade); subtle cosmetic dawn/dusk/night wash.
- `core/text.ts`: all new UI text in `src/data/strings.json`.

**Checks:** `build` ✅ · `test` ✅ (37) · `lint` ✅ · `validate-data` ✅ · browser at
1512×865: 4× speed measured 0.099 day / 3 s (expected 0.100); pause stops the clock;
keys work; jumping to day 32 switched to "Wet season" with a greener map; 0 console errors.

**Known issues**

- Ground types still meet with hard tile edges; animals still draw over trees (see Phase 1).
- Touch controls still only tested with a mouse.

## Phase 3 — Water & chore mechanic ✅ (2026-10-19)

**Done**

- `sim/Water.ts` (day-tick step 2): daily change = −4 × season (dry ×2, wet ×0.5) + rain
  (wet +3) + pump (borehole +6, solar +8 when working), clamped 0–100; visual states
  clear / muddy / drying / dry; `waterBreakdown` for "why" text; `zoneHasWater` (range rule,
  20 tiles, level ≥ 30, locked zones excluded).
- `core/WorldLayout.ts`: zone rects/areas and waterhole positions read from the map into GameState.
- `refillWaterhole` command (+5, free, capped, refused with reasons when locked / full).
- Waterhole sprites (4 states) with click and hold-to-pump (+5 per 0.3 s), splash + bucket
  animation, floating message when refused; map now has beds under both waterholes.
- Tooltip on hover: state and level, evaporation × season, rain, pump, overnight change,
  "dries out in N days", and what to do (refill / locked / full). Reusable `ui/Tooltip`.
- `src/data/waterholes.json`, `src/data/buildings.json` (pump stub); `validate-data` now
  cross-checks waterholes ↔ map and building fields/effects.
- Fixed: hovering world objects silently failed because of a cross-scene hit test (D41).

**Checks:** `build` ✅ · `test` ✅ (64) · `lint` ✅ · `validate-data` ✅ · browser at
1512×865 (driven by script because the app window wasn't visible): click 5→10, 1 s hold
→ 30 and sprite switched to muddy, camera didn't move while pumping, tooltips correct for
A and locked B, locked click shows "That area is still locked.", a day tick took A 5→0 and
B 80→72; 0 console errors.

**Known issues**

- Open question D39 (pump unlock chapter / build days).
- Hard tile edges between ground types; animals draw over trees; touch untested on a device.
- The waterhole level changes once a day (spec's daily model), so the sprite jumps between
  states at day ticks rather than draining smoothly.

## Adjustments after Phase 3 ✅ (2026-10-19, user feedback)

**Done**

- Map re-laid out so zones tile the whole map edge to edge; one fence per shared border
  (owned by the zone that unlocks later); validate-data checks coverage and connectivity.
- Camera bounded to the unlocked zones; zoom-out stops before locked land shows.
- Alegreya font for all UI text, bigger sizes, shadow on on-map text.
- `species.json` + starting populations in GameState.
- Herds drawn from populations (≤ 12 sprites each), slowly wandering and grazing.
- Hover a herd for its count; click for an info panel (population, diet, status, water).
- Fixed: stale canvas offset after window resize.

**Checks:** `build` ✅ · `test` ✅ (77) · `lint` ✅ · `validate-data` ✅ · browser at
1512×865: camera clamped to tiles 36–84 × 32–80 and zoom-out held at 1×; all 27 animal
sprites moved over 30 s of game time (avg ~2.7 tiles) and stayed in the plains; hover and
panel text correct; drag from an animal pans, click opens, Esc / bare-ground click closes;
resize fills the window at 900×700, 1512×865 and 1728×1000; 0 console errors.

**Known issues**

- Open question D39 (pump unlock chapter / build days).
- Hard tile edges between ground types; animals draw over trees; touch untested on a device.
- Waterhole level changes once a day, so its sprite jumps between states.

## Phase 4 — Vegetation & populations ✅ (2026-10-19)

**Done**

- `sim/Vegetation.ts` (tick step 3): regrowth × season × bare ground − grazing by grazers;
  degraded below 25 (event + brown wash + warnings).
- `sim/Population.ts` (tick step 4): carrying capacity from area × density × grass × water
  (predators: from prey), logistic growth, overshoot die-off, saturating predation, Allee
  effect, stochastic rounding, "why" log per herd, `populationCritical` event.
- Herd sprites follow the numbers (≤ 12 each) — they were already wandering.
- Animal panel now explains changes: "Population: 84 (+1 yesterday)", "Yesterday: +1 born",
  "The land supports about 113 here (grass 54%, water nearby)", warnings when over capacity
  or below minimum viable size.
- New zone panel (click open ground): grass %, healthy/degraded, regrowth vs grazing, water,
  animals; zone hover label shows "Degraded".
- `npm run sim:balance -- --years N --player none|reasonable --seed S` (spec §13): CSV to
  stdout, summary to stderr.

**Balance (1 year, seeds 1–3):** attentive player — impala 80 → ~100–110, zebra 24 → ~43,
lions 4 → 5, plains grass 51–65%. No player — impala → ~45, zebra → ~18, lions → 2
(critical), grass recovers to ~80%. No extinctions or explosions (also a unit test).

**Checks:** `build` ✅ · `test` ✅ (95) · `lint` ✅ · `validate-data` ✅ · browser at
1512×865: populations tick and sprite counts follow; animal and zone panels show the right
lines; forced overgrazing showed "Degraded", −8.1/day grazing and the warning; 0 console
errors in a fresh tab.

**Next — Phase 5 (Economy, building, staff):** money and costs, build slots + construction,
hire/assign staff, ranger coverage, tower stub, debt state, Economy unit tests.

**Known issues**

- Open questions D39 (pump timings) and D51/D57 (predation, neglect speed).
- Hard tile edges between ground types; animals draw over trees; touch untested on a device.
- Waterhole level and herd counts change once a day (spec's daily model), so changes jump.
