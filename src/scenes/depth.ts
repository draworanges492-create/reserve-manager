/** Draw order for world objects. Actors add y/1000 so lower sprites draw in front. */
export const DEPTH = {
  ground: 0,
  water: 1,
  deco: 2,
  objects: 3,
  waterholes: 4,
  actors: 10,
  fences: 20,
  zoneDim: 21,
  hover: 22,
  effects: 30,
  floatingText: 40,
} as const;
