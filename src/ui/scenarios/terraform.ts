import { formatNumber } from '../../shared/format';
import type { Store } from '../../core/store';
import { PROCESSORS, REACTORS } from '../../data/terraform/systems';
import { TERRAFORM_UPGRADES } from '../../data/terraform/upgrades';
import {
  autoSurgeRate,
  availableTerraformUpgrades,
  capacity,
  colonistWaves,
  incomeRate,
  power,
  processorRate,
  specMatch,
  specRevision,
  surgePower,
  throughput,
} from '../../mission/terraform/economy';
import type { MissionState, TerraformMission } from '../../mission/state';
import { createAllocation } from '../allocation';
import { createTerraformSystemsPanel } from '../terraform-systems';
import { createUpgradesPanel } from '../upgrades';
import type { MonitorRow, ScenarioUi } from './types';

const t = (m: MissionState) => m as TerraformMission;
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
/** Below this, being off-spec is the thing costing the most money. */
const MATCH_WARNING = 0.9;
const PERIOD_BASE = 1.1;
const PERIOD_STEP = 0.5;

const MONITOR: MonitorRow[] = [
  {
    id: 'autosurge',
    label: 'AUTOSURGE',
    period: 1,
    running: (m) => autoSurgeRate(t(m)) > 0,
    count: (m) => `${formatNumber(autoSurgeRate(t(m)))} SRG/S`,
    output: (m) => `${formatNumber(autoSurgeRate(t(m)) * surgePower(t(m)))}/S`,
  },
  ...REACTORS.map((r, i) => ({
    id: r.id,
    label: r.short,
    period: 2 + i * 0.4,
    running: (m: MissionState) => (t(m).reactors[r.id] ?? 0) > 0,
    count: (m: MissionState) => `×${t(m).reactors[r.id] ?? 0}`,
    output: (m: MissionState) => `${formatNumber((t(m).reactors[r.id] ?? 0) * r.mw)} MW`,
  })),
  ...PROCESSORS.map((p, i) => ({
    id: p.id,
    label: p.short,
    period: PERIOD_BASE + (i % 4) * PERIOD_STEP,
    running: (m: MissionState) => (t(m).processors[p.id] ?? 0) > 0,
    count: (m: MissionState) => `×${t(m).processors[p.id] ?? 0}`,
    output: (m: MissionState) => `${formatNumber((t(m).processors[p.id] ?? 0) * processorRate(t(m), p))}/S`,
  })),
];

export function createTerraformUi(store: Store): ScenarioUi {
  const systems = createTerraformSystemsPanel(store);
  const upgrades = createUpgradesPanel<TerraformMission>(store, { all: TERRAFORM_UPGRADES, available: availableTerraformUpgrades });
  const allocation = createAllocation(store);
  return {
    flow: {
      cells: [
        { label: 'SUPPLY', aria: 'Available power', unit: 'MW' },
        { label: 'PROCESS', aria: 'Processing rate', unit: 'U/S' },
        { label: 'INCOME', aria: 'Income', unit: 'CR/S' },
      ],
      identity: (m) => `${m.config.shipName}:${m.seed}`,
      meterLabel: 'Spec match',
      rateUnit: 'U/S',
      read: (mission) => {
        const m = t(mission);
        const supply = power(m);
        const demand = sum(capacity(m));
        const rate = sum(throughput(m));
        const match = specMatch(m);
        const base = { values: [supply, rate, incomeRate(m)] as [number, number, number], meter: match * 100, rate };
        if (demand === 0) {
          return { ...base, limit: 'processing', highlight: 1, severe: false, note: 'NO PROCESSORS ONLINE · SURGE OR BUILD IN SYSTEMS' };
        }
        if (match < MATCH_WARNING) {
          return { ...base, limit: 'balance', highlight: null, severe: true, note: `OFF SPEC · ${Math.round(match * 100)}% MATCH · REBALANCE ALLOCATION` };
        }
        if (demand > supply) {
          return { ...base, limit: 'power', highlight: 0, severe: true, note: `POWER-LIMITED · ${formatNumber(demand - supply)} MW SHORT · BUILD REACTORS` };
        }
        return { ...base, limit: 'processing', highlight: 1, severe: false, note: `${formatNumber(supply - demand)} MW SPARE · ADD PROCESSORS` };
      },
    },
    monitor: MONITOR,
    stats: [
      { label: 'CREDITS', aria: 'Credits', read: (m) => formatNumber(m.credits) },
      { label: 'COLONY', aria: 'Colony waves thawed', read: (m) => `${colonistWaves(t(m))} WAVES` },
      { label: 'SPEC', aria: 'Spec revision', read: (m) => `REV ${specRevision(t(m))}` },
    ],
    action: {
      label: 'FIRE PROCESSOR SURGE',
      aria: 'Fire processor surge',
      action: { type: 'surge' },
      perPress: (m) => surgePower(t(m)),
      autoRate: (m) => autoSurgeRate(t(m)),
      autoYieldPerSecond: (m) => autoSurgeRate(t(m)) * surgePower(t(m)),
    },
    systems: { el: systems.el, render: (m) => systems.render(t(m)) },
    upgrades: { el: upgrades.el, render: (m) => upgrades.render(t(m)), hasAny: (m) => upgrades.hasAny(t(m)) },
    controls: { el: allocation.el, render: (m) => allocation.render(t(m)) },
  };
}
