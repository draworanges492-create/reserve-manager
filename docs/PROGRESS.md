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

**Known issues**

- Open questions D39 (pump timings) and D51/D57 (predation, neglect speed).
- Hard tile edges between ground types; animals draw over trees; touch untested on a device.
- Waterhole level and herd counts change once a day (spec's daily model), so changes jump.

## Phase 5 — Economy, building, staff ✅ (2026-10-19)

**Done**

- `sim/Economy.ts` (day-tick step 8): grant, wages, upkeep (5% of cost / 30 days), daily
  ledger, 30-day net history, debt state, unpaid staff lose morale and quit after 3 days.
- `sim/Construction.ts`: build countdown; finished pumps start feeding their waterhole.
- `sim/Poaching.ts`: ranger coverage (min 0.9, 0.25 per ranger, ×2 with a ranger post).
- Commands: build (on valid slots, chapter- and money-checked), cancel (50% refund,
  upgrades fall back), hire, assign zone, dismiss — all with readable refusal reasons.
- Data: buildings.json (borehole pump, solar pump, ranger post, observation tower stub),
  staff.json (ranger, fence crew, tracker, vet, culling team); validate-data checks both.
- Map: pump slots linked to their waterholes; state holds slots, buildings, staff, economy.
- World: building sprites (scaffold + live progress bar while building), green build-mode
  spots, staff walking patrols in their zone (or waiting at HQ).
- HUD: money with expected net per day (red in debt) and a breakdown tooltip; Build and
  Staff buttons (B / H); right-hand menus; placing banner; building panel with Cancel;
  zone panel shows ranger coverage.
- New placeholder art: 4 buildings + scaffold, coin / build / staff icons.

**Checks:** `build` ✅ · `test` ✅ (119) · `lint` ✅ · `validate-data` ✅ · browser at
1512×865 (driven by script, pane in background): Staff menu → Hire → Zone ▸ ×2 put Ranger #1
on patrol in the plains and money showed "+10/day"; after a dev jump to Chapter 2, Build →
Place → spot A built a borehole pump over 3 days, Waterhole A switched to pumped, the panel
showed "Pumps +6/day into Waterhole A"; a ranger post was placed the same way; 0 console
errors.

**Known issues**

- Open questions D39/D60 (unlock chapters, build times), D51/D57 (predation, neglect).
- Hard tile edges; touch untested on a device.

## Phase 6 — UI pass ✅ (2026-10-19)

**Done**

- `sim/Scores.ts` (day-tick step 9): Ecosystem Health (spec formula), Community Trust
  (jobs for now), Reputation (slow drift); recent changes kept for tooltips.
- Top bar: date (auto-compact), day progress / "Paused", money, Ecosystem / Trust /
  Reputation meters, speed buttons — every part has a tooltip explaining its number.
- Alerts feed (right): colour-coded cards with shape badges; click pans to the cause and
  opens its panel; × dismisses.
- Toolbar: Build, Staff, Species, Journal, Settings (each with tooltip + shortcut).
- Species menu (counts, where, critical flag, Show → pans + opens the herd).
- Settings: music / effects volume (stored), starting speed, colourblind colours, text
  size (rebuilds HUD), day/night tint, edge scrolling, controls list, new game.
- Side menus scroll with the mouse wheel when taller than the screen.
- Settings saved per browser; HUD avoids overlaps down to 640×360.

**Checks:** `build` ✅ · `test` ✅ (140) · `lint` ✅ · `validate-data` ✅ · browser:
measured every HUD element at 640×360 (normal and large text) and 1512×865 — no overlaps,
nothing off-screen; colourblind toggle switched colours + icons; Species → Show and an
alert click both panned the camera; tooltips correct; real alerts appeared from the sim
(season, critical lions); 0 console errors.

**Known issues**

- Open questions D39/D60 (unlock chapters, build times), D51/D57 (predation, neglect).
- Hard tile edges; touch untested on a device.

## Phase 7 — Dialogue & Chapters 1–2 ✅ (2026-10-19)

**Done**

- `story/DialogueRunner.ts`: nodes, conditional branches, conditional choices, effects,
  `{player}`; pure and tested.
- `story/effects.ts`: the one effect interpreter; `story/conditions.ts`.
- `story/StoryManager.ts` (tick step 11 + after every action): goals (latching, timed
  streaks, counters), scripted beats, chapter completion → next chapter, zones opening when
  their fences are mended, journal entries.
- Fence repair command (20, 1 day), fence crews, fences drawn by status and clickable.
- Content: chapters.json (Ch 1 Ruin, Ch 2 Foundations), 22 conversations / ~160 lines in
  `src/data/dialogue/ch01.json` + `ch02.json`, journal.json (16 entries), characters.json.
- Ch 2 investigation: 3 clickable clue markers → clue scenes → the "Mr H." reveal.
- Scenes/UI: name prompt, DialogueScene (portrait, typewriter, choices, camera focus),
  goal tracker (top-left), Journal panel with chapter filter, fence/clue tooltips, goal and
  journal alerts; herds walk to water.
- Placeholder portraits (5 characters × 4 expressions), clue marker, goal icons.
- validate-data: dialogue links, unreachable nodes, speakers, effects/conditions refs,
  chapter/unlock consistency, clue placement.

**Checks:** `build` ✅ · `test` ✅ (167, incl. 3 full headless playthroughs from the first
line to the end of Chapter 2 with different choices) · `lint` ✅ · `validate-data` ✅ ·
browser: name prompt (typed "Wadsworth", WASD not swallowed) → arrival dialogue with
choices → "The fences" → hover/click the gate (−20) → next day sound, goal ticked, gate
scene started; tracker and alerts showed; 0 console errors.

**Known issues**

- Waterhole A starts dry so it never raises a "drying up" alert (the Ch 1 tutorial covers it).
- The dialogue box covers the toolbar while open (it's modal, so nothing is lost).
- Story text is placeholder quality (D83); open questions D39/D60, D51/D57.
- Hard tile edges; touch untested on a device.

## Phase 8 — Save/load & menu ✅ (2026-10-20)

**Done**

- `core/Save.ts`: versioned save files, migrations (v1 → v2), slot list, latest save,
  graceful errors (empty / damaged / not a save / too new / storage full).
- State v2: `meta.playTimeSeconds`.
- GameSession: play-time tracking, autosave after every day (tick step 12), save snapshot
  that keeps an in-progress conversation.
- MenuScene: Continue (with summary of the latest save), New game (name prompt), Load
  game (autosave + 3 slots with Load / Delete, explanations for unloadable saves).
- Settings: save to slots 1–3 (overwrite confirmation, "Saved" / failure note), Main menu.
- `scenes/launch.ts`: new game, load, return to menu; game scenes restart cleanly.

**Checks:** `build` ✅ · `test` ✅ (177; round trip, exact continuation incl. RNG,
v1 → v2 migration, newer-version refusal, damaged/foreign saves, failed writes,
mid-conversation save) · `lint` ✅ · `validate-data` ✅ · browser: menu → New game → 4 days →
Settings → Save slot 1 → **page reload** → Continue: day, money, RNG, herds, fences, staff,
goals and journal identical; planted "newer version" and damaged saves were listed with
explanations, couldn't be loaded, and could be deleted; loading twice in a row worked; 0
console errors. Test saves were cleared from the preview browser afterwards.

**Known issues**

- Waterhole A starts dry so it never raises a "drying up" alert (the Ch 1 tutorial covers it).
- The dialogue box covers the toolbar while open (it's modal).
- Story text is placeholder quality (D83); open questions D39/D60, D51/D57.
- Hard tile edges; touch untested on a device.

## Phase 9 — Polish for Milestone A ✅ (2026-10-20)

**Done**

- Audio (D95): synthesized music (2 loops, crossfaded by chapter), day/night ambience, 6
  effects, all following the volume settings; silent until the first interaction.
- Encyclopedia (D96): entries for impala, zebra and lion in the Species menu; state v3 with migration.
- Debug overlay (D97), dev builds only.
- Polish (D98): fades, building-finished pop and dust, fence dust, alerts slide in.
- Balance (D99): gentler decline when the reserve is neglected.
- Bug fix: resizing the window after leaving the title screen threw an error (text from a
  stopped scene was still being resized).
- Release (D100): `npm run package:itch`, GitHub Pages workflow, README, version 0.1.0.

**Checks:** `build` ✅ (D101: 1.7 MB, 370 KB gzipped JS) · `test` ✅ (181) · `lint` ✅ ·
`validate-data` ✅ · browser (dev): new game, chapter 2 pump built (goal ticked), fence
repaired (dust emitter created and cleaned up), window resize, 0 console errors · browser
(production build): new game plays, backtick does nothing, no dev handles, 0 console
errors. Test saves cleared afterwards.

**Milestone A is complete. Next: your playtest.** Then Phase 10 per the spec.

**Known issues**

- Waterhole A starts dry so it never raises a "drying up" alert (the Ch 1 tutorial covers it).
- The dialogue box covers the toolbar while open (it's modal).
- Story and encyclopedia text are placeholder quality and unverified (D83, D96).
- Open questions D39/D60, D51/D57/D99.
- Hard tile edges; touch untested on a device.
- No screenshots in the README yet; the repo has no GitHub remote, so Pages hasn't run.

### Milestone A follow-up: readability and art (2026-10-20, user feedback)

- Text is now drawn at full screen resolution in Inter (D102, D103).
- All art redrawn with shading and detail; palette widened to 50 colours (D104).
- Map buildings are multi-tile pictures; the pump ruin disappears under a new pump (D105).
- Fixed: the title-screen animals overlapped the subtitle; a hidden or zero-size window
  could fail to start WebGL.

**Checks:** `build` ✅ · `test` ✅ (184) · `lint` ✅ · `validate-data` ✅ · browser: title,
HUD and dialogue text sharp; HQ, ruin, gate, pump ruin, trees, waterhole (dry and full) and
zebras checked at close zoom; 0 console errors.

### Second playtest follow-up: models, camera, ecosystem (2026-10-20, user feedback)

- All art redrawn at 2× detail as finer pixel art (D106): animals, people, trees, bushes,
  map buildings, player buildings, waterhole, effects and portraits.
- New species: elephant, spotted hyena, white-backed vulture (D107); state v4 migration.
- Zoom out to a bird's-eye view of the whole explorable area; a margin keeps border fences
  away from the screen edge (D108).

**Checks:** `build` ✅ · `test` ✅ (189) · `lint` ✅ · `validate-data` ✅ · `sim:balance` (2
years, with and without player) ✅ · browser: the player's existing v3 save loaded and
gained the new species; bird's-eye view shows HQ + plains in one frame; close-ups of
elephants, lions, vultures, ranger, HQ, ruin, gate and Tendai's portrait; 0 console errors.
The player's save was backed up before testing and restored afterwards.

- Big trees: acacias and marulas are now sprites in scale with the elephants, depth-sorted
  with the animals (D109).

**Known issues**

- Vultures stand on the ground; no circling flight yet.

## Phase 10 — Chapter 3 "Too Many Mouths" ✅ (2026-10-20)

**Done**

- Herd management (D113): cull / relocate / contraception plans per herd, worked by a
  culling team or vet; herd panel buttons and status; births halved by contraception.
- Elephant crop raids (D111), compensation policy, beehive fence (new building, slot and
  art), raid alerts.
- Story: Chapter 3 script (D115), research grant (D112), new story conditions
  (`vegetationAtLeast`, `scoreAtLeast`, `counterAtLeast`, `daysInChapter`,
  `speciesPresent`, `populationAtLeast`) and effects (`counter`, `breakFence`).
- Saves: state v5; older saves gain new map slots and continue the story (D114).

**Checks:** `build` ✅ · `test` ✅ (201, including the playthrough to the end of Chapter 3
with three choice strategies) · `lint` ✅ · `validate-data` ✅ · browser: Chapter 3 intro →
count → first raid → plan and border choices; herd panel with plan buttons; beehive fence
built; 0 console errors. The player's save was backed up and restored.

## Phase 11 — Chapter 4 "Growth" ✅ (2026-10-20)

**Done**

- Tourism (D116): visitors, ticket money, towers and lodge (new building and art),
  walking visitor figures, money tooltip line; state v6.
- New species (D117): giraffe, blue wildebeest, leopard (art, data, unverified facts);
  bringing species in through the Species menu.
- Story: Chapter 4 script (D118) with Victor's lodge deal, the leopard, Kito and the rhino
  print; new conditions `visitorsPerMonth`, `seen`; effect `buildFree`.
- Fixes: clue flag validation (D119), money label overlap (D120).

**Checks:** `build` ✅ · `test` ✅ (208, playthrough to the end of Chapter 4 with three
strategies) · `lint` ✅ · `validate-data` ✅ · browser: Chapter 4 intro, tower and lodge built,
11 visitors on day one with 4 walking figures, giraffe brought in; 0 console errors.

## Phase 12 — Chapter 5 "Pressure" ✅ (2026-10-20)

**Done**

- Drought (D121): pump output, deepening, water trucks; pump panel actions.
- Poaching ring (D122): incidents, catches, camera posts and evidence, poisoned vultures,
  carcass disease; alerts.
- Black rhino in the North; camera post building; story (D124) through Hale's fate.
- Balance (D123) and new story checks (D125).

**Checks:** `build` ✅ · `test` ✅ (214; playthrough start → end of Chapter 5 with three
strategies, about 100 game days, rhinos alive, Trust 36–59) · `lint` ✅ · `validate-data` ✅ ·
browser: Chapter 5 drought, pump panel, poaching alerts, camera post, Hale scene; 0 console
errors on a fresh load. The player's save was backed up and restored.

**Next:** Chapter 6 "Legacy" and the endings (Phase 13), to be planned with you.
