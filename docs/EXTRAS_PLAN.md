# Plan: journal revamp and Easter eggs

Draft for your approval (2026-10-21). Nothing here is built yet. Decisions you need to make
are listed at the end. Suggested build order: the journal first, because several Easter
eggs live inside it.

## Part 1: Journal revamp

**Today:** the journal (J) is a scrolling list in the right-hand side panel: one short text
entry per story beat, newest first, filterable by chapter. It only records the story.

**Proposal:** turn it into Ruth's old field journal, the one you inherited with the reserve.
It opens as a book over the map, with two pages per spread, page-turn sound and tabs on the
side.

| Tab                | What it shows                                                                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Diary**          | The story entries you have now, written up as diary pages: date ("Year 1, dry season, day 14"), chapter headings, and a small portrait or animal sketch next to each entry. New entries are marked until read.                                          |
| **Field notes**    | One page per species you've seen: the sprite, when and where you first saw it, current and highest count, diet, and the (unverified) facts from the encyclopedia. This replaces the encyclopedia page in the Species menu, which keeps its Show button. |
| **Records**        | The reserve in numbers, kept up automatically: highest ecosystem health, most visitors in a month, animals born, poachers caught, rhinos alive, days survived, money earned, and so on. Each record notes the day it was set.                           |
| **Decisions**      | The big choices you've made so far (impala plan, village, Victor, Kito, Hale), each with a line about how it played out. After Chapter 6 it matches the epilogue.                                                                                       |
| **Ruth's letters** | Hidden letters from Ruth found around the reserve (see Easter egg 1). Locked pages until found.                                                                                                                                                         |

**Smaller improvements**

- More automatic diary entries for notable moments, not just story beats: first calf of
  a returned species, first poacher caught, a record broken, the first rains after the
  drought.
- Clicking an entry about a place pans the camera there (like alerts do).
- The journal alert opens the journal at the new page.
- Saves: new records and "read" markers mean a state upgrade (v7); old saves keep their
  entries and start records from today.

## Part 2: Easter eggs

Ten small secrets, roughly from biggest to smallest. A "Secrets found 3/10" line sits at the
back of the journal (no hints about what they are).

1. **Ruth's letters.** Five letters hidden at odd spots on the map: the gate pillar, the
   old fig tree in the woodland, under the fallen roof sheet at the ruined ranger post, the
   dry riverbed, and the top of the rocky outcrop. Each is a faint glint you only notice
   zoomed in. They tell Ruth's side of the story: meeting Tendai, the first rhino, turning
   Hale away, the pump dying. Finding all five unlocks a last letter addressed to her
   grandchild.
2. **The honey badger.** Very rarely (about once a season, Chapter 3+), a honey badger
   trots across the woodland. Click it in time and it gets a secret Field notes page. It
   isn't part of the simulation; it's a visitor.
3. **Name reactions.** Naming yourself "Ruth", "Tendai", "Victor" or "Hale" gets a special
   reaction in the first conversation (Tendai is suspicious of a "Victor", for example).
4. **The lazy lion.** Click the same lion ten times quickly and it rolls onto its back for a
   moment ("The lion is unimpressed.").
5. **Party mode.** The Konami code (↑ ↑ ↓ ↓ ← → ← → B A) makes the animals hop for ten seconds.
6. **Shooting stars.** At night, fully zoomed in over the outcrop, a shooting star
   sometimes crosses the sky.
7. **Title screen parade.** Click the three animals on the title screen and they walk off
   the screen and back.
8. **Tendai's tea.** After Kito's tea joke, hovering the HQ late at night shows "Tendai is
   brewing something terrible."
9. **Ruth's hat.** After the ending, rangers on the map wear Ruth's wide-brimmed hat.
10. **The 1,000th visitor.** Your 1,000th visitor gets a little celebration (alert, coins
    sound, a diary entry).

## Size estimate

- Journal: one phase (new book screen, five tabs, records tracking, save upgrade).
- Easter eggs: one smaller phase (letters and badger art, the rest is mostly small code).

## Decisions

1. **Book screen:** should the journal open as a full book over the map (proposal), or stay
   in the side panel with tabs added?
2. **Field notes:** should the journal's Field notes replace the encyclopedia page in the
   Species menu (proposal), or should both exist?
3. **Hidden or hinted:** should Easter eggs stay completely hidden with only the "x/10"
   counter (proposal), or should the journal give vague hints, e.g. "Ruth hid something by
   the gate"?
4. **Any to drop or add?** Is anything on the list not your style (e.g. party mode or the
   Konami code), or do you have your own ideas to add?
5. **Ruth's letters:** like the story, I'd write them as placeholder text you can rewrite.
   OK?
