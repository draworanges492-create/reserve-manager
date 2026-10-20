# Art guide

Everything the game draws, with sizes and frame counts, so placeholder art can be
replaced one file at a time. Sizes follow DECISIONS D12 (24 px tiles).

## How swapping art works

- Every texture is referenced by **key** in `src/config/assets.json`. Keep the file name,
  pixel size and frame layout the same, and no code changes are needed.
- `npm run gen:placeholders` regenerates placeholders but **skips any PNG that is not a
  placeholder**, so your finished art is never overwritten.
- `npm run preview:art -- out.png` writes an enlarged contact sheet of all placeholder art.
- Palette: `public/assets/palette.gpl` (32 colours; spec limit 32 — full). Load it in
  LibreSprite / Aseprite / Krita.

## Readability rules (DECISIONS D13)

1. **Map** uses the muted, low-saturation colours only, with **no outlines**.
2. **Animals and people** use saturated colours that never appear on the map, and always
   have a **1 px dark outline** (`#1a1410`).
3. Every animal stands on a soft **ground shadow** (`shadow-sm` / `shadow-lg`).
4. Animals keep a small idle motion (bob / walk frames) so they separate from still terrain.
5. Hovering an animal group shows a highlight ring plus species and count (Phase 4).

## Terrain tileset — `public/assets/tilesets/terrain.png`

24×24 tiles, 8 columns, **1 px margin and 2 px spacing** holding a copy of each tile's edge
pixels (stops seams when the camera is between pixels). Order matters: the map refers to
tiles by position.

| #   | Name             | Layer           | Notes                                 |
| --- | ---------------- | --------------- | ------------------------------------- |
| 0   | grass            | ground          | default grassland                     |
| 1   | grass_b          | ground          | variant with blades                   |
| 2   | grass_lush       | ground          | river / woodland                      |
| 3   | grass_dry        | ground          | degraded plains                       |
| 4   | grass_dry_b      | ground          | variant                               |
| 5   | scrub            | ground          | unzoned buffer bush                   |
| 6   | dirt             | ground          | HQ yard                               |
| 7   | road             | ground          | 2-tile-wide tracks                    |
| 8   | sand             | ground          | river banks, under water              |
| 9   | rock_ground      | ground          | outcrop                               |
| 10  | farmland         | ground          | village crop strips                   |
| 11  | parking          | ground          | HQ car park                           |
| 12  | dry_bed          | ground          | dried waterhole bed                   |
| 13  | water_shallow    | water           | walkable                              |
| 14  | water_deep       | water           | blocks movement                       |
| 15  | tree             | vegetation_deco | round canopy, transparent bg          |
| 16  | tree_b           | vegetation_deco | acacia                                |
| 17  | bush             | vegetation_deco |                                       |
| 18  | grass_tuft       | vegetation_deco |                                       |
| 19  | boulder          | vegetation_deco | blocks movement                       |
| 20  | hq_office        | objects         | label "HQ"                            |
| 21  | ranger_post_ruin | objects         | label "RP"                            |
| 22  | gate             | objects         | label "GT", 2 tiles across the road   |
| 23  | hut              | objects         | village, outside the fence            |
| 24  | pump_ruin        | objects         | label "PU", the sabotaged pump (Ch 2) |
| 25  | collision        | collision       | debug marker, layer is hidden         |

Wanted later: edge/transition tiles between ground types (grass↔dry, grass↔rock,
bank↔water) — the placeholder map has hard tile edges.

## Sprites — `public/assets/sprites/`

All face **right** (the game mirrors them). Frames sit side by side in one strip.

| Key       | Frame size | Frames   | Notes                                  |
| --------- | ---------- | -------- | -------------------------------------- |
| impala    | 24×24      | 2 (walk) | Milestone A                            |
| zebra     | 24×24      | 2 (walk) | Milestone A                            |
| lion      | 24×24      | 2 (walk) | Milestone A                            |
| elephant  | 48×48      | 2 (walk) | v1.0; size reference for large animals |
| ranger    | 24×24      | 2 (walk) | staff                                  |
| visitor   | 24×24      | 2 (walk) | tourists                               |
| shadow-sm | 20×6       | 1        | under 24 px sprites                    |
| shadow-lg | 40×10      | 1        | under 48 px sprites                    |

Still to come (later phases): wildebeest 24, giraffe 48, leopard 24, rhino 48; fence
crew / tracker / vet / culling team;
lodge; 9-slice UI panels.

## Effects and sound

- `sprites/fx-dust.png` (4×4, sand tones): dust puff particle; `fx-drop.png`: water drop.
- There are no audio files: music, ambience and effects are synthesized in `src/audio/`
  (D95). To use recordings instead, put them in `public/assets/audio/`, list them in
  `ASSETS.md`, and make `AudioManager` play them. The `sfx('…')` / `setMusic(…)` callers
  stay the same.
