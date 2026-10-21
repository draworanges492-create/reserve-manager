# Plan: journal revamp and Easter eggs

Approved 2026-10-21 with the decisions at the end. Build order: the journal, then the Easter eggs.

## Part 1: Journal revamp

**Today:** the journal (J) is a scrolling list in the right-hand side panel: one short text
entry per story beat, newest first, filterable by chapter. It only records the story.

**Proposal:** turn it into Ruth's old field journal, the one you inherited with the reserve.
It opens as a book over the map, with two pages per spread, page-turn sound and tabs on the
side.

| Tab             | What it shows                                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Diary**       | The story entries you have now, written up as diary pages: date ("Year 1, dry season, day 14"), chapter headings, and a small portrait or animal sketch next to each entry. New entries are marked until read.                                          |
| **Field notes** | One page per species you've seen: the sprite, when and where you first saw it, current and highest count, diet, and the (unverified) facts from the encyclopedia. This replaces the encyclopedia page in the Species menu, which keeps its Show button. |
| **Records**     | The reserve in numbers, kept up automatically: highest ecosystem health, most visitors in a month, animals born, poachers caught, rhinos alive, days survived, money earned, and so on. Each record notes the day it was set.                           |
| **Decisions**   | The big choices you've made so far (impala plan, village, Victor, Kito, Hale), each with a line about how it played out. After Chapter 6 it matches the epilogue.                                                                                       |

**Smaller improvements**

- More automatic diary entries for notable moments, not just story beats: first calf of
  a returned species, first poacher caught, a record broken, the first rains after the
  drought.
- Clicking an entry about a place pans the camera there (like alerts do).
- The journal alert opens the journal at the new page.
- Saves: new records and "read" markers mean a state upgrade (v7); old saves keep their
  entries and start records from today.

## Part 2: Easter eggs

Nine small secrets, fully hidden: only a "Secrets found 3/9" line at the back of the
journal. Secrets are remembered across all your saves, like achievements.

1. **Albino animals.** Very rarely, an albino animal is born into a herd: a pale impala,
   a cream-coloured giraffe, a blonde zebra. It stays for a few weeks, then moves on. Click
   it to record it in your Field notes.
2. **The honey badger.** About once a season (Chapter 3+), a honey badger trots across the
   woodland. Click it in time and it gets a secret Field notes page. It's a visitor, not
   part of the simulation.
3. **Name reactions.** Naming yourself "Ruth", "Tendai", "Victor" or "Hale" gets a special
   reaction in the first conversation.
4. **The lazy lion.** Click the same lion ten times quickly and it rolls onto its back.
5. **Shooting stars.** At night, fully zoomed in over the outcrop, a shooting star
   sometimes crosses the sky.
6. **Title screen parade.** Click the three animals on the title screen and they walk off
   the screen and back.
7. **Tendai's tea.** Late at night, hovering over the HQ shows "Tendai is brewing
   something terrible."
8. **Ruth's hat.** After the ending, rangers on the map wear Ruth's wide-brimmed hat.
9. **The 1,000th visitor.** Your 1,000th visitor gets a little celebration (alert, coins
   sound, a diary entry).

## Size estimate

- Journal: one phase (new book screen, four tabs, records tracking, save upgrade).
- Easter eggs: one smaller phase (albino and badger art, the rest is mostly small code).

## Decisions (settled 2026-10-21)

1. The journal opens as an overlay over the map.
2. Field notes replace the encyclopedia page; the Species menu's "Read" opens the journal.
3. Easter eggs are fully hidden: only the counter.
4. Party mode and Ruth's letters are dropped; rare albino animals are added instead.
