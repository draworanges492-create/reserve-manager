// Read-only lookups into src/data content files.
import waterholesData from '../data/waterholes.json';

export interface WaterholeDef {
  id: string;
  name: string;
  startLevel: number;
  type: string;
}

export function waterholeDef(id: string): WaterholeDef | undefined {
  return waterholesData.waterholes.find((w) => w.id === id);
}
