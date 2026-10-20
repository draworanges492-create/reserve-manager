// Text and rows for money, buildings and staff (pure: no Phaser, so it can be tested).
import { BALANCE } from '../config/balance';
import {
  BUILDINGS,
  buildingDef,
  STAFF_ROLES,
  staffRole,
  waterholeDef,
  zoneDef,
} from '../core/content';
import { applyCommand, type Command } from '../core/Commands';
import type { GameState, StaffMember } from '../core/GameState';
import { t } from '../core/text';
import { expectedLedger } from '../sim/Economy';
import type { PanelContent, PanelLine } from './animalInfo';
import type { SideContent } from './SidePanel';

const round1 = (n: number): string => (Math.round(n * 10) / 10).toString();
const signed = (n: number): string => (n > 0 ? `+${round1(n)}` : n < 0 ? `−${round1(-n)}` : '0');

export function moneyText(state: GameState): { text: string; warn: boolean } {
  const money = Math.floor(state.resources.money);
  if (state.economy.inDebt) return { text: `${money} · ${t('money.inDebt')}`, warn: true };
  // Whole numbers in the top bar: decimals made the label run into the meters.
  const net = Math.round(expectedLedger(state).net);
  return { text: t('money.perDay', { money, net: signed(net) }), warn: net < 0 };
}

export function moneyTooltip(state: GameState): string[] {
  const l = expectedLedger(state);
  const lines = [t('money.tooltip.title', { money: Math.floor(state.resources.money) })];
  lines.push(t('money.tooltip.grant', { n: round1(l.grant) }));
  if (l.wages) lines.push(t('money.tooltip.wages', { n: round1(l.wages) }));
  if (l.upkeep) lines.push(t('money.tooltip.upkeep', { n: round1(l.upkeep) }));
  lines.push(t('money.tooltip.net', { n: signed(l.net) }));
  const unpaid = state.economy.lastDay?.wagesUnpaid ?? 0;
  if (unpaid) {
    lines.push(t('money.tooltip.unpaid', { n: round1(unpaid) }));
    lines.push(t('money.tooltip.debtRule', { days: BALANCE.staff.quitAfterUnpaidDays }));
  }
  return lines;
}

export function upkeepOf(cost: number): number {
  return (cost * BALANCE.economy.upkeepRate) / BALANCE.economy.upkeepPeriodDays;
}

/** Slots where `buildingId` could go right now, ignoring money (so "too expensive" still shows the spot). */
export function validSlotsFor(state: GameState, buildingId: string): string[] {
  const rich: GameState = {
    ...state,
    resources: { ...state.resources, money: Number.MAX_SAFE_INTEGER },
  };
  return Object.keys(state.slots).filter(
    (slotId) => applyCommand(rich, { type: 'build', slotId, buildingId }).ok,
  );
}

export function buildMenu(state: GameState, onPlace: (buildingId: string) => void): SideContent {
  return {
    title: t('build.title'),
    intro: [{ text: t('build.intro') }],
    rows: BUILDINGS.map((b) => {
      const locked = b.unlockChapter > state.chapter.current;
      const spots = locked ? [] : validSlotsFor(state, b.id);
      const lines: PanelLine[] = [
        { text: t('build.row', { name: b.name, cost: b.cost }) },
        { text: t('build.detail', { days: b.buildDays, upkeep: round1(upkeepOf(b.cost)) }) },
        { text: b.description },
      ];
      if (locked) lines.push({ text: t('build.locked', { chapter: b.unlockChapter }), warn: true });
      else if (b.upgradeOf && spots.length === 0) {
        lines.push({
          text: t('build.needsBase', { base: buildingDef(b.upgradeOf)?.name ?? b.upgradeOf }),
          warn: true,
        });
      } else if (spots.length === 0) lines.push({ text: t('build.noSpot'), warn: true });
      const affordable = state.resources.money >= b.cost;
      return {
        lines,
        actions: [
          {
            label: t('build.place'),
            enabled: spots.length > 0 && affordable,
            onClick: () => onPlace(b.id),
          },
        ],
      };
    }),
  };
}

/** "Ranger #3": number taken from the staff id. */
export function staffName(member: StaffMember): string {
  return t('staff.label', {
    name: staffRole(member.role)?.name ?? member.role,
    n: member.id.replace(/\D/g, ''),
  });
}

function zoneName(zoneId: string | null): string {
  return zoneId ? (zoneDef(zoneId)?.name ?? zoneId) : t('staff.unassigned');
}

/** Next patrol zone in a fixed cycle: HQ (unassigned) → each unlocked zone → HQ. */
export function nextZone(state: GameState, current: string | null): string | null {
  const open = Object.keys(state.zones).filter((id) => state.zones[id]?.unlocked);
  const cycle: (string | null)[] = [null, ...open];
  return cycle[(cycle.indexOf(current) + 1) % cycle.length] ?? null;
}

export function staffMenu(state: GameState, dispatch: (c: Command) => void): SideContent {
  const wages = state.staff.reduce((sum, s) => sum + (staffRole(s.role)?.wage ?? 0), 0);
  const members = state.staff.map((m) => {
    const lines: PanelLine[] = [
      { text: t('staff.member', { name: staffName(m), zone: zoneName(m.zoneId) }) },
      {
        text: t('staff.memberDetail', {
          morale: Math.round(m.morale),
          wage: staffRole(m.role)?.wage ?? 0,
        }),
      },
    ];
    if (m.unpaidDays > 0) {
      lines.push({
        text: t('staff.unpaid', { days: m.unpaidDays, max: BALANCE.staff.quitAfterUnpaidDays }),
        warn: true,
      });
    }
    return {
      lines,
      actions: [
        {
          label: t('staff.moveTo'),
          enabled: true,
          onClick: () =>
            dispatch({ type: 'assignStaff', staffId: m.id, zoneId: nextZone(state, m.zoneId) }),
        },
        {
          label: t('staff.dismiss'),
          enabled: true,
          onClick: () => dispatch({ type: 'dismissStaff', staffId: m.id }),
        },
      ],
    };
  });
  const hires = STAFF_ROLES.map((r) => {
    const locked = r.unlockChapter > state.chapter.current;
    const lines: PanelLine[] = [
      { text: t('staff.hireRow', { name: r.name, wage: r.wage }) },
      { text: r.description },
    ];
    if (locked) lines.push({ text: t('build.locked', { chapter: r.unlockChapter }), warn: true });
    return {
      lines,
      actions: [
        {
          label: t('staff.hire'),
          enabled: !locked && !state.economy.inDebt,
          onClick: () => dispatch({ type: 'hire', role: r.id }),
        },
      ],
    };
  });
  return {
    title: t('staff.title'),
    intro: [{ text: members.length ? t('staff.intro', { wages }) : t('staff.none') }],
    rows: [...members, ...hires],
  };
}

export function staffHover(state: GameState, staffId: string): string[] {
  const m = state.staff.find((s) => s.id === staffId);
  if (!m) return [];
  return [
    t('staff.hover', {
      name: staffName(m),
      zone: zoneName(m.zoneId),
      morale: Math.round(m.morale),
    }),
  ];
}

export function buildingHover(state: GameState, slotId: string): string[] {
  const b = state.slots[slotId]?.building;
  const def = b && buildingDef(b.buildingId);
  if (!b || !def) return [];
  const status =
    b.daysLeft > 0
      ? t('building.status.building', { days: b.daysLeft })
      : t('building.status.done');
  return [t('building.hover', { name: def.name, status })];
}

export function buildingPanelContent(
  state: GameState,
  slotId: string,
  dispatch: (c: Command) => void,
): PanelContent | null {
  const slot = state.slots[slotId];
  const b = slot?.building;
  const def = b && buildingDef(b.buildingId);
  if (!slot || !b || !def) return null;
  const lines: PanelLine[] = [];
  if (b.daysLeft > 0) {
    lines.push({ text: t('building.underConstruction', { days: b.daysLeft }) });
  } else {
    lines.push({ text: t('building.working') });
    for (const e of def.effects) {
      if (e.op === 'installPump' && e.pumpKind && slot.waterholeId) {
        lines.push({
          text: t('building.pumps', {
            n: BALANCE.water.pumpRefillPerDay[e.pumpKind],
            waterhole: waterholeDef(slot.waterholeId)?.name ?? slot.waterholeId,
          }),
        });
      }
      if (e.op === 'patrolBoost')
        lines.push({
          text: t('building.patrol', { zone: zoneName(slot.zoneId), n: e.value ?? 1 }),
        });
    }
    lines.push({ text: t('building.upkeep', { n: round1(upkeepOf(def.cost)) }) });
  }
  lines.push({ text: def.description });
  const refund = Math.floor(def.cost * BALANCE.economy.cancelRefund);
  return {
    title: def.name,
    subtitle: zoneName(slot.zoneId),
    portrait: `building-${def.id}`,
    lines,
    actions:
      b.daysLeft > 0
        ? [
            {
              label: t('building.cancel', { n: refund }),
              onClick: () => dispatch({ type: 'cancelBuild', slotId }),
            },
          ]
        : [],
  };
}
