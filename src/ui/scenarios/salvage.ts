import { formatNumber } from '../../shared/format';
import type { Store } from '../../core/store';
import { COMPARTMENTS, CUTTERS, SHORING } from '../../data/salvage/systems';
import { SALVAGE_UPGRADES } from '../../data/salvage/upgrades';
import {
  autoCutRate,
  availableSalvageUpgrades,
  cutForce,
  cutPower,
  cutterForce,
  frontierForce,
  holdNeeded,
  incomeRate,
  isSealed,
  shoringHold,
  torchFactor,
  effectiveNotch,
} from '../../mission/salvage/economy';
import type { MissionState, SalvageMission } from '../../mission/state';
import { frontier, held } from '../../shared/ground';
import { h } from '../../shared/ui/dom';
import { createSalvageSystemsPanel } from '../salvage-systems';
import { createSite } from '../site';
import { createTorch } from '../torch';
import { createUpgradesPanel } from '../upgrades';
import type { MonitorRow, ScenarioUi } from './types';

const s = (m: MissionState) => m as SalvageMission;
const PERIOD_BASE = 1.1;
const PERIOD_STEP = 0.5;

const MONITOR: MonitorRow[] = [
  {
    id: 'autocut',
    label: 'CUT PULSE',
    period: 1,
    running: (m) => autoCutRate(s(m)) > 0,
    count: (m) => `${formatNumber(autoCutRate(s(m)))} CUT/S`,
    output: (m) => `${formatNumber(autoCutRate(s(m)) * cutPower(s(m)))} CUT`,
  },
  ...SHORING.map((x, i) => ({
    id: x.id,
    label: x.short,
    period: 2 + i * 0.4,
    running: (m: MissionState) => (s(m).shoring[x.id] ?? 0) > 0,
    count: (m: MissionState) => `×${s(m).shoring[x.id] ?? 0}`,
    output: (m: MissionState) => `HOLD ${formatNumber(shoringHold({ ...s(m), shoring: { [x.id]: s(m).shoring[x.id] ?? 0 } }))}`,
  })),
  ...CUTTERS.map((c, i) => ({
    id: c.id,
    label: c.short,
    period: PERIOD_BASE + (i % 4) * PERIOD_STEP,
    running: (m: MissionState) => (s(m).cutters[c.id] ?? 0) > 0,
    count: (m: MissionState) => `×${s(m).cutters[c.id] ?? 0}`,
    output: (m: MissionState) => `${formatNumber((s(m).cutters[c.id] ?? 0) * cutterForce(s(m), c))} CUT`,
  })),
];

export function createSalvageUi(store: Store): ScenarioUi {
  const systems = createSalvageSystemsPanel(store);
  const upgrades = createUpgradesPanel<SalvageMission>(store, { all: SALVAGE_UPGRADES, available: availableSalvageUpgrades });
  const torch = createTorch(store);
  const site = createSite({
    sections: COMPARTMENTS,
    label: 'Derelict compartments',
    words: { secured: 'OPEN', contested: 'BUCKLING', frontier: 'CUTTING', lost: 'SHUT' },
  });
  return {
    flow: {
      cells: [
        { label: 'CUTTING', aria: 'Cutting force', unit: 'CUT' },
        { label: 'SHORING', aria: 'Shoring', unit: 'HOLD' },
        { label: 'INCOME', aria: 'Income', unit: 'CR/S' },
      ],
      identity: (m) => `${m.config.shipName}:${m.seed}`,
      meterLabel: 'Compartment cut',
      rateUnit: 'CR/S',
      read: (mission) => {
        const m = s(mission);
        const line = frontier(m.ground);
        const income = incomeRate(m);
        const hold = shoringHold(m);
        const base = {
          values: [frontierForce(m), hold, income] as [number, number, number],
          meter: line < COMPARTMENTS.length ? m.ground[line]!.control * 100 : 100,
          rate: income,
        };
        const need = holdNeeded(m);
        if (line >= COMPARTMENTS.length) {
          return { ...base, limit: 'stripped', highlight: null, severe: false, note: 'DERELICT OPEN · EVERY COMPARTMENT UNDER CLAIM' };
        }
        if (isSealed(m)) {
          return { ...base, limit: 'breach', highlight: 0, severe: true, note: `${COMPARTMENTS[line]!.name} SEALED AFTER A BREACH · ${Math.ceil(m.sealedFor)} S · KEEP THE TORCH UNDER THE LINE` };
        }
        if (cutForce(m) === 0 && autoCutRate(m) === 0) {
          return { ...base, limit: 'cutting', highlight: 0, severe: false, note: 'NO CUTTERS ABOARD · CUT BY HAND OR HIRE IN SYSTEMS' };
        }
        if (hold < need) {
          return { ...base, limit: 'shoring', highlight: 1, severe: true, note: `SHORING SHORT · HOLDING ${formatNumber(hold)} OF ${formatNumber(need)} · COMPARTMENTS BUCKLING` };
        }
        return {
          ...base,
          limit: 'cutting',
          highlight: 0,
          severe: false,
          note: `CUTTING ${COMPARTMENTS[line]!.name} AT NOTCH ${effectiveNotch(m)} (x${torchFactor(effectiveNotch(m)).toFixed(1)}) · ${held(m.ground)} OF ${COMPARTMENTS.length} OPEN`,
        };
      },
    },
    monitor: MONITOR,
    stats: [
      { label: 'CREDITS', aria: 'Credits', read: (m) => formatNumber(m.credits) },
      { label: 'OPEN', aria: 'Compartments open', read: (m) => `${held(s(m).ground)}/${COMPARTMENTS.length}` },
      { label: 'BREACHES', aria: 'Breaches', read: (m) => String(s(m).breaches) },
    ],
    sprites: { vessel: 'salvager', target: 'derelict', action: 'torch' },
    action: {
      label: 'CUT',
      aria: 'Cut',
      action: { type: 'cut' },
      perPress: (m) => cutPower(s(m)) * torchFactor(effectiveNotch(s(m))),
      autoRate: (m) => autoCutRate(s(m)),
      autoYieldPerSecond: (m) => autoCutRate(s(m)) * cutPower(s(m)) * torchFactor(effectiveNotch(s(m))),
    },
    systems: { el: systems.el, render: (m) => systems.render(s(m)) },
    upgrades: { el: upgrades.el, render: (m) => upgrades.render(s(m)), hasAny: (m) => upgrades.hasAny(s(m)) },
    controls: {
      el: h('div', { class: 'sec-controls' }, torch.el, site.el),
      render: (m) => {
        torch.render(s(m));
        site.render(s(m), isSealed(s(m)) ? 'SEALED' : undefined);
      },
    },
  };
}
