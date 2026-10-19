import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { speciesDef } from '../core/content';
import { type AnimalGroupRef, eventBus } from '../core/EventBus';
import type { GameSession } from '../core/GameSession';
import { AnimalGroupSprite } from '../entities/AnimalGroupSprite';
import { type Rect, spriteCountFor } from '../entities/herdMath';
import { objectProp, objectsIn, type ZoneArea } from './map/mapObjects';

/** Animals keep this far (px) from a waterhole's centre so they don't stand in the pool. */
const POOL_RADIUS_PX = 40;

const keyOf = (g: AnimalGroupRef | null): string | null =>
  g ? `${g.zoneId}:${g.speciesId}` : null;

/**
 * Draws every herd from `state.populations` (one AnimalGroupSprite per zone + species),
 * keeps sprite counts in step with the numbers, and highlights hovered / selected herds.
 */
export class HerdLayer {
  private readonly groups = new Map<string, AnimalGroupSprite>();
  private readonly spawns: { x: number; y: number; species: string }[];
  /** True where nobody can walk (deep water, rocks, buildings, waterhole pools). */
  readonly blocked: (x: number, y: number) => boolean;
  private hovered: string | null = null;
  private selected: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: Phaser.Tilemaps.Tilemap,
    private readonly zones: ZoneArea[],
    private readonly session: GameSession,
  ) {
    this.spawns = objectsIn(map, 'spawns').flatMap((s) => {
      const species = objectProp(s, 'species');
      return objectProp(s, 'kind') === 'animal' && typeof species === 'string'
        ? [{ x: s.x ?? 0, y: s.y ?? 0, species }]
        : [];
    });
    const pools = Object.values(session.state.waterholes).map((h) => ({
      x: h.x * map.tileWidth,
      y: h.y * map.tileHeight,
    }));
    this.blocked = (x, y) => {
      const tx = Math.floor(x / map.tileWidth);
      const ty = Math.floor(y / map.tileHeight);
      if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return true;
      if (map.getTileAt(tx, ty, false, 'collision')) return true;
      return pools.some((p) => Math.hypot(p.x - x, p.y - y) < POOL_RADIUS_PX);
    };

    const offHover = eventBus.on('animalHover', ({ group }) => {
      this.hovered = keyOf(group);
      this.refreshHighlights();
    });
    const offSelect = eventBus.on('animalSelected', ({ group }) => {
      this.selected = keyOf(group);
      this.refreshHighlights();
    });
    // Opening a zone's or building's panel deselects any herd.
    const deselect = (): void => {
      this.selected = null;
      this.refreshHighlights();
    };
    const offZone = eventBus.on('zoneSelected', ({ zoneId }) => zoneId && deselect());
    const offSlot = eventBus.on('slotSelected', ({ slotId }) => slotId && deselect());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offHover();
      offSelect();
      offZone();
      offSlot();
    });
  }

  update(deltaMs: number): void {
    const { clock, populations } = this.session.state;
    const timeScale = clock.paused ? 0 : clock.speed;
    const max = BALANCE.render.maxAnimalSpritesPerZone;
    for (const [zoneId, bySpecies] of Object.entries(populations)) {
      for (const [speciesId, count] of Object.entries(bySpecies)) {
        const group =
          this.groups.get(`${zoneId}:${speciesId}`) ?? this.createGroup(zoneId, speciesId);
        group?.setCount(spriteCountFor(count, max));
        group?.update(deltaMs, timeScale);
      }
    }
  }

  private createGroup(zoneId: string, speciesId: string): AnimalGroupSprite | undefined {
    const zone = this.zones.find((z) => z.id === zoneId);
    const species = speciesDef(speciesId);
    if (!zone || !species) return undefined;
    // Keep half a tile clear of the zone edge so herds don't stand on the fence line.
    const inset = this.map.tileWidth / 2;
    const area: Rect = {
      x: zone.rect.x + inset,
      y: zone.rect.y + inset,
      w: zone.rect.width - inset * 2,
      h: zone.rect.height - inset * 2,
    };
    const spawn = this.spawns.find((s) => s.species === speciesId && zone.rect.contains(s.x, s.y));
    const group = new AnimalGroupSprite(this.scene, {
      zoneId,
      speciesId,
      textureKey: species.spriteKey,
      area,
      home: spawn ?? { x: zone.rect.centerX, y: zone.rect.centerY },
      tileSize: this.map.tileWidth,
      blocked: this.blocked,
    });
    this.groups.set(group.key, group);
    return group;
  }

  private refreshHighlights(): void {
    for (const [key, group] of this.groups) {
      group.setHighlighted(key === this.hovered || key === this.selected);
    }
  }
}
