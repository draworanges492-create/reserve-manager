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
import { BuildingLayer } from './BuildingLayer';
import { HerdLayer } from './HerdLayer';
import { ClueLayer } from './map/ClueLayer';
import { FenceLayer } from './map/FenceLayer';
import { StaffLayer } from './StaffLayer';
import { readZones, type ZoneArea } from './map/mapObjects';
import { SeasonTint } from './map/SeasonTint';
import { ZoneOverlay } from './map/ZoneOverlay';
import { getSession } from './session';
import type { UIScene } from './UIScene';
import { viewScale } from '../ui/view';

const TILE_LAYERS = [
  ['ground', DEPTH.ground],
  ['water', DEPTH.water],
  ['vegetation_deco', DEPTH.deco],
  ['objects', DEPTH.objects],
] as const;
/** Where the camera starts: between HQ and Waterhole A, in tiles. */
const START_VIEW_TILE = { x: 56, y: 60 };
const FOCUS_PAN_MS = 500;
const FADE_MS = 400;

/** The world view: tilemap, zones, fences, waterholes and herds. Drives the sim clock. */
export class GameScene extends Phaser.Scene {
  private zones: ZoneArea[] = [];
  private hovered: ZoneArea | null = null;
  private overlay!: ZoneOverlay;
  private cameraController!: CameraController;
  private waterholes: WaterholeSprite[] = [];
  private herds!: HerdLayer;
  private buildings!: BuildingLayer;
  private staff!: StaffLayer;
  private placing = false;
  private fences!: FenceLayer;
  private clues!: ClueLayer;

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
    const objects = layers[TILE_LAYERS.findIndex(([name]) => name === 'objects')];
    this.buildings = new BuildingLayer(this, session, map.tileWidth, objects);
    this.fences = new FenceLayer(this, map, session);
    this.clues = new ClueLayer(this, session, map.tileWidth);
    this.staff = new StaffLayer(this, session, this.zones, map.tileWidth, this.herds.blocked);
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
    this.cameras.main.fadeIn(FADE_MS);
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
        if (!click || over.length > 0 || this.placing || this.isOverUI(pointer)) return;
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
    const offSlotSelect = eventBus.on('slotSelected', ({ slotId }) => {
      if (slotId) this.overlay.setSelected(null);
    });
    const offBuildMode = eventBus.on('buildModeChanged', ({ buildingId }) => {
      this.placing = buildingId !== null;
    });
    // Story progress (or the dev chapter jump) opened zones: widen the camera, lift the fog.
    // Alerts and the Species menu ask the camera to go somewhere (spec §7.4).
    const offFocus = eventBus.on('focusRequested', ({ x, y }) => {
      this.cameras.main.pan(x * map.tileWidth, y * map.tileHeight, FOCUS_PAN_MS, 'Sine.easeInOut');
    });
    const offZones = eventBus.on('zonesChanged', () => {
      this.overlay.refreshLocks((id) => !!session.state.zones[id]?.unlocked);
      this.cameraController.setBounds(this.unlockedBounds(map.tileWidth));
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
      offZones();
      offFocus();
      offSlotSelect();
      offBuildMode();
    });
  }

  override update(_time: number, delta: number): void {
    getSession(this).update(delta);
    for (const w of this.waterholes) w.update();
    this.herds.update(delta);
    this.buildings.update();
    this.fences.update();
    this.clues.update();
    this.staff.update(delta);
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
    this.overlay.setHover(zone, this.cameras.main.zoom / viewScale());
    if (zone === this.hovered) return;
    this.hovered = zone;
    eventBus.emit('zoneHover', { zoneId: zone?.id ?? null });
  }
}
