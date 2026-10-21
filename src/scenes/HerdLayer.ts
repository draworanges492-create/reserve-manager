import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { speciesDef } from '../core/content';
import { type AnimalGroupRef, eventBus } from '../core/EventBus';
import type { GameSession } from '../core/GameSession';
import { AnimalGroupSprite } from '../entities/AnimalGroupSprite';
import { type Rect, spriteCountFor } from '../entities/herdMath';
import { objectProp, objectsIn, type ZoneArea } from './map/mapObjects';
import { findSecret } from '../core/Secrets';
import { albinoTexture } from './albinoTexture';

/** How often (ms) to check which species are on screen, for encyclopedia sightings. */
const SIGHTING_CHECK_MS = 500;
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
  private sinceSightingCheck = 0;
  private selected: string | null = null;
  /** Recent clicks on each lion sprite, for the lazy lion (D132). */
  private readonly lionClicks = new WeakMap<Phaser.GameObjects.Sprite, number[]>();

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
    this.checkSightings(deltaMs);
    const { clock, populations } = this.session.state;
    const timeScale = clock.paused ? 0 : clock.speed;
    const max = BALANCE.render.maxAnimalSpritesPerZone;
    const albino = this.session.state.albino;
    const albinoKey = albino ? `${albino.zoneId}:${albino.speciesId}` : null;
    for (const [zoneId, bySpecies] of Object.entries(populations)) {
      for (const [speciesId, count] of Object.entries(bySpecies)) {
        const group =
          this.groups.get(`${zoneId}:${speciesId}`) ?? this.createGroup(zoneId, speciesId);
        group?.setCount(spriteCountFor(count, max));
        const species = group && group.key === albinoKey ? speciesDef(speciesId) : undefined;
        group?.setSpecial(species ? albinoTexture(this.scene, species.spriteKey) : null);
        group?.update(deltaMs, timeScale);
      }
    }
  }

  /** Spec §7.6: the first time a species' herd is on screen, its encyclopedia entry unlocks. */
  private checkSightings(deltaMs: number): void {
    this.sinceSightingCheck += deltaMs;
    if (this.sinceSightingCheck < SIGHTING_CHECK_MS) return;
    this.sinceSightingCheck = 0;
    const seen = this.session.state.encyclopedia;
    const view = this.scene.cameras.main.worldView;
    for (const [key, group] of this.groups) {
      const speciesId = key.split(':')[1] ?? '';
      if (!seen.includes(speciesId) && group.visibleIn(view)) {
        this.session.dispatch({ type: 'recordSighting', speciesId, zoneId: key.split(':')[0] });
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
      waterSpot: () => {
        const hole = Object.values(this.session.state.waterholes).find(
          (h) => h.zoneId === zoneId && h.level >= BALANCE.water.availableMinLevel,
        );
        return hole ? { x: hole.x * this.map.tileWidth, y: hole.y * this.map.tileHeight } : null;
      },
      onMemberClick: (sprite, special) => {
        if (special) {
          this.session.dispatch({ type: 'noteRarity', id: `albino_${speciesId}`, zoneId });
          findSecret('albino');
        }
        if (speciesId === 'lion') this.lionClicked(group, sprite);
      },
    });
    this.groups.set(group.key, group);
    return group;
  }

  /** Easter egg (D132): click the same lion ten times quickly and it rolls onto its back. */
  private lionClicked(group: AnimalGroupSprite, sprite: Phaser.GameObjects.Sprite): void {
    const cfg = BALANCE.secrets;
    const now = this.scene.time.now;
    const clicks = [...(this.lionClicks.get(sprite) ?? []), now].filter(
      (at) => now - at <= cfg.lazyLionWindowMs,
    );
    if (clicks.length < cfg.lazyLionClicks) {
      this.lionClicks.set(sprite, clicks);
      return;
    }
    this.lionClicks.delete(sprite);
    group.rollOver(sprite, cfg.lazyLionRollMs);
    findSecret('lazy_lion');
  }

  private refreshHighlights(): void {
    for (const [key, group] of this.groups) {
      group.setHighlighted(key === this.hovered || key === this.selected);
    }
  }
}
