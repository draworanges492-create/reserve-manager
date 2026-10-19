import Phaser from 'phaser';
import { ASSETS } from '../config/assets';
import { eventBus } from '../core/EventBus';
import { AnimalGroupSprite } from '../entities/AnimalGroupSprite';
import { seasonOf } from '../sim/Seasons';
import { CameraController } from './camera/CameraController';
import { DEPTH } from './depth';
import { objectProp, objectsIn, readZones, type ZoneArea } from './map/mapObjects';
import { SeasonTint } from './map/SeasonTint';
import { ZoneOverlay } from './map/ZoneOverlay';
import { getSession } from './session';

const TILE_LAYERS = [
  ['ground', DEPTH.ground],
  ['water', DEPTH.water],
  ['vegetation_deco', DEPTH.deco],
  ['objects', DEPTH.objects],
] as const;
/** Sprites per preview group (until Phase 4 derives this from populations). */
const PREVIEW_GROUP_SIZE = 5;
/** Where the camera starts: between HQ and Waterhole A, in tiles. */
const START_VIEW_TILE = { x: 56, y: 58 };

/** The world view: tilemap, zones, fences and (for now) preview animals. Drives the sim clock. */
export class GameScene extends Phaser.Scene {
  private zones: ZoneArea[] = [];
  private hovered: ZoneArea | null = null;
  private overlay!: ZoneOverlay;
  private cameraController!: CameraController;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const session = getSession(this);
    const map = this.make.tilemap({ key: 'reserve' });
    const tilesetName = Object.keys(ASSETS.tilesets)[0] ?? '';
    const tileset = map.addTilesetImage(tilesetName, ASSETS.tilesets[tilesetName]);
    if (!tileset) throw new Error(`Tileset "${tilesetName}" failed to load`);
    const layers = TILE_LAYERS.map(([name, depth]) => {
      const layer = map.createLayer(name, tileset);
      if (!layer) throw new Error(`Map is missing tile layer "${name}"`);
      return layer.setDepth(depth);
    });

    const seasonTint = new SeasonTint(this, layers, seasonOf(session.state.clock.day));
    this.zones = readZones(map);
    this.overlay = new ZoneOverlay(
      this,
      map,
      this.zones,
      (id) => !!session.state.zones[id]?.unlocked,
    );
    this.spawnPreviewAnimals(map);

    this.cameraController = new CameraController(
      this,
      map.widthInPixels,
      map.heightInPixels,
      () => this.updateHover(),
      (pointer) => this.isOverUI(pointer),
    );
    this.cameras.main.centerOn(
      START_VIEW_TILE.x * map.tileWidth,
      START_VIEW_TILE.y * map.tileHeight,
    );

    this.input.on(Phaser.Input.Events.POINTER_MOVE, () => this.updateHover());
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.setHovered(null));
    const offSeason = eventBus.on('seasonChanged', ({ season }) => seasonTint.fadeTo(season));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, offSeason);
  }

  override update(_time: number, delta: number): void {
    getSession(this).update(delta);
    this.cameraController.update(delta);
  }

  private isOverUI(pointer: Phaser.Input.Pointer): boolean {
    if (!this.scene.isActive('UIScene')) return false;
    return this.scene.get('UIScene').input.hitTestPointer(pointer).length > 0;
  }

  private spawnPreviewAnimals(map: Phaser.Tilemaps.Tilemap): void {
    objectsIn(map, 'spawns').forEach((spawn, i) => {
      const species = objectProp(spawn, 'species');
      if (objectProp(spawn, 'kind') !== 'animal' || typeof species !== 'string') return;
      new AnimalGroupSprite(this, spawn.x ?? 0, spawn.y ?? 0, species, PREVIEW_GROUP_SIZE, i + 1);
    });
  }

  private updateHover(): void {
    const pointer = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const zone = this.isOverUI(pointer)
      ? null
      : (this.zones.find((z) => z.rect.contains(world.x, world.y)) ?? null);
    this.setHovered(zone);
  }

  private setHovered(zone: ZoneArea | null): void {
    this.overlay.setHover(zone, this.cameras.main.zoom);
    if (zone === this.hovered) return;
    this.hovered = zone;
    eventBus.emit('zoneHover', { zoneId: zone?.id ?? null });
  }
}
