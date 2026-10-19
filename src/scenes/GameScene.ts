import Phaser from 'phaser';
import { ASSETS } from '../config/assets';
import { BALANCE } from '../config/balance';
import { eventBus } from '../core/EventBus';
import { t } from '../core/text';
import { WaterholeSprite } from '../entities/WaterholeSprite';
import { showFloatingText } from '../ui/FloatingText';
import { seasonOf } from '../sim/Seasons';
import { CameraController } from './camera/CameraController';
import { type Bounds, unionBounds } from './camera/cameraMath';
import { DEPTH } from './depth';
import { HerdLayer } from './HerdLayer';
import { readZones, type ZoneArea } from './map/mapObjects';
import { SeasonTint } from './map/SeasonTint';
import { ZoneOverlay } from './map/ZoneOverlay';
import { getSession } from './session';
import type { UIScene } from './UIScene';

const TILE_LAYERS = [
  ['ground', DEPTH.ground],
  ['water', DEPTH.water],
  ['vegetation_deco', DEPTH.deco],
  ['objects', DEPTH.objects],
] as const;
/** Where the camera starts: between HQ and Waterhole A, in tiles. */
const START_VIEW_TILE = { x: 56, y: 60 };

/** The world view: tilemap, zones, fences, waterholes and herds. Drives the sim clock. */
export class GameScene extends Phaser.Scene {
  private zones: ZoneArea[] = [];
  private hovered: ZoneArea | null = null;
  private overlay!: ZoneOverlay;
  private cameraController!: CameraController;
  private waterholes: WaterholeSprite[] = [];
  private herds!: HerdLayer;

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
    this.overlay.refreshDegraded((id) => session.state.zones[id]?.vegetation ?? 100);
    this.herds = new HerdLayer(this, map, this.zones, session);
    this.waterholes = Object.keys(session.state.waterholes).map(
      (id) => new WaterholeSprite(this, session, id, map.tileWidth),
    );

    this.cameraController = new CameraController(
      this,
      this.unlockedBounds(map.tileWidth),
      () => this.updateHover(),
      (pointer) => this.isOverUI(pointer),
      // Safe here (unlike isOverUI): it re-runs this scene's own hit test with identical results.
      (pointer) => this.input.hitTestPointer(pointer).some((o) => o.getData('blocksDrag') === true),
    );
    this.cameras.main.centerOn(
      START_VIEW_TILE.x * map.tileWidth,
      START_VIEW_TILE.y * map.tileHeight,
    );

    this.input.on(Phaser.Input.Events.POINTER_MOVE, () => this.updateHover());
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.setHovered(null));
    // A click (not a drag) on open ground opens that zone's info panel.
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        const click = pointer.getDistance() <= BALANCE.render.animals.clickMaxMovePx;
        if (!click || over.length > 0 || this.isOverUI(pointer)) return;
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const zone = this.zones.find((z) => z.rect.contains(world.x, world.y));
        if (zone) eventBus.emit('zoneSelected', { zoneId: zone.id });
      },
    );
    const offZoneSelect = eventBus.on('zoneSelected', ({ zoneId }) =>
      this.overlay.setSelected(this.zones.find((z) => z.id === zoneId) ?? null),
    );
    const offAnimalSelect = eventBus.on('animalSelected', ({ group }) => {
      if (group) this.overlay.setSelected(null);
    });
    const offDegraded = eventBus.on('zoneDegradedChanged', () =>
      this.overlay.refreshDegraded((id) => session.state.zones[id]?.vegetation ?? 100),
    );
    const offSeason = eventBus.on('seasonChanged', ({ season }) => seasonTint.fadeTo(season));
    const offFail = eventBus.on('commandFailed', ({ reason, worldX, worldY }) => {
      if (worldX !== undefined && worldY !== undefined) {
        showFloatingText(this, worldX, worldY, t(reason), DEPTH.floatingText);
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offSeason();
      offFail();
      offZoneSelect();
      offAnimalSelect();
      offDegraded();
    });
  }

  override update(_time: number, delta: number): void {
    getSession(this).update(delta);
    for (const w of this.waterholes) w.update();
    this.herds.update(delta);
    this.cameraController.update(delta);
  }

  /** World-pixel rectangle around every unlocked zone: the camera stays inside it. */
  private unlockedBounds(tileSize: number): Bounds {
    const open = Object.values(getSession(this).state.zones)
      .filter((z) => z.unlocked)
      .map((z) => z.rect);
    const tiles = unionBounds(open);
    if (!tiles) throw new Error('No unlocked zones');
    return {
      x: tiles.x * tileSize,
      y: tiles.y * tileSize,
      w: tiles.w * tileSize,
      h: tiles.h * tileSize,
    };
  }

  private isOverUI(pointer: Phaser.Input.Pointer): boolean {
    if (!this.scene.isActive('UIScene')) return false;
    return (this.scene.get('UIScene') as UIScene).isPointerOverUI(pointer.x, pointer.y);
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
