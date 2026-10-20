import { formatNumber } from '../../shared/format';
import type { Store } from '../../core/store';
import { GENERATORS } from '../../data/extraction/generators';
import { UPGRADES } from '../../data/extraction/upgrades';
import {
  autoDrillOutput,
  autoDrillRate,
  bottleneck,
  clickPower,
  creditRate,
  generatorRate,
  oreRate,
  refineryCapacity,
} from '../../mission/extraction/economy';
import { depth } from '../../mission/extraction/progress';
import { availableUpgrades } from '../../mission/extraction/upgrades';
import type { ExtractionMission, MissionState } from '../../mission/state';
import { createSystemsPanel } from '../systems';
import { createUpgradesPanel } from '../upgrades';
import type { MonitorRow, ScenarioUi } from './types';

const x = (m: MissionState) => m as ExtractionMission;

/** Seconds per visual work cycle; deeper systems run slower, heavier cycles. */
const PERIOD_BASE = 1.2;
const PERIOD_STEP = 0.45;

const MONITOR: MonitorRow[] = [
  {
    id: 'autocycle',
    label: 'AUTOCYCLE',
    period: 1,
    running: (m) => autoDrillRate(x(m)) > 0,
    count: (m) => `${formatNumber(autoDrillRate(x(m)))} CYC/S`,
    output: (m) => `${formatNumber(autoDrillOutput(x(m)))}/S`,
  },
  ...GENERATORS.map((g, i) => ({
    id: g.id,
    label: g.short,
    period: PERIOD_BASE + i * PERIOD_STEP,
    running: (m: MissionState) => (x(m).generators[g.id] ?? 0) > 0,
    count: (m: MissionState) => `×${x(m).generators[g.id] ?? 0}`,
    output: (m: MissionState) => `${formatNumber((x(m).generators[g.id] ?? 0) * generatorRate(x(m), g))}/S`,
  })),
];

export function createExtractionUi(store: Store): ScenarioUi {
  const systems = createSystemsPanel(store);
  const upgrades = createUpgradesPanel<ExtractionMission>(store, { all: UPGRADES, available: availableUpgrades });
  return {
    flow: {
      cells: [
        { label: 'EXTRACT', aria: 'Ore per second', unit: 'ORE/S' },
        { label: 'REFINE', aria: 'Refinery throughput', unit: 'ORE/S' },
        { label: 'INCOME', aria: 'Income', unit: 'CR/S' },
      ],
      identity: (m) => `${m.config.shipName}:${m.seed}`,
      meterLabel: 'Refinery load',
      rateUnit: 'ORE/S',
      read: (mission) => {
        const m = x(mission);
        const rate = oreRate(m);
        const cap = refineryCapacity(m);
        const load = Math.min(1, rate / cap) * 100;
        const limit = bottleneck(m);
        return {
          values: [rate, cap, creditRate(m)],
          meter: load,
          limit,
          highlight: limit === 'refinery' ? 1 : 0,
          severe: limit === 'refinery',
          rate,
          note:
            limit === 'refinery'
              ? `REFINERY AT CAPACITY · ${formatNumber(rate - cap)} ORE/S BACKING UP`
              : rate === 0
                ? 'REFINERY IDLE · DRILL OR ACQUIRE EXTRACTION'
                : `${100 - Math.round(load)}% SPARE CAPACITY · ADD EXTRACTION`,
        };
      },
    },
    monitor: MONITOR,
    stats: [
      { label: 'ORE HOPPER', aria: 'Ore', read: (m) => formatNumber(x(m).ore) },
      { label: 'CREDITS', aria: 'Credits', read: (m) => formatNumber(m.credits) },
      { label: 'DEPTH', aria: 'Shaft depth', read: (m) => `${depth(x(m)).toLocaleString('en-US')} M` },
    ],
    action: {
      label: 'EXECUTE DRILL CYCLE',
      aria: 'Execute drill cycle',
      action: { type: 'drill' },
      perPress: (m) => clickPower(x(m)),
      autoRate: (m) => autoDrillRate(x(m)),
      autoYieldPerSecond: (m) => autoDrillOutput(x(m)),
    },
    systems: { el: systems.el, render: (m) => systems.render(x(m)) },
    upgrades: { el: upgrades.el, render: (m) => upgrades.render(x(m)), hasAny: (m) => upgrades.hasAny(x(m)) },
  };
}
