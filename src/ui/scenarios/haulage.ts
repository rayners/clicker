import { formatNumber } from '../../shared/format';
import type { Store } from '../../core/store';
import { CARS, ENGINES, stationName } from '../../data/haulage/systems';
import { HAULAGE_UPGRADES } from '../../data/haulage/upgrades';
import {
  autoThrusterRate,
  availableHaulageUpgrades,
  carValue,
  effectiveBurn,
  engineThrust,
  fuelForLeg,
  incomeRate,
  isDocked,
  safeBurn,
  speed,
  thrust,
  thrusterPower,
  trainValue,
  legDistance,
} from '../../mission/haulage/economy';
import type { HaulageMission, MissionState } from '../../mission/state';
import { h } from '../../shared/ui/dom';
import { createHaulageSystemsPanel } from '../haulage-systems';
import { createHelm } from '../helm';
import { createRoute } from '../route';
import { createUpgradesPanel } from '../upgrades';
import type { MonitorRow, ScenarioUi } from './types';

const s = (m: MissionState) => m as HaulageMission;
const PERIOD_BASE = 1.1;
const PERIOD_STEP = 0.5;

const MONITOR: MonitorRow[] = [
  {
    id: 'pulse',
    label: 'PULSE TMR',
    period: 1,
    running: (m) => autoThrusterRate(s(m)) > 0,
    count: (m) => `${formatNumber(autoThrusterRate(s(m)))} BURST/S`,
    output: (m) => `${formatNumber(autoThrusterRate(s(m)) * thrusterPower(s(m)))} KM/S`,
  },
  ...ENGINES.map((e, i) => ({
    id: e.id,
    label: e.short,
    period: PERIOD_BASE + (i % 4) * PERIOD_STEP,
    running: (m: MissionState) => (s(m).engines[e.id] ?? 0) > 0 && s(m).fuel > 0 && !isDocked(s(m)),
    count: (m: MissionState) => `×${s(m).engines[e.id] ?? 0}`,
    output: (m: MissionState) => `${formatNumber((s(m).engines[e.id] ?? 0) * engineThrust(s(m), e))} THR`,
  })),
  ...CARS.map((c, i) => ({
    id: c.id,
    label: c.short,
    period: 2 + i * 0.4,
    running: (m: MissionState) => (s(m).cars[c.id] ?? 0) > 0,
    count: (m: MissionState) => `×${s(m).cars[c.id] ?? 0}`,
    output: (m: MissionState) => `${formatNumber((s(m).cars[c.id] ?? 0) * carValue(s(m), c))} CR/KM`,
  })),
];

export function createHaulageUi(store: Store): ScenarioUi {
  const systems = createHaulageSystemsPanel(store);
  const upgrades = createUpgradesPanel<HaulageMission>(store, { all: HAULAGE_UPGRADES, available: availableHaulageUpgrades });
  const helm = createHelm(store);
  const route = createRoute();
  return {
    flow: {
      cells: [
        { label: 'SPEED', aria: 'Speed', unit: 'KM/S' },
        { label: 'FREIGHT', aria: 'Freight value', unit: 'CR/KM' },
        { label: 'INCOME', aria: 'Income', unit: 'CR/S' },
      ],
      identity: (m) => `${m.config.shipName}:${m.seed}`,
      meterLabel: 'Leg travelled',
      rateUnit: 'CR/S',
      read: (mission) => {
        const m = s(mission);
        const burn = effectiveBurn(m);
        const v = (m.fuel > 0 ? speed(m, burn) : 0) + autoThrusterRate(m) * thrusterPower(m);
        const income = incomeRate(m);
        const base = {
          values: [v, trainValue(m), income] as [number, number, number],
          meter: isDocked(m) ? 0 : (m.travelled / legDistance(m.leg)) * 100,
          rate: income,
        };
        if (isDocked(m)) {
          return { ...base, limit: 'docked', highlight: null, severe: false, note: `DOCKED AT ${stationName(m.leg - 1)} · REFUEL BEFORE DEPARTURE` };
        }
        if (thrust(m) === 0) {
          return { ...base, limit: 'thrust', highlight: 0, severe: false, note: 'NO MAIN ENGINES · FIRE THRUSTERS OR FIT ENGINES IN SYSTEMS' };
        }
        if (m.fuel <= 0) {
          return { ...base, limit: 'fuel', highlight: 0, severe: true, note: 'TANKS DRY · COASTING ON THRUSTERS · REFUEL AT THE NEXT STATION' };
        }
        if (burn > safeBurn(m)) {
          return { ...base, limit: 'strain', highlight: 1, severe: true, note: `BURN ${burn} PAST THE STRAIN LINE (${safeBurn(m)}) · FREIGHT TAKING DAMAGE` };
        }
        if (m.fuel < fuelForLeg(m)) {
          return { ...base, limit: 'fuel', highlight: 0, severe: true, note: `FUEL SHORT FOR THIS LEG · ${formatNumber(fuelForLeg(m) - m.fuel)} MORE NEEDED` };
        }
        return { ...base, limit: 'thrust', highlight: 0, severe: false, note: `BOUND FOR ${stationName(m.leg)} · BURN ${burn}` };
      },
    },
    monitor: MONITOR,
    stats: [
      { label: 'CREDITS', aria: 'Credits', read: (m) => formatNumber(m.credits) },
      { label: 'LEGS', aria: 'Legs delivered', read: (m) => String(s(m).leg) },
      { label: 'THRUST', aria: 'Total thrust', read: (m) => formatNumber(thrust(s(m))) },
    ],
    action: {
      label: 'FIRE THRUSTERS',
      aria: 'Fire thrusters',
      action: { type: 'fireThrusters' },
      perPress: (m) => thrusterPower(s(m)),
      autoRate: (m) => autoThrusterRate(s(m)),
      autoYieldPerSecond: (m) => autoThrusterRate(s(m)) * thrusterPower(s(m)),
    },
    systems: { el: systems.el, render: (m) => systems.render(s(m)) },
    upgrades: { el: upgrades.el, render: (m) => upgrades.render(s(m)), hasAny: (m) => upgrades.hasAny(s(m)) },
    controls: {
      el: h('div', { class: 'haul-controls' }, helm.el, route.el),
      render: (m) => {
        helm.render(s(m));
        route.render(s(m));
      },
    },
  };
}
