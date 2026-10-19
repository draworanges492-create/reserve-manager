// Typed view of assets.json: every texture is referenced by key, so swapping a
// placeholder for real art needs no code change (spec §12).
import manifest from './assets.json';

export interface SpritesheetEntry {
  path: string;
  frameWidth: number;
  frameHeight: number;
}

export interface AssetManifest {
  images: Record<string, string>;
  spritesheets: Record<string, SpritesheetEntry>;
  tilemaps: Record<string, string>;
  /** Tiled tileset name → texture key. */
  tilesets: Record<string, string>;
}

export const ASSETS: AssetManifest = manifest;
