# RESERVE MANAGER — Build Specification for Claude Code

> Working title. Rename freely (search/replace "Reserve Manager").
> This document is the single source of truth. Read it fully before writing code.

---

## 0. HOW YOU (CLAUDE CODE) MUST WORK

Follow these rules for the entire project.

1. **Build one phase at a time** (Section 14). Never start a later phase before the current phase's acceptance criteria pass.
2. **After each phase**: run build, lint, and tests; fix failures; commit with message `phase N: <summary>`; update `docs/PROGRESS.md` (what was done, what is next, known issues); then **stop and give a short summary** and wait for the user's go-ahead.
3. **Everything tunable is data, not code.** No magic numbers in logic. Balance values live in `src/config/balance.json`; content lives in `src/data/*.json`.
4. **Simulation is pure and deterministic.** Sim modules in `src/sim/` take state + seeded RNG and return new state. No Phaser imports, no `Math.random()`, no `Date.now()` inside `sim/`. This makes them unit-testable.
5. **Strict separation**: `sim/` (rules) → `core/GameState` (data) → `scenes/` + `ui/` (presentation). Presentation reads state and sends commands; it never mutates state directly.
6. **No runtime network calls and no AI API calls.** The shipped game is fully static and offline-capable.
7. **Zero cost.** Only free, open-source tools and dependencies. Every asset must be listed in `public/assets/ASSETS.md` with source and license (CC0 / CC-BY / own work). Never include assets with unclear licensing.
8. **Never invent real-world animal facts.** Encyclopedia `facts` fields must be marked `"verified": false` until the user verifies them against a source (e.g. IUCN Red List). Put placeholder text like `"TODO: verify"`.
9. **If the spec is ambiguous or you want to deviate, ask** instead of guessing. Record decisions in `docs/DECISIONS.md`.
10. **Keep files small and readable**: one responsibility per file, TypeScript strict mode, clear names, short comments explaining *why*.

---

## 1. PROJECT OVERVIEW

**Genre:** Pixel-art reserve management sim with a narrative campaign, played in the browser.

**Premise:** The player inherits a run-down wildlife reserve: broken fences, silted waterholes, wrecked animal populations. By repairing infrastructure, hiring staff, managing populations (including difficult culling decisions), and building eco-tourism, the player restores the reserve while a story unfolds about why it collapsed and what conservation costs.

**Pillars**
1. **Story first**: sim systems exist to serve narrative chapters and moral choices.
2. **Chore → automation**: early manual tasks (e.g. clicking to refill a waterhole) are replaced by purchasable infrastructure (pumps, crews, towers).
3. **Honest tradeoffs**: money, wildlife, and community never all go up together without cost.
4. **Readable simulation**: the player can always see *why* a population or resource is changing.

**Target:** Desktop browsers (Chrome, Firefox, Safari, Edge). Mouse-first. Basic touch support is optional later.

**Release plan**
- **Milestone A (vertical slice):** Chapters 1–2, complete and polished.
- **Milestone B (v1.0):** Chapters 1–6, three endings.

---

## 2. TECH STACK

| Concern | Choice |
|---|---|
| Language | TypeScript (strict) |
| Engine | Phaser 3 |
| Bundler | Vite |
| Maps | Tiled (`.tmj` JSON export) |
| Tests | Vitest (unit tests for `sim/` and `story/`) |
| Lint/format | ESLint + Prettier |
| Persistence | `localStorage` (versioned save schema) |
| Hosting target | itch.io (HTML5 zip) and GitHub Pages |
| Package manager | npm |

Build scripts required: `npm run dev`, `npm run build`, `npm run test`, `npm run lint`, `npm run validate-data` (checks all JSON in `src/data` against schemas and cross-references, e.g. every dialogue `next` id exists).

Display: internal resolution **480×270**, integer-scaled to fit window, `pixelArt: true`, no anti-aliasing. Tile size **16×16**.

---

## 3. REPOSITORY STRUCTURE

```
reserve-manager/
├─ CLAUDE.md                 # short: "read docs/SPEC.md first; follow Section 0"
├─ docs/
│  ├─ SPEC.md                # this file
│  ├─ PROGRESS.md            # updated after every phase
│  └─ DECISIONS.md           # deviations and open questions
├─ public/assets/
│  ├─ ASSETS.md              # asset manifest + licenses
│  ├─ tilesets/  sprites/  portraits/  ui/  audio/  maps/
├─ src/
│  ├─ main.ts
│  ├─ config/
│  │   ├─ game.ts            # resolution, tile size, day length
│  │   └─ balance.json       # ALL tunable numbers
│  ├─ core/
│  │   ├─ GameState.ts       # state shape + factory
│  │   ├─ EventBus.ts        # typed pub/sub
│  │   ├─ Clock.ts           # day/season progression, speed control
│  │   ├─ Rng.ts             # seeded RNG (mulberry32)
│  │   ├─ Commands.ts        # player actions (buildX, hireY, setQuota...)
│  │   └─ Save.ts            # serialize/deserialize + migrations
│  ├─ sim/
│  │   ├─ Seasons.ts  Water.ts  Vegetation.ts  Population.ts
│  │   ├─ Culling.ts  Poaching.ts  Tourism.ts  Economy.ts
│  │   ├─ Scores.ts           # ecosystem health, trust, reputation
│  │   └─ Events.ts           # random + scripted event scheduler
│  ├─ story/
│  │   ├─ StoryManager.ts     # chapters, goals, flags, unlocks
│  │   ├─ DialogueRunner.ts   # runs dialogue JSON
│  │   └─ Flags.ts
│  ├─ scenes/
│  │   ├─ BootScene.ts  PreloadScene.ts  MenuScene.ts
│  │   ├─ GameScene.ts        # world view
│  │   ├─ UIScene.ts          # HUD overlay (runs parallel to GameScene)
│  │   ├─ DialogueScene.ts  JournalScene.ts  EncyclopediaScene.ts
│  │   └─ EndingScene.ts
│  ├─ entities/               # AnimalGroupSprite, StaffSprite, VisitorSprite, BuildingSprite
│  ├─ ui/                     # reusable UI components (Button, Panel, Tooltip, Meter)
│  └─ data/
│      ├─ species.json  buildings.json  staff.json
│      ├─ events.json   chapters.json   journal.json
│      └─ dialogue/ch01.json ch02.json ...
├─ tests/                     # mirrors src/sim and src/story
└─ tools/
   ├─ generate-placeholders.ts  # makes placeholder tiles/sprites (see Section 12)
   └─ validate-data.ts
```

---

## 4. ARCHITECTURE

- **Single `GameState` object** (plain serializable data). Contains: clock, resources, zones, waterholes, species populations per zone, buildings, staff, flags, chapter progress, journal entries, encyclopedia unlocks, settings.
- **Game loop**: `Clock` advances in-game time. At each **day tick**, run sim in this fixed order:
  1. Seasons → 2. Water → 3. Vegetation → 4. Population (growth, predation, starvation) → 5. Culling/relocation actions → 6. Poaching → 7. Tourism → 8. Economy (income, upkeep) → 9. Scores → 10. Events → 11. Story goal checks → 12. Autosave.
- **EventBus** emits typed events (`dayTick`, `populationCrash`, `buildingCompleted`, `chapterGoalMet`, `dialogueRequested`...). UI and story subscribe; sim modules return event lists rather than emitting directly.
- **Commands** are the only way the player changes state (e.g. `Commands.refillWaterhole(id)`), each validated (enough money? valid target?) and returning success/failure with a reason string for UI feedback.
- **Data-driven content**: species, buildings, staff, events, dialogue all loaded from JSON; code contains no content.
- **Determinism**: one seeded RNG stored in state; saves restore it.

### Time
- 1 in-game day = **120 real seconds at 1× speed** (config). Speeds: pause, 1×, 2×, 4×.
- 1 season = **30 days**; year = wet season + dry season (60 days). Config-driven.
- Visual time-of-day overlay (dawn, day, dusk, night) cosmetic only.

---

## 5. MAP SPECIFICATION

**Tiled project**: `public/assets/maps/reserve.tmj`. Tile 16×16. Full map **120×80 tiles**.

**Layers (names must match exactly):**
`ground`, `vegetation_deco`, `water`, `objects`, `collision` (boolean tiles), plus Tiled **object layers**: `zones` (rectangles with property `zoneId`), `waterholes` (points with `waterholeId`), `spawns` (points with `kind` = animal/visitor/staff), `build_slots` (rectangles with `slotType` = tower/post/pump/lodge), `fence_segments` (lines with `segmentId`, `zoneId`), `poacher_entries` (points).

**Zones** (each has `zoneId`, area in tiles computed from the rectangle, and starts locked or unlocked):

| zoneId | Name | Approx. tiles | Features | Unlocked |
|---|---|---|---|---|
| `hq` | HQ & Gate | 20×15 | Ranger post, office, gate, parking | Ch 1 |
| `plains` | Central Plains | 40×30 | Open grass, Waterhole A (dry) | Ch 1 |
| `river` | River & Wetland | 30×25 | Permanent river, pump site, Waterhole B | Ch 2 |
| `woodland` | Woodland | 35×30 | Trees, shade, poacher hiding spots | Ch 3 |
| `east_border` | Eastern Border | 20×40 | Village edge, crop fields, fence conflict | Ch 3 |
| `outcrop` | Rocky Outcrop | 25×20 | Tower site, leopard habitat | Ch 4 |
| `north` | Northern Reach | 40×30 | Remote wilderness, rhino return | Ch 5 |

**Fog / lock**: locked zones are visually dimmed and fenced. Unlocking a zone requires repairing its `fence_segments` and meeting the chapter goal.

**Camera**: drag to pan (or edge scroll / WASD), mouse wheel zoom between 2× and 4× integer steps, clamped to map bounds. Zone names show on hover.

**Rendering performance rule**: animal populations are *numbers* in state. The world draws at most `balance.render.maxAnimalSpritesPerZone` (default 12) group sprites per zone/species; each sprite represents a count. Sprites wander using simple steering (wander, drift toward water when thirsty, flee from visitors/vehicles). No per-animal simulation.

---

## 6. SIMULATION SPECIFICATION

All numbers below are **starting values** to put in `balance.json`; expect tuning.

### 6.1 Water
Each waterhole: `level` (0–100), `type` (`natural` | `pumped`), `pumpState` (`none` | `working` | `broken`).
- **Daily change** = `-decay` + `pumpRefill`, clamped 0–100.
  - `decay` base 4/day; dry season ×2; wet season ×0.5 and add `+rain` of 3/day.
  - `pumpRefill` = 6/day if pump working (solar pump: 8/day and never needs fuel); 0 otherwise.
- **Manual refill command** (Chapter 1–2 chore): each click or hold-tick adds **+5** (hold-to-pump gives +5 per 0.3 s), costs nothing, capped at 100. Show a small bucket/pump animation.
- **Visual states**: `clear` > 60, `muddy` 30–60, `drying` 10–30, `dry` < 10. Each state has its own tile/sprite and tooltip.
- **Water availability** for a zone = true if any waterhole within `balance.water.range` (default 20 tiles) has level ≥ 30.
- **Pump** can break through events (Ch 5 drought lowers water table → pump output halved until deepened).

### 6.2 Vegetation
Per zone `vegetation` 0–100.
- `regrowth = regrowRate × seasonMult × (100 − V)/100` (regrowRate 1.5/day; wet ×1.5; dry ×0.4)
- `grazing = Σ_species (N × grazeRate) / zoneTiles` (grazers only)
- `V_next = clamp(V + regrowth − grazing, 0, 100)`
- Below `V < 25`, the zone is **degraded**: visual brown overlay, lower carrying capacity, UI warning.

### 6.3 Population (per species per zone)
Carrying capacity:
```
K_herbivore = zoneTiles × habitatDensity × (V/100) × waterFactor
waterFactor = 1.0 if water available else 0.3
K_predator  = Σ(preyN × predationEfficiency)     // limited by available prey
```
Daily update (stochastic rounding using seeded RNG):
```
growth   = r × N × (1 − N/K)           // if N > K, growth is negative (die-off)
overshoot_die = d × max(0, N − K)       // extra starvation, d = 0.05
predation_loss (prey) = Σ_predators predatorN × killsPerDay(predator,prey)
N_next = N + growth − overshoot_die − predation_loss − culled − poached + relocatedIn − relocatedOut
```
- Species below `minViable` in a zone: **no growth** (Allee effect) and flagged "critical".
- Migration: optional later feature (not in v1).
- Provide a **"why" explanation string** for every zone/species each day (e.g. "Impala: −8 starvation, −3 lions, +2 births") shown in the info panel.

### 6.4 Culling & alternatives (the moral core)
Per species per zone, player sets a **monthly quota** or approves proposals from the ecologist.
| Method | Cost per animal | Effect |
|---|---|---|
| Cull (needs hunters/culling team) | low | Immediate N reduction; Community Trust −, Public Image − (scaled by species charisma), Ecosystem Health + if N > K |
| Relocate (needs vet + truck) | high | Reduces N, adds to another reserve (flag for story) ; Trust +, Image + |
| Contraception program | medium, ongoing | Reduces r by 50% for species; slow effect |
| Do nothing | free | Overshoot → starvation, vegetation collapse |

Every culling decision writes a journal entry and may set story flags (e.g. `culled_impala_ch3`).

### 6.5 Poaching
- `poachingPressure` per zone (0–100), set by zone and chapter events.
- Daily chance = `pressure/100 × baseChance × (1 − rangerCoverage)`.
- `rangerCoverage` = min(0.9, rangers_in_zone × patrolStrength). A ranger post doubles patrol radius.
- A successful poaching incident kills 1–3 animals of high `poachingValue` species and triggers an event; a **caught** poacher can trigger Kito storyline events.

### 6.6 Tourism
```
attraction = Σ_species (sightingValue × min(1, N / targetN)) + rareBonus
infra      = 1 + 0.25 × towers + 0.1 × roadsGrade + 0.15 × lodges
visitors/day = floor(attraction × infra × (reputation/100) × seasonMult)
```
- Revenue/day = `visitors × ticketPrice` (start 10) + tower bonus (+5 per visitor sighting-bonus).
- **Disturbance**: if `visitors > capacity(zone)`, animal sprites flee and `disturbance` rises, lowering growth of sensitive species and raising a "Public Image" warning.
- Visitors appear as small sprites walking the road to towers.

### 6.7 Economy
- Start money: **500**.
- Costs (placeholders): fence segment repair 20; ranger post 300; borehole pump 400; solar pump upgrade 600; observation tower 800; road upgrade 250 per tier.
- Staff wages per day: ranger 30, fence crew 25, tracker 35, vet 50, culling team 60.
- Daily net = income − wages − building upkeep (5% of build cost / 30 per day).
- **Soft fail, not hard fail**: if money < 0, player enters **Debt** state (wages unpaid → staff morale drops, rangers quit after 3 unpaid days). Game over only if the reserve is completely depleted per Chapter rules (see Section 9).

### 6.8 Scores (0–100)
- **Ecosystem Health** = `0.4×avgVegetation + 0.4×biodiversity% + 0.2×waterAvailability%`, where biodiversity% = species at/above `minViable` ÷ total species in release.
- **Community Trust**: changes via culling choices, crop-raid compensation, jobs created, story choices.
- **Reputation**: slow-moving average of tourist satisfaction, species sightings, news events.
- All three are shown in HUD with tooltips explaining recent changes.

### 6.9 Events
Defined in `events.json`:
```json
{
  "id": "snared_animal",
  "type": "timed",           // timed | passive | story
  "trigger": { "chapter": [2,3,4,5], "weight": 1.0, "cooldownDays": 20 },
  "durationDays": 2,
  "text": "A ranger found a snared zebra near the river.",
  "choices": [
    { "label": "Send ranger to rescue", "cost": 0, "effects": [{"op":"trust","value":2}] },
    { "label": "Ignore", "effects": [{"op":"population","species":"zebra","zone":"river","value":-1}] }
  ]
}
```
Event effects use a small fixed **effect vocabulary** (`money`, `trust`, `reputation`, `population`, `vegetation`, `setFlag`, `startDialogue`, `unlockZone`, `spawnEvent`). Implement it once as an interpreter, never ad hoc.

---

## 7. GAMEPLAY SYSTEMS & UI

### 7.1 Chore → automation ladder
Implement as data in `buildings.json`/`staff.json` so more ladders can be added later.

| Problem | Manual action | Permanent fix | Further upgrade |
|---|---|---|---|
| Waterhole dries | Click/hold to refill | Borehole pump | Solar pump |
| Fence broken | Click segment to patch (20 money, takes time) | Hire fence crew (auto-repairs) | Better fence material |
| Poaching | Player-assigned patrol | Hire rangers + ranger post | Camera network (Ch 5) |
| Invasive plants | Clear plots by click | Hire clearing team | — |
| Low tourism | Player gives guided tour (mini-event) | Observation tower | Lodge |

Rules: manual tasks must be **short**, visible, forgiving (slow decay with warning states), and only dominate the first ~15 minutes of play.

### 7.2 Building
Click build button → pick building → place on valid `build_slots` (green highlight). Construction takes N in-game days with a progress bar. Cancel refunds 50%.

### 7.3 Staff
Hire from a staff panel. Each staff member has: role, wage, assigned zone, morale. Assigning a ranger to a zone sets its `rangerCoverage`. Staff appear as sprites patrolling.

### 7.4 HUD (UIScene)
- Top bar: money (with daily net), date/season icon, speed controls, Ecosystem Health / Trust / Reputation meters.
- Bottom/side panel: context panel for selected zone / waterhole / building / species.
- Buttons: Build, Staff, Species, Journal, Settings, Pause.
- **Alerts feed** on the right: color-coded (info/warning/critical). Clicking an alert pans the camera to the cause.
- **Tooltips everywhere** that explain numbers ("why").

### 7.5 Journal
Ranger's journal: auto-added entries on story beats and notable events (templated text in `journal.json`), scrollable, with filter by chapter.

### 7.6 Encyclopedia
One entry per species, unlocked on first sighting. Shows icon, diet, status, population in reserve, and `facts` (marked unverified until user confirms).

### 7.7 Settings & meta
Music/SFX volume, game speed default, colorblind-safe palette toggle (alternate meter colors + icons), text size, reset save. Autosave each day; manual save slots (3).

---

## 8. CHARACTERS

Portraits are 48×48 pixel art (4 expressions each: neutral, happy, worried, angry). Dialogue box shows portrait + name + text.

| ID | Name (placeholder) | Role | Arc |
|---|---|---|---|
| `player` | Player (named at start) | Grandchild of the reserve's founder | Learns why it fell; defines the reserve's future |
| `tendai` | Old Tendai | Head ranger who stayed through the decline | Skeptical → mentor; carries knowledge of the old pump and old mistakes |
| `amara` | Dr. Amara Okafor | Ecologist | Data-driven; proposes culling; clashes with Tendai and Wanjiru |
| `wanjiru` | Mama Wanjiru | Village leader on the eastern border | Wants fair deal for community; becomes ally or opponent based on trust |
| `victor` | Victor Hale | Tour investor | Offers funds, pushes shortcuts; antagonist in Ch 5 |
| `kito` | Kito | Former poacher, informant | Reveals poverty and a trafficking ring behind poaching |

Each character has a **relationship value** (−100…100) tracked in state and affecting available dialogue/endings.

---

## 9. STORY STRUCTURE

### 9.1 Dialogue format
`src/data/dialogue/chXX.json`:
```json
{
  "id": "ch01_arrival",
  "nodes": {
    "start": {
      "speaker": "tendai", "portrait": "worried",
      "text": "So. You're the founder's grandchild. Mind the gate—it's been rotten for years.",
      "next": "n2"
    },
    "n2": {
      "speaker": "tendai",
      "text": "Do you want to see the waterhole first, or the fences?",
      "choices": [
        { "text": "The waterhole.", "effects": [{"op":"setFlag","flag":"ch1_water_first"}], "next": "water_branch" },
        { "text": "The fences.",   "effects": [{"op":"setFlag","flag":"ch1_fence_first"}], "next": "fence_branch" }
      ]
    }
  }
}
```
Supports: `conditions` (flag, relationship ≥ x, money ≥ y), `effects` (same vocabulary as events), `next: null` to end. `validate-data` must catch dangling references.

### 9.2 Chapters (in `chapters.json`)
Each chapter has: `id`, `title`, `introDialogue`, `goals` (list of measurable conditions), `unlocks` (zones, buildings, staff), `scriptedEvents`, `completionDialogue`.

| # | Title | Setup | Goals (all must be met) | Unlocks |
|---|---|---|---|---|
| 1 | **Ruin** | Arrive; meet Tendai; survey damage. Tutorial: fix gate, hand-refill Waterhole A. | Repair gate; keep Waterhole A ≥ 30 for 3 days; first animals drink | River zone teaser; ranger hire |
| 2 | **Foundations** | Discover old pump was sabotaged (mini-investigation: 3 clue objects). Build pump. | Working pump; hire 1 ranger; positive daily net 5 days in a row | River zone, ranger post, fence crew |
| 3 | **Too Many Mouths** | Impala boom strips vegetation. Amara proposes culling; Wanjiru raises crop-raiding. | Choose and execute a plan; vegetation back above 50 in plains; Trust ≥ 40 | Woodland, east border, culling team, vet |
| 4 | **Growth** | Build towers; tourism starts; rhino sighting rumor. | Build tower; reach target visitors/month; 6 species present | Outcrop, lodge, relocation |
| 5 | **Pressure** | Drought; Victor's buyout; poaching ring; Kito's confession. | Survive drought with all pumps functioning; resolve Victor and poaching storylines | North zone, camera network |
| 6 | **Legacy** | Final decisions; time-skip epilogue. | Choose ending path (see below) | — |

### 9.3 Endings (computed from flags + scores)
1. **Thriving Wilderness**: high Ecosystem Health + high Trust; refused Victor.
2. **Profitable but Compromised**: high money/Reputation; accepted Victor's deal; Ecosystem Health mid, Trust low.
3. **Fortress Reserve**: high Ecosystem Health, low Trust (community isolated by heavy fencing/culling).
Fallback ending if scores are mixed: the one with the closest match; show an epilogue slide per major decision.

### 9.4 Full scripting required for Milestone A (Chapters 1 & 2)
Write complete dialogue JSON for Ch 1 and 2 including: arrival, gate repair tutorial, waterhole tutorial (explain refill click), first animal arrival, Tendai backstory, pump discovery, 3-clue investigation, pump installation, first ranger hire, chapter completion scenes. Use placeholder-quality but natural writing; the user will rewrite lines later, so keep text in JSON only. Target ~150–250 dialogue lines across both chapters.

---

## 10. SPECIES (starter data, in `species.json`)

Milestone A: **impala, zebra, lion**. v1.0 adds: **wildebeest, giraffe, elephant, leopard, rhino**.

Schema:
```json
{
  "id": "impala",
  "name": "Impala",
  "diet": "grazer",                 // grazer | browser | predator
  "r": 0.03,                        // daily growth rate
  "habitatDensity": 0.12,           // animals per tile at full vegetation
  "grazeRate": 0.02,
  "minViable": 6,
  "sightingValue": 1.0,
  "poachingValue": 0.2,
  "charisma": 0.4,                  // affects public image on culling
  "predators": ["lion"],
  "prey": [],
  "startPopulation": { "plains": 80 },
  "targetN": 40,
  "spriteKey": "impala",
  "facts": [{ "text": "TODO: verify", "verified": false }]
}
```
Pick sensible values for the others by following relative scale (large herbivores lower r, lower density, higher sightingValue; rhino very high poachingValue and rareBonus).

---

## 11. AUDIO

- Placeholder SFX generated with jsfxr or free CC0 sources (click, build, coin, alert, water splash).
- Ambient loops: day savanna, night insects (CC0 from Freesound; verify licenses).
- Music: 2 calm loops (CC0 or own); crossfade by chapter tension. Make audio optional and muted by default until the first user interaction (browser autoplay policy).
- List everything in `ASSETS.md`.

---

## 12. ART PIPELINE

1. **Phase 1 deliverable**: `tools/generate-placeholders.ts` produces labeled colored 16×16 tiles and 16×16/32×32 sprites into `public/assets/` so the game is fully playable with zero downloaded art.
2. All asset use goes through **texture keys in a manifest** (`assets.json`), so replacing placeholders with real pixel art needs no code changes.
3. Final art spec for the user (artist): 16×16 tiles; limited palette (≤32 colors, saved as `palette.gpl`); animals 16×16 (small) or 32×32 (large) with 2–4 frame walk cycles; portraits 48×48; UI 9-slice panels. Provide `docs/ART_GUIDE.md` listing every required sprite with dimensions and frame counts.
4. Tools: Tiled (maps), LibreSprite/Piskel/Krita (sprites).

---

## 13. TESTING & DEBUG

**Unit tests (Vitest)** — required for:
- Population: growth toward K, die-off above K, Allee effect, predation, determinism with same seed.
- Water/vegetation daily updates and seasonal multipliers.
- Economy and tourism formulas.
- Culling/relocation effects on scores.
- DialogueRunner: branching, conditions, effects, dangling reference detection.
- Save/load round-trip and migration from older version.

**Balance simulation script** (`npm run sim:balance`): runs N headless years with a scripted "reasonable player" and prints population/money curves to CSV. Used to tune `balance.json`.

**Debug overlay** (toggle with backtick key): FPS, day, RNG seed, force-advance day, add money, set flag, jump to chapter, trigger event, spawn animals. Must be stripped or disabled in production build.

---

## 14. BUILD PLAN — PHASES & ACCEPTANCE CRITERIA

Complete in order. Stop after each phase.

**Phase 0 — Scaffolding**
Vite + Phaser + TS strict + ESLint/Prettier + Vitest; folder structure; `CLAUDE.md`, `PROGRESS.md`, `DECISIONS.md`; boot scene shows "Reserve Manager" text.
*Accept:* `dev`, `build`, `test`, `lint` all pass; empty game runs at 480×270 integer-scaled.

**Phase 1 — Placeholders & map**
Placeholder generator; Tiled map with all layers/zones; GameScene loads map; camera pan/zoom/clamp; zone hover labels.
*Accept:* full map renders; zones identifiable; 60 fps.

**Phase 2 — Core state, clock, seasons**
GameState, EventBus, Rng, Clock, Seasons; HUD shows date/season and speed controls.
*Accept:* days advance at set speed; pause/2×/4× work; season changes visually; tests pass.

**Phase 3 — Water & chore mechanic**
Waterhole sim, visual states, click/hold refill, pump building stub (data only).
*Accept:* Waterhole A decays, refill works, tooltip explains decay; unit tests for Water.

**Phase 4 — Vegetation & populations**
Vegetation, population model, predation, group sprites wandering, "why" explanation strings, zone info panel.
*Accept:* running with no player input produces plausible curves (no instant extinction/explosion within 1 in-game year at default balance); tests pass including determinism.

**Phase 5 — Economy, building, staff**
Money, costs, build slots + construction, hire/assign staff, ranger coverage, tower stub, debt state.
*Accept:* can build pump and ranger post, hire ranger, see net income; unit tests for Economy.

**Phase 6 — UI pass**
Full HUD, context panels, alerts feed, tooltips, settings; keyboard shortcuts; colorblind toggle.
*Accept:* everything reachable by mouse; no overlapping UI at 480×270 scaled.

**Phase 7 — Dialogue & Chapters 1–2**
DialogueRunner, DialogueScene, StoryManager, flags, goals, chapters.json, full Ch 1 & 2 content, journal, clue investigation.
*Accept:* a new player can play from start to end of Ch 2 with no dead ends; `validate-data` passes.

**Phase 8 — Save/load & menu**
Autosave, 3 slots, migrations, menu scene, new game/continue.
*Accept:* reload restores exact state; version mismatch handled gracefully.

**Phase 9 — Polish for Milestone A**
Audio, particle/animation polish, encyclopedia (3 species), balance pass, performance pass, bug fixes, itch.io build zip, GitHub Pages deploy workflow, README with screenshots placeholder.
*Accept:* **Milestone A done.** Playtest-ready, 0 console errors, loads in < 5 s on a normal connection.

*— user playtests and gives feedback; adjust before continuing —*

**Phase 10 — Ch 3 + culling system** (Culling, relocation, contraception, quotas, Amara/Wanjiru dialogue, east border zone, crop-raid events).
**Phase 11 — Ch 4 + tourism** (Tourism sim, visitors, towers, lodge, outcrop, 5 species).
**Phase 12 — Ch 5 + pressure systems** (Drought, poaching, Victor, Kito, camera network).
**Phase 13 — Ch 6 + endings** (Ending logic, epilogue slides, credits).
**Phase 14 — Final polish & release** (Balance, accessibility, final art swap, trailer GIF capture notes, release checklist below).

---

## 15. RELEASE CHECKLIST (v1.0)

- [ ] All chapters completable; all 3 endings reachable (test via debug jump)
- [ ] `ASSETS.md` complete; all licenses compatible with free release
- [ ] Encyclopedia facts verified by the user (no `verified:false` left)
- [ ] No console errors; no debug overlay in production build
- [ ] Save migration tested from Milestone A save
- [ ] Tested on Chrome, Firefox, Safari at 3 window sizes
- [ ] itch.io page assets: cover (630×500), screenshots, GIF, description (user writes)
- [ ] Optional: custom domain pointing at GitHub Pages build

---

## 16. DEFAULTS & OPEN DECISIONS

Defaults used unless the user changes them (log changes in `DECISIONS.md`):
- Setting: African savanna; placeholder character names.
- Tone: serious but warm, light humor in Tendai's dialogue.
- Solo developer with AI assistance; the user rewrites dialogue and draws final art.
- Language: English only for v1.0 (keep all text in JSON to allow translation later).

Open questions to ask the user at Phase 0 if not already answered: final game title, setting, whether to name the player at start, and preferred control scheme for touch (if any).
