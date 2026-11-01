# Roadmap after 1.0: making the reserve come alive

Draft for your approval, 2026-11-01. Version 1.0 is finished and live: the full story,
three endings, the journal, secrets, accessibility, saves and the release pipeline. What it
lacks is **life on screen**. The simulation is rich, but most of it happens as numbers:
lions "hunt" in a formula, calves are a counter, rain is a tint. This plan turns those
numbers into things you can watch, hear and act on.

Each phase below is one release (published to the website and itch.io), built the usual
way: one phase at a time, checks, commit, then a stop for your go-ahead. Sizes are rough:
**S** ≈ one session, **M** ≈ two, **L** ≈ three or more.

## Phase 15: Listen first (v1.0.x) · S

Real players will tell us what matters most before we build months of features.

- Upload to itch.io (you) and share the link with 3–5 people who haven't seen the game.
- **First-hour help:** short hints when someone seems stuck. For example, after 2 minutes on
  the starting screen without refilling, Tendai points at the waterhole; when the first
  menu opens, a one-line tip about it. Hints can be turned off in Settings.
- **Feedback link** on the title screen and in Settings (decision 4).
- A playtest checklist for your testers: what confused them, where they stopped, what they
  loved.
- Fix whatever they trip over, then re-run `balance:report` and `browser-check`.

## Phase 16: Animals that live (v1.1) · L

Today every animal does one thing: walks slowly with a two-frame step. This phase gives
each species real behaviour, all visual, so the simulation and balance don't change.

- **Idle life:** heads down to graze, ear flicks and tail swishes, lying down to rest at
  midday, alert heads-up when a predator is near.
- **At the waterhole:** animals walk to the edge and drink, elephants spray water and
  dust-bathe, zebras kick up splashes.
- **Predators you can see:** when the simulation records a kill in a zone you're looking at,
  you see it play out: lions stalk low through the grass, sprint, and the herd scatters.
  Afterwards vultures circle and drop down, and hyenas arrive.
- **Young ones:** after births, small calves follow their mothers for a season, then grow
  into adult sprites.
- **Herds that move as herds:** a leader goes first and the rest follow in a line, elephants
  walk trunk to tail, and giraffes browse the tops of trees.
- **Reactions:** animals move away from rangers and vehicles, scatter from poachers, and
  bunch together at night.
- **Follow an animal:** click and "Follow" keeps the camera on one animal. It ties into
  Phase 21's named animals.

Art needed: 4-frame walk cycles plus graze, drink, rest and run poses for all 11 animals
(decision 2).

## Phase 17: A world that breathes (v1.2) · M

Weather and time of day you can see, not just a colour wash.

- **Wet season:** rain showers drifting across the map with ripples on the waterholes;
  puddles appear, grass visibly greens tile by tile, and flowers bloom.
- **Dry season and drought:** heat shimmer, dust devils, cracking mud around shrinking
  waterholes, yellowing trees.
- **Sky:** cloud shadows sliding over the ground, flocks of birds crossing, the vultures'
  thermals.
- **Night:** lamps in the HQ windows, a campfire at the ranger post, fireflies, stars and
  the moon (the shooting-star secret gets a proper sky), eyes glinting in the dark.
- **Dawn and dusk:** mist in low ground at dawn, long shadows at dusk.
- **Moving water:** the river flows and the waterholes shimmer.
- Everything respects Reduce motion and has a "weather effects" switch for slower
  computers.

## Phase 18: Art detail pass (v1.3) · L

You asked for more detail later; this is that pass, done after 16–17 so new animations and
effects are drawn once, in the final style.

- **Terrain:** more ground variety (termite mounds, rocky patches, grass tufts that sway,
  game trails worn by herds over time, burn scars), smoother transitions between zones.
- **Buildings:** each with built, worn and upgraded looks; small details like a solar panel
  glint, laundry at HQ, a jeep parked at the lodge.
- **People:** visitors arrive in safari jeeps along the roads, rangers patrol on foot or by
  vehicle, villagers at the border, and Tendai himself walks the reserve.
- **Portraits:** more expressions, and portraits for minor characters.
- **Title screen and epilogue:** an illustrated title scene and pictures for the epilogue
  slides (they're text-only now).

## Phase 19: Sound that sells it (v1.4) · M

All sound is synthesised by code today. Real recordings make the biggest difference for
the least work.

- **Ambience:** recorded savanna birds by day, insects and frogs at night, rain, wind in the
  dry season, and river sounds near water.
- **Animals you hear where they are:** a lion's roar at night, elephant trumpets, hyena
  whoops, zebra barks, louder the closer you zoom in.
- **Music:** a theme per chapter with calm and tense versions that cross-fade with what's
  happening (drought, poaching, a big decision).
- **Interface sounds** recorded or re-made to match.
- Volume sliders for music, effects and ambience separately.

## Phase 20: Things to do between story beats (v1.5) · L

Give the player choices and surprises outside the main story.

- **Random events**, mostly with a decision attached:
  - a **bushfire** (fight it, or let it burn and get fresh grass);
  - a **flood**;
  - a **disease scare**;
  - a **rare visitor** (wild dogs passing through);
  - a **school trip**;
  - a **documentary crew**;
  - a **storm** that breaks fences.
- **Ranger work:** draw patrol routes on the map, set up night patrols, and add a
  tracker-dog unit.
- **New buildings:** a hide by the waterhole (more visitors, better photos), a research
  station, firebreaks, salt licks, an artificial nesting site for vultures.
- **Research projects:** collar a lion and watch its route on the map; count the herds from
  the air.
- **Photo mode:** pause, frame a shot, and keep it in a new **Album** tab of the journal.
  Visitors' reviews mention what they saw.
- **Seasonal goals:** small optional targets each season with a reward.

## Phase 21: Characters and stories you follow (v1.6) · M

- **Named animals:** the old elephant matriarch, a one-tusked bull, the leopard mother, the
  rhino calf from Chapter 5. They appear in the journal, have a life story, and the game
  notices when something happens to them.
- **Side stories:** short quest chains with Wanjiru (the village), Amara (research), Kito
  (making amends) and Victor, available after the story or alongside it.
- **Letters and visitors:** postcards from tourists, letters from other reserves, a visit
  from Ruth's old friends.

## Phase 22: Replay and long play (v2.0) · L

- **Free play:** start a new reserve without the story, choosing the map, money and
  difficulty.
- **Difficulty settings:** gentle, standard, hard (droughts, poaching pressure, money).
- **A second reserve:** a new map with different species and problems, for example a
  wetland delta with hippos, crocodiles and flamingos, or a mountain reserve.
- **Achievements** and lifetime **statistics** (all reserves, all endings).
- Save import and export (so a save can move between computers).

## Phase 23: Reach more players (v2.x) · M

- **Phones and tablets:** bigger touch targets, a layout for small screens, and pinch and
  long-press throughout.
- **Install and play offline**, as an app from the browser.
- **Translations** (all text is already in data files): French, Dutch or whichever
  languages your players need.
- Optionally a desktop version for Steam (a separate decision, since it costs money).

## Every release

- `balance:report`, `browser-check`, old-save test (each release adds a save fixture),
  changelog, store images refreshed with `store:capture`, published to the website and
  itch.io.
- Performance budget: still loads in under 2 seconds and runs smoothly on an ordinary
  laptop. Phases 16–17 add many moving things, so I'll measure frame rate as part of the
  browser check.

## Decisions for you

1. **Order.** My recommendation is the order above: feedback first, then life on screen
   (16, 17), then art (18) and sound (19), then new content (20–22). Should anything jump
   the queue?
2. **Art.** The animations in 16 and the detail pass in 18 need a lot of new art. Options:
   **(a)** I keep drawing it in code (consistent and fast, but limited in how organic it can
   look); **(b)** you draw or commission the key sprites and I do the rest; **(c)** I draw
   first versions and you replace the ones you care about most.
3. **Recorded sound.** Use free (CC0) recordings from libraries like Freesound, with every
   file and licence listed in `ASSETS.md`? Or keep everything synthesised?
4. **Feedback.** How should players reach you: itch.io comments only, an email address, or a
   simple form (e.g. Google Forms) linked from the game?
5. **A second reserve (Phase 22).** A wetland delta, a mountain reserve, or something else?
