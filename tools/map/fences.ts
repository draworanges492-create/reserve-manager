// Fence lines along zone borders. Each border gets exactly one fence, owned by the zone
// that unlocks later (repairing it is what opens that zone); map-edge fences belong to
// the zone they enclose. The HQ's south edge has the 4-tile main gate.
import zonesData from '../../src/data/zones.json';
import { GATE_SPAN, MAP_HEIGHT, MAP_WIDTH, ZONES } from './layout';
import { zoneAt } from './terrain';

export interface FenceRun {
  id: string;
  zoneId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

const chapterOf = (zoneId: string): number =>
  zonesData.zones.find((z) => z.id === zoneId)?.unlockChapter ?? Number.MAX_SAFE_INTEGER;

/** Does `zoneId` own the border it shares with `neighbour` (null = map edge)? */
function owns(zoneId: string, neighbour: string | null): boolean {
  if (neighbour === null) return true;
  const mine = chapterOf(zoneId);
  const theirs = chapterOf(neighbour);
  return mine > theirs || (mine === theirs && zoneId < neighbour);
}

const outside = (x: number, y: number): string | null =>
  x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT ? null : zoneAt(x, y);

export function buildFences(): FenceRun[] {
  const runs: FenceRun[] = [];
  for (const [zoneId, r] of Object.entries(ZONES)) {
    // Each side as a list of unit steps: [tile x, tile y of the neighbour, line start, line end].
    const sides: {
      name: string;
      steps: { neighbour: string | null; a: [number, number]; b: [number, number] }[];
    }[] = [
      {
        name: 'n',
        steps: Array.from({ length: r.w }, (_, i) => ({
          neighbour: outside(r.x + i, r.y - 1),
          a: [r.x + i, r.y],
          b: [r.x + i + 1, r.y],
        })),
      },
      {
        name: 's',
        steps: Array.from({ length: r.w }, (_, i) => ({
          neighbour: outside(r.x + i, r.y + r.h),
          a: [r.x + i, r.y + r.h],
          b: [r.x + i + 1, r.y + r.h],
        })),
      },
      {
        name: 'w',
        steps: Array.from({ length: r.h }, (_, i) => ({
          neighbour: outside(r.x - 1, r.y + i),
          a: [r.x, r.y + i],
          b: [r.x, r.y + i + 1],
        })),
      },
      {
        name: 'e',
        steps: Array.from({ length: r.h }, (_, i) => ({
          neighbour: outside(r.x + r.w, r.y + i),
          a: [r.x + r.w, r.y + i],
          b: [r.x + r.w, r.y + i + 1],
        })),
      },
    ];
    for (const side of sides) {
      let count = 0;
      let start: (typeof side.steps)[number] | null = null;
      let end: (typeof side.steps)[number] | null = null;
      const isGate = (step: (typeof side.steps)[number]): boolean =>
        zoneId === 'hq' &&
        side.name === 's' &&
        step.a[0] >= GATE_SPAN.from &&
        step.a[0] < GATE_SPAN.to;
      const flush = (): void => {
        if (!start || !end) return;
        const gate = isGate(start);
        runs.push({
          id: gate ? 'hq_gate' : `${zoneId}_${side.name}${count++}`,
          zoneId,
          from: { x: start.a[0], y: start.a[1] },
          to: { x: end.b[0], y: end.b[1] },
        });
        start = end = null;
      };
      for (const step of side.steps) {
        if (!owns(zoneId, step.neighbour)) {
          flush();
          continue;
        }
        // A new run starts when the neighbour changes or we enter/leave the gate.
        if (start && (start.neighbour !== step.neighbour || isGate(start) !== isGate(step)))
          flush();
        start ??= step;
        end = step;
      }
      flush();
    }
  }
  return runs;
}
