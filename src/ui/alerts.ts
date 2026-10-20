// Alert rules (spec §7.4 alerts feed): which game events become alerts, how serious they
// are, where the camera should go, and which events clear them. Pure, so it's testable.
import { buildingDef, speciesDef, staffRole, waterholeDef, zoneDef } from '../core/content';
import type { GameEvents } from '../core/EventBus';
import type { GameState } from '../core/GameState';
import { t } from '../core/text';
import { chapterDef, journalTemplate } from '../story/content';

export type Severity = 'info' | 'warning' | 'critical';

/** What clicking an alert opens after the camera arrives. */
export type AlertTarget =
  | { kind: 'zone'; zoneId: string }
  | { kind: 'animal'; zoneId: string; speciesId: string }
  | { kind: 'slot'; slotId: string }
  | { kind: 'waterhole'; waterholeId: string };

export interface Alert {
  /** Same key = same situation: a newer alert replaces the older one. */
  key: string;
  severity: Severity;
  text: string;
  /** World position (tiles) to pan to, if any. */
  focus?: { x: number; y: number };
  target?: AlertTarget;
  day: number;
}

/** Result of one event: alerts to add and keys of alerts that are now resolved. */
export interface AlertChange {
  add?: Alert;
  clear?: string;
}

type EventOf<K extends keyof GameEvents> = { type: K; payload: GameEvents[K] };
export type AlertEvent =
  | EventOf<'waterholeStateChanged'>
  | EventOf<'populationCritical'>
  | EventOf<'zoneDegradedChanged'>
  | EventOf<'staffQuit'>
  | EventOf<'debtChanged'>
  | EventOf<'buildingCompleted'>
  | EventOf<'seasonChanged'>
  | EventOf<'goalCompleted'>
  | EventOf<'journalAdded'>
  | EventOf<'encyclopediaUnlocked'>;

/** Info alerts fade after this many in-game days; warnings stay until resolved or dismissed. */
export const INFO_LIFETIME_DAYS = 2;

function zoneCentre(state: GameState, zoneId: string): { x: number; y: number } | undefined {
  const r = state.zones[zoneId]?.rect;
  return r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : undefined;
}

export function alertFor(state: GameState, event: AlertEvent): AlertChange | null {
  const day = state.clock.day;
  switch (event.type) {
    case 'waterholeStateChanged': {
      const { id, state: level } = event.payload;
      const hole = state.waterholes[id];
      const key = `water:${id}`;
      if (!hole || !state.zones[hole.zoneId]?.unlocked) return null;
      if (level === 'clear' || level === 'muddy') return { clear: key };
      const name = waterholeDef(id)?.name ?? id;
      return {
        add: {
          key,
          severity: level === 'dry' ? 'critical' : 'warning',
          text: t(level === 'dry' ? 'alert.waterDry' : 'alert.waterDrying', { name }),
          focus: { x: hole.x, y: hole.y },
          target: { kind: 'waterhole', waterholeId: id },
          day,
        },
      };
    }
    case 'populationCritical': {
      const { zoneId, speciesId, count } = event.payload;
      return {
        add: {
          key: `critical:${zoneId}:${speciesId}`,
          severity: 'critical',
          text: t('alert.critical', {
            species: speciesDef(speciesId)?.name ?? speciesId,
            count,
            zone: zoneDef(zoneId)?.name ?? zoneId,
          }),
          focus: zoneCentre(state, zoneId),
          target: { kind: 'animal', zoneId, speciesId },
          day,
        },
      };
    }
    case 'zoneDegradedChanged': {
      const { zoneId, degraded } = event.payload;
      const zone = zoneDef(zoneId)?.name ?? zoneId;
      const base = {
        focus: zoneCentre(state, zoneId),
        target: { kind: 'zone', zoneId } as const,
        day,
      };
      return degraded
        ? {
            add: {
              key: `degraded:${zoneId}`,
              severity: 'warning',
              text: t('alert.degraded', { zone }),
              ...base,
            },
          }
        : {
            clear: `degraded:${zoneId}`,
            add: {
              key: `recovered:${zoneId}`,
              severity: 'info',
              text: t('alert.recovered', { zone }),
              ...base,
            },
          };
    }
    case 'staffQuit':
      return {
        add: {
          key: `quit:${event.payload.staffId}`,
          severity: 'warning',
          text: t('alert.staffQuit', {
            role: (staffRole(event.payload.role)?.name ?? event.payload.role).toLowerCase(),
          }),
          day,
        },
      };
    case 'debtChanged':
      return event.payload.inDebt
        ? { add: { key: 'debt', severity: 'critical', text: t('alert.debt'), day } }
        : {
            clear: 'debt',
            add: { key: 'debt-cleared', severity: 'info', text: t('alert.debtCleared'), day },
          };
    case 'buildingCompleted': {
      const { slotId, buildingId } = event.payload;
      const slot = state.slots[slotId];
      return {
        add: {
          key: `built:${slotId}`,
          severity: 'info',
          text: t('alert.built', {
            building: buildingDef(buildingId)?.name ?? buildingId,
            zone: slot ? (zoneDef(slot.zoneId)?.name ?? slot.zoneId) : '',
          }),
          focus: slot
            ? { x: slot.rect.x + slot.rect.w / 2, y: slot.rect.y + slot.rect.h / 2 }
            : undefined,
          target: { kind: 'slot', slotId },
          day,
        },
      };
    }
    case 'goalCompleted': {
      const goal = chapterDef(event.payload.chapter)?.goals.find(
        (g) => g.id === event.payload.goalId,
      );
      // Drop progress counters like "(3/3)" — it's done.
      const text = (goal?.text ?? event.payload.goalId).replace(/\s*\(.*\)$/, '');
      return {
        add: {
          key: `goal:${event.payload.goalId}`,
          severity: 'info',
          text: t('story.goalDone', { goal: text }),
          day,
        },
      };
    }
    case 'journalAdded': {
      const title = journalTemplate(event.payload.entryId)?.title;
      return title
        ? {
            add: {
              key: 'journal',
              severity: 'info',
              text: t('story.journalUpdated', { title }),
              day,
            },
          }
        : null;
    }
    case 'encyclopediaUnlocked': {
      const name = speciesDef(event.payload.speciesId)?.name ?? event.payload.speciesId;
      return {
        add: {
          key: `enc:${event.payload.speciesId}`,
          severity: 'info',
          text: t('alert.encyclopedia', { name }),
          day,
        },
      };
    }
    case 'seasonChanged':
      return {
        add: {
          key: 'season',
          severity: 'info',
          text: t(event.payload.season === 'dry' ? 'alert.season.dry' : 'alert.season.wet'),
          day,
        },
      };
  }
}

/** Keeps the alert list: newest first, one per key, info alerts expire. */
export class AlertList {
  private items: Alert[] = [];

  get all(): readonly Alert[] {
    return this.items;
  }

  apply(change: AlertChange | null): void {
    if (!change) return;
    if (change.clear) this.remove(change.clear);
    if (change.add) {
      const add = change.add;
      this.items = [add, ...this.items.filter((a) => a.key !== add.key)];
    }
  }

  remove(key: string): void {
    this.items = this.items.filter((a) => a.key !== key);
  }

  expire(today: number): void {
    this.items = this.items.filter(
      (a) => a.severity !== 'info' || today - a.day < INFO_LIFETIME_DAYS,
    );
  }
}
