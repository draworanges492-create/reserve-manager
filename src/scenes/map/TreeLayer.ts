import Phaser from 'phaser';
import { ART_SCALE, TREE_FOOT_PX, WORLD_ART } from '../../config/game';
import { DEPTH } from '../depth';
import { objectProp, objectsIn } from './mapObjects';

/**
 * Big trees as sprites standing on the map (DECISIONS D109). They are drawn in the same
 * depth order as animals and people, sorted by where they stand, so a herd can walk
 * behind a trunk or in front of it.
 */
export class TreeLayer {
  readonly images: Phaser.GameObjects.Image[];

  constructor(scene: Phaser.Scene, map: Phaser.Tilemaps.Tilemap) {
    this.images = objectsIn(map, 'trees').flatMap((tree) => {
      const key = `tree-${String(objectProp(tree, 'kind'))}-${String(objectProp(tree, 'variant'))}`;
      if (!scene.textures.exists(key)) return [];
      const x = tree.x ?? 0;
      const y = tree.y ?? 0;
      const image = scene.add.image(x, y, key).setScale(WORLD_ART);
      // Anchor at the trunk's base, which sits TREE_FOOT_PX above the image bottom.
      image.setOrigin(0.5, 1 - (TREE_FOOT_PX * ART_SCALE) / image.height);
      return [image.setDepth(DEPTH.actors + y / 10000)];
    });
  }
}
