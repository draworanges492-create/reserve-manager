# Story plan: Chapters 3–5

Draft for discussion (2026-10-20). It builds on the spec's chapter table (§9.2) and on the
threads Chapters 1–2 already set up. Things that differ from the spec, or that you need to
decide, are listed under **Decisions** at the end. Nothing here is built yet.

## Threads already in play after Chapter 2

- **The sabotage.** The old pump was cut on purpose, two days after Ruth refused a buyer
  for the third time. A heavy truck left by the east road without using the gate. Ruth's
  logbook mentions "Mr H." (flags `suspects_mr_h`, `ch2_wants_justice` / `ch2_protect_first`).
- **Two letters.** Dr. Amara Okafor wants to count the impala ("herds that grow this fast
  can eat a place bare"). V. Hale of Hale & Partners wants "an exciting partnership".
  Tendai recognises the name.
- **The new animals.** Elephants, hyenas and vultures now live on the plains, so the
  ecosystem has grazers, browsers, two predators and a scavenger to build stories around.

---

## Chapter 3 — Too Many Mouths (Phase 10)

**Theme:** a reserve that recovers too fast. Every fix has a cost, and people disagree.

**Setup.** With water back, the impala boom and the plains grass starts to fail. Amara
arrives with her counts and proposes a cull. At the same time the elephants start leaving
the reserve at night through the broken east fence and raiding the village maize. Mama
Wanjiru comes to the gate, angry: the reserve's animals are eating her people's harvest.

**Beats**

1. _Amara arrives_ (intro). She counts herds with the player, explains carrying capacity
   (ties into the zone panel's "the land supports about N here").
2. _The first raid._ Scripted night event: elephants break the east fence and crops are
   lost. The east border zone opens and Wanjiru is introduced.
3. _The argument._ Amara (cull the impala, numbers first), Tendai (let the lions and
   hyenas do it, and fix the fences) and Wanjiru (pay for the crops, give the village a
   stake) all disagree in one scene. **The player chooses a plan**, which sets a flag:
   - **Cull:** fast and cheap, but costs Reputation and some Trust; Amara approves,
     Tendai grumbles.
   - **Relocate:** move animals to another reserve. Expensive and slow, nobody is
     angry, and it unlocks the relocation system early.
   - **Contraception and predators:** slow but popular. It needs a vet, and works only
     if lions and hyenas stay healthy.
4. _Fixing the border._ A separate choice for the elephants: a plain fence repair, a
   **beehive fence** built with the village (needs Trust, raises it further), or
   compensation payments.
5. _Woodland opens._ Tracks in the woodland show someone has been camping there.
   Tendai finds an old snare: the first sign of organised poaching (sets up Chapter 5).
6. _Completion._ Grass recovers; Wanjiru either becomes an ally (high Trust) or stays
   wary. Amara decides to stay on as the reserve's ecologist.

**Goals (all needed):** carry out a population plan (any); plains grass back above 50;
Trust ≥ 40; mend the east border fence.

**New systems:** culling team, vet staff, contraception (slows births), population
plans per species and zone, crop-raid events (elephants leave if the fence is broken and
grass is low), compensation payments, beehive-fence building.

**Unlocks:** Woodland, Eastern Border, culling team, vet.

**Characters:** Amara (relationship up with a cull or with data-led choices), Wanjiru
(up with the beehive fence or compensation, down with culling done without consulting
her), Tendai.

---

## Chapter 4 — Growth (Phase 11)

**Theme:** the reserve becomes worth visiting, and worth wanting.

**Setup.** With the land stable, money is the next problem. Tendai suggests visitors.
The rocky outcrop has the best views and a leopard nobody has seen for years. A rumour
reaches the HQ: a rhino track in the far north.

**Beats**

1. _First tower._ Build an observation tower on the plains. The first visitors arrive by
   the main gate (the visitor sprites walk in).
2. _Outcrop opens._ A leopard sighting quest: place a tower or hide at the outcrop, then
   spot it (this uses the encyclopedia sighting system).
3. _Bringing animals back._ Relocation, unlocked here or carried over from Ch 3, lets the
   player bring giraffe and wildebeest in from another reserve.
4. _Victor visits._ Victor Hale arrives in person, charming and generous. He offers to
   build the lodge for free in return for a share of the tourism. **Choice:** accept the
   money, turn it down politely, or ask about the pump. Asking makes him cold, but Kito
   notices.
5. _Kito appears._ A young man is caught near the outcrop with a snare. He's nervous and
   poor, and claims he was paid. **Choice:** hand him to the police, or let Tendai talk to
   him (which sets up his Ch 5 confession).
6. _The rhino rumour firms up._ A ranger photographs a rhino footprint near the northern
   fence. The chapter ends with Tendai saying: "If there's a rhino out there, someone else
   knows it too."

**Goals:** build a tower; reach a visitor target per month (tuned with the tourism sim);
**8 species present** (the six we have plus leopard and giraffe or wildebeest).

**New systems:** tourism (visitors per month, sightings value, Reputation), the lodge,
relocation, leopard and giraffe (wildebeest optional).

**Unlocks:** Rocky Outcrop, lodge, relocation.

---

## Chapter 5 — Pressure (Phase 12)

**Theme:** everything at once. Drought, money, crime, and the truth about the pump.

**Setup.** The rains fail. The water table drops and pump output halves. Hale's offer
returns as a full buyout, with a deadline. The poachers are now hitting the reserve
properly.

**Beats**

1. _Drought._ Waterholes shrink and herds crowd the last water. The player must deepen
   the boreholes, truck water in, or move animals. Elephants dig for water in the dry
   riverbed, a chance for an Amara teaching scene (facts marked unverified).
2. _Dead vultures._ Rangers find a carcass surrounded by dead vultures. Amara explains:
   poachers poison carcasses so circling vultures can't give their kills away.
   **Gameplay:** vultures now matter. With few vultures, carcasses linger and disease
   events become likely; poisoning crashes the vulture population. (This answers open
   question D107.)
3. _Kito's confession._ Depending on Ch 4, Kito comes back, or is released and comes
   back. He explains the poaching is a paid ring, not hungry villagers. The trucks that
   collect the horn and tusks use the same east road as the night the pump died.
4. _Camera network._ Build cameras on the north and east fences, with Kito's help if he
   was trusted. This unlocks the North zone. A rhino and its calf are seen there.
5. _Hale._ The camera footage ties Hale's trucks to the ring. **The big choice:**
   - **Expose him:** hand the evidence to the police. Hale's offer collapses and
     Reputation jumps, but money is tight. This leads towards the "Thriving Wilderness"
     ending.
   - **Take the deal:** sell part of the reserve to Hale and keep quiet. Money is safe,
     but Trust and the ecosystem suffer. This leads towards "Profitable but Compromised".
   - **Lock it down:** refuse Hale but fence and patrol everything, with no village
     involvement. Animals are safe and the community is shut out. This leads towards
     "Fortress Reserve".
6. _Completion._ The rains return. The chapter ends at the first rhino sighting from the
   tower, whichever path was chosen; Chapter 6 (Legacy) picks up from there.

**Goals:** survive the drought with every pump working; resolve the poaching thread
(cameras + evidence); resolve the Hale thread (any of the three choices).

**New systems:** drought (water table, pump output, deepening), water trucking, poaching
with carcass poisoning, disease risk from carcasses (vultures reduce it), camera network,
rhino in the North zone.

**Unlocks:** North zone, camera network, rhino.

---

## How the chapters feed the endings (§9.3)

| Choice              | Thriving Wilderness          | Profitable but Compromised | Fortress Reserve |
| ------------------- | ---------------------------- | -------------------------- | ---------------- |
| Ch 3 plan           | contraception / relocation   | cull                       | cull             |
| Ch 3 border         | beehive fence / compensation | compensation               | plain fence      |
| Ch 4 Victor's lodge | refused                      | accepted                   | refused          |
| Ch 4 Kito           | talked to                    | —                          | police           |
| Ch 5 Hale           | exposed                      | deal                       | lock-down        |

The final scores (Ecosystem, Trust, Reputation) still decide the ending. These choices
push them, and each gets its own epilogue slide.

## Size estimate

About 120–180 dialogue lines per chapter, as in Chapters 1–2: one phase each (Phases
10–12), each followed by your playtest.

## Decisions

1. **Elephants as the crop raiders (Ch 3).** The spec has impala causing the crop
   raids. I'd make it the elephants: impala strip the grass (Amara's problem), elephants
   raid crops (Wanjiru's problem). Two problems, two characters. OK?
2. **Species target in Ch 4.** The spec's goal "6 species present" is already met now that
   we have six. I'd raise it to 8 (adding leopard plus giraffe or wildebeest).
3. **How culling is shown.** Off-screen and reported in text (numbers and the journal),
   never shown. Is that the tone you want?
4. **Hale's fate.** The three outcomes above (expose / deal / lock-down). Do you want a
   fourth, e.g. turning him into an investor who reforms?
5. **Kito.** Can he be hired as a ranger after his confession (a redemption path), or
   should he only ever be an informant?
6. **Vultures' gameplay role** (carcass cleanup and disease, Ch 5) answers open
   question D107. OK to build it then rather than now?
