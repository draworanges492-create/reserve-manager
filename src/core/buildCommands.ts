// Building and staff commands (spec §4 Commands; §7.2 building, §7.3 staff).
import { BALANCE } from '../config/balance';
import { adjustScore } from '../sim/Scores';
import { buildingDef, staffRole, zoneDef } from './content';
import type { CommandResult } from './Commands';
import type { GameState, StaffMember } from './GameState';

const fail = (reason: Extract<CommandResult, { ok: false }>['reason']): CommandResult => ({
  ok: false,
  reason,
});

export function build(state: GameState, slotId: string, buildingId: string): CommandResult {
  const slot = state.slots[slotId];
  if (!slot) return fail('command.unknownSlot');
  const def = buildingDef(buildingId);
  if (!def) return fail('command.unknownBuilding');
  if (def.unlockChapter > state.chapter.current) return fail('command.notYetAvailable');
  if (!state.zones[slot.zoneId]?.unlocked) return fail('command.zoneLocked');
  if (def.slotType !== slot.slotType) return fail('command.wrongSlot');

  const existing = slot.building;
  if (def.upgradeOf) {
    if (!existing || existing.buildingId !== def.upgradeOf || existing.daysLeft > 0)
      return fail('command.needsUpgradeBase');
  } else if (existing) {
    return fail('command.slotOccupied');
  }
  if (state.resources.money < def.cost) return fail('command.notEnoughMoney');

  return {
    ok: true,
    state: {
      ...state,
      resources: { ...state.resources, money: state.resources.money - def.cost },
      slots: {
        ...state.slots,
        [slotId]: {
          ...slot,
          building: {
            buildingId,
            daysLeft: def.buildDays,
            ...(def.upgradeOf ? { replaces: def.upgradeOf } : {}),
          },
        },
      },
    },
    events: [{ type: 'constructionStarted', payload: { slotId, buildingId } }],
  };
}

/** Spec §7.2: cancelling refunds 50%; an upgrade falls back to what it replaced. */
export function cancelBuild(state: GameState, slotId: string): CommandResult {
  const slot = state.slots[slotId];
  const building = slot?.building;
  if (!slot || !building || building.daysLeft <= 0) return fail('command.nothingToCancel');
  const refund = Math.floor(
    (buildingDef(building.buildingId)?.cost ?? 0) * BALANCE.economy.cancelRefund,
  );
  return {
    ok: true,
    state: {
      ...state,
      resources: { ...state.resources, money: state.resources.money + refund },
      slots: {
        ...state.slots,
        [slotId]: {
          ...slot,
          building: building.replaces ? { buildingId: building.replaces, daysLeft: 0 } : null,
        },
      },
    },
    events: [{ type: 'constructionCancelled', payload: { slotId, refund } }],
  };
}

export function hire(state: GameState, roleId: string): CommandResult {
  const role = staffRole(roleId);
  if (!role) return fail('command.unknownRole');
  if (role.unlockChapter > state.chapter.current) return fail('command.notYetAvailable');
  if (state.economy.inDebt) return fail('command.cantHireInDebt');
  const member: StaffMember = {
    id: `staff_${state.nextStaffNumber}`,
    role: roleId,
    zoneId: null,
    morale: BALANCE.staff.startMorale,
    unpaidDays: 0,
  };
  return {
    ok: true,
    // Spec §6.8: local jobs build community trust.
    state: adjustScore(
      { ...state, staff: [...state.staff, member], nextStaffNumber: state.nextStaffNumber + 1 },
      'trust',
      BALANCE.scores.trustPerHire,
      'score.reason.hired',
    ),
    events: [{ type: 'staffHired', payload: { staffId: member.id, role: roleId } }],
  };
}

export function assignStaff(
  state: GameState,
  staffId: string,
  zoneId: string | null,
): CommandResult {
  const member = state.staff.find((s) => s.id === staffId);
  if (!member) return fail('command.unknownStaff');
  if (zoneId !== null && !state.zones[zoneId]?.unlocked) return fail('command.zoneLocked');
  return {
    ok: true,
    state: { ...state, staff: state.staff.map((s) => (s.id === staffId ? { ...s, zoneId } : s)) },
    events: [{ type: 'staffChanged', payload: { staffId } }],
  };
}

export function dismissStaff(state: GameState, staffId: string): CommandResult {
  if (!state.staff.some((s) => s.id === staffId)) return fail('command.unknownStaff');
  return {
    ok: true,
    state: adjustScore(
      { ...state, staff: state.staff.filter((s) => s.id !== staffId) },
      'trust',
      BALANCE.scores.trustPerDismissal,
      'score.reason.dismissed',
    ),
    events: [{ type: 'staffChanged', payload: { staffId } }],
  };
}

/** Can the player mend this fence now? Its zone is open, or due this chapter and facing open land. */
export function fenceRepairable(state: GameState, segmentId: string): boolean {
  const fence = state.fences[segmentId];
  if (!fence || fence.status !== 'broken') return false;
  if (state.zones[fence.zoneId]?.unlocked) return true;
  const due = (zoneDef(fence.zoneId)?.unlockChapter ?? Infinity) <= state.chapter.current;
  return due && fence.borders !== null && state.zones[fence.borders]?.unlocked === true;
}

/** Spec §7.1 chore: patch a fence segment by hand (costs money, takes a day). */
export function repairFence(state: GameState, segmentId: string): CommandResult {
  const fence = state.fences[segmentId];
  if (!fence) return fail('command.unknownFence');
  if (fence.status !== 'broken') return fail('command.fenceNotBroken');
  if (!fenceRepairable(state, segmentId)) return fail('command.fenceNotYet');
  const { repairCost, repairDays } = BALANCE.fences;
  if (state.resources.money < repairCost) return fail('command.notEnoughMoney');
  return {
    ok: true,
    state: {
      ...state,
      resources: { ...state.resources, money: state.resources.money - repairCost },
      fences: {
        ...state.fences,
        [segmentId]: { ...fence, status: 'repairing', daysLeft: repairDays },
      },
    },
    events: [{ type: 'fenceRepairStarted', payload: { segmentId } }],
  };
}
