# Decisions & open questions

Deviations from `docs/SPEC.md` and answers to its open questions. Newest last.

## Phase 0 (2026-10-19)

| #   | Topic                     | Decision                                                                                                                                                                                                                                   | Source                                                 |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| D1  | Game title                | **Reserve Manager** (replaces working title "Wildwatch Reserve"; replaced throughout `docs/SPEC.md`).                                                                                                                                      | User                                                   |
| D2  | Project folder            | `~/reserve-manager`. `~/wildwatch-reserve` already held an older, unrelated React version of the game (not under git); it is left untouched.                                                                                               | User (folder name chosen by Claude to match the title) |
| D3  | Player naming             | The player types a name on New Game; dialogue uses it.                                                                                                                                                                                     | User                                                   |
| D4  | Touch controls            | Basic touch: tap to select, one-finger drag to pan, pinch to zoom. Implemented with the camera in Phase 1. Mouse stays primary.                                                                                                            | User                                                   |
| D5  | Setting / tone / language | Spec defaults kept: African savanna, placeholder character names, serious-but-warm tone, English only.                                                                                                                                     | Spec §16 default                                       |
| D6  | Integer scaling           | Phaser `Scale.NONE` + manual `setZoom(floor(fit))` on resize, centered. Phaser's `FIT` mode scales fractionally and blurs pixel art. Windows smaller than 480×270 still render at 1× (cropped by the browser) rather than scaling below 1. | Claude                                                 |
| D7  | Tooling versions          | Latest stable at setup: Phaser 3.90, Vite 8, Vitest 5, TypeScript 6, ESLint 10 (flat config) + typescript-eslint strict, Prettier 3. `tsx` runs Node scripts in `tools/`.                                                                  | Claude                                                 |
| D8  | Enforcing sim purity      | ESLint blocks `phaser` imports, `Math.random`, `Date.now` and `new Date()` inside `src/sim/` (spec §0 rule 4).                                                                                                                             | Claude                                                 |
| D9  | Lint script               | `npm run lint` = `eslint .` **and** `prettier --check .`, so formatting drift fails the lint step. `npm run format` fixes it.                                                                                                              | Claude                                                 |
| D10 | Bundle size warning       | Vite's chunk warning limit raised to 1600 kB because Phaser alone is ~1.2 MB minified. Revisit in Phase 9 (load time < 5 s target).                                                                                                        | Claude                                                 |

## Open questions

- None blocking Phase 1.
