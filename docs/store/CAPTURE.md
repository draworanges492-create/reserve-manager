# Store images: how they're made

Everything in this folder comes from `npm run store:capture` (about two minutes). It starts
the dev server, has the automated player (`tools/autoPlayer.ts`) play a game up to
Chapter 5 (seed 7, 92 days), loads that save in a clean browser and takes:

| File                         | What it shows                                                     |
| ---------------------------- | ----------------------------------------------------------------- |
| `screenshot-1-title.png`     | Title screen                                                      |
| `screenshot-2-arrival.png`   | A new game: Tendai's first line at the broken gate                |
| `screenshot-3-herds.png`     | The busiest herd gathering in the Chapter 5 save                  |
| `screenshot-4-birds-eye.png` | The whole open reserve, fully zoomed out                          |
| `screenshot-5-journal.png`   | Ruth's journal, Field notes tab                                   |
| `cover-630x500.png`          | The herd shot, closer and without the HUD, with the title over it |
| `reserve.gif`                | 10 s of that herd at 2× speed, 640×360, HUD hidden                |

Screenshots are 1920×1080 (a 1280×720 window at 1.5× pixel density).

**To change them** edit `tools/store-capture.ts`: the save (seed, `maxDays`), where the
camera looks (`SPOTS` or `busiestSpot`), the zoom level passed to `frame()`, and the cover's
title and tagline in its HTML. Edge scrolling is turned off and the mouse is parked over
the goal list, so no tooltips or zone labels appear.
