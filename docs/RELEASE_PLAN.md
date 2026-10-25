# Plan: Phase 14, release polish (v1.0)

Draft for approval, 2026-10-22. The story, journal and Easter eggs are done. This phase
makes the game ready to share: balanced, accessible, stable in every browser, and
packaged with a store page.

Build order: 14c balance → 14d accessibility → 14e stability → 14f release package. Each
step ends with the usual checks and a commit.

## 14c: Balance and the open questions

- Run `sim:balance` and the full playthrough with all three choice strategies, and add a
  fourth "careless player" who ignores water and fences, to check that failure is slow and
  recoverable, never sudden.
- Tune the numbers that are still guesses (D51, D57, D99): predation, how fast a neglected
  herd declines, and money across all six chapters. Targets: no chapter makes you wait with
  nothing to do; money is tight in Chapters 1–3 and comfortable from Chapter 5.
- Close the open questions with these defaults (decision 6 below):
  - **D39 / D60:** the solar pump unlocks in Chapter 3; both pumps take 3 days to build.
    The tracker already unlocks in Chapter 3.
  - **D107:** already answered by the poaching phase (D122): with too few vultures,
    carcasses spread disease. I'll close it.
- Remove "TODO: verify" and "(unverified)" from the game once the facts are settled
  (decision 1).

## 14d: Accessibility

- **Colour-blind mode** covers the new screens too: journal, epilogue, alerts, secrets note.
- **Large text** works in the journal (pages re-flow), dialogue, epilogue and tooltips.
- **Reduce motion** setting: no camera pans or shakes, instant page turns, no badger dash.
- **Keyboard only:** everything reachable without a mouse, including build placement and
  journal links. Visible focus outline on buttons.
- **Readable tooltips:** never off-screen, and they stay up while the mouse moves inside them.
- Contrast check of all text against its background (WCAG AA, 4.5:1).

## 14e: Stability and performance

- **Browsers:** Chrome, Firefox and Safari, at 1280×720, 1920×1080 and a laptop Retina
  window (see decision 4).
- **Old saves:** load a real save from each earlier version (Milestone A, v2 to v6) through
  the migrations, and keep them as test fixtures.
- **Endings:** all three reachable from a clean game via the debug jump, as the checklist
  asks; the automated playthrough already covers them.
- **Crash screen:** if something breaks, show "Something went wrong. Your last autosave is
  safe" with a Reload button, instead of a frozen screen.
- **Load time:** under 5 s on a normal connection. The game is 2 MB now; Phaser can load
  separately and be cached so the first screen shows sooner.
- **Production build:** confirm the debug overlay and `__session` / `__game` handles are
  gone, and the console is clean.
- Small fix noticed along the way: pale (albino) animals stay pixel-sharp when you're zoomed
  far out, so they can flicker while everything else is smoothed.

## 14f: Release package

- Version 1.0.0, a `CHANGELOG.md`, credits checked (fonts, any sounds), `ASSETS.md` complete
  with licences.
- **Store assets:** cover image 630×500, 5 screenshots, and a 10–15 s GIF of the reserve
  coming back to life. I'll capture the screenshots and the GIF from the game, and write
  capture notes so you can redo them later.
- **Store text:** I draft the description and tags; you rewrite it in your own words (the
  spec says you write it).
- **Publishing:** see decision 3. Nothing goes public without your go-ahead.
- README with real screenshots in place of the placeholder.

## Decisions (answered 2026-10-25)

1. **Animal facts:** not needed for v1.0. The facts stay in the data, but the game hides any
   fact that isn't verified, so nothing unchecked reaches players.
2. **Art:** the current art is final for v1.0. More detail comes in a later update; the art
   guide gets a list of sprites worth improving.
3. **Publishing:** itch.io, and the game as its own website on GitHub Pages (needs a
   GitHub repository, set up together when we get there).
4. **Firefox and Safari:** I install Playwright's test browsers (about 300 MB) and check
   both myself with screenshots at three window sizes.
5. **Story text:** stays as it is.
6. **Pumps:** both take 3 days to build; the solar pump unlocks in Chapter 3 (D134).
