import { formatNumber } from '../../shared/format';
import type { Store } from '../../core/store';
import type { HaulProfile } from '../../mission/haulage/profiles';
import type { HaulWords } from '../haul-words';
import {
  autoThrusterRate,
  availableHaulageUpgrades,
  carValue,
  currentSpeed,
  effectiveBurn,
  engineThrust,
  fuelForLeg,
  incomeRate,
  isDocked,
  safeBurn,
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

function monitorRows(profile: HaulProfile, words: HaulWords): MonitorRow[] {
  return [
  {
    id: 'pulse',
    label: words.timer,
    period: 1,
    running: (m) => autoThrusterRate(s(m)) > 0,
    count: (m) => `${formatNumber(autoThrusterRate(s(m)))} BURST/S`,
    output: (m) => `${formatNumber(autoThrusterRate(s(m)) * thrusterPower(s(m)))} KM/S`,
  },
  ...profile.engines.map((e, i) => ({
    id: e.id,
    label: e.short,
    period: PERIOD_BASE + (i % 4) * PERIOD_STEP,
    running: (m: MissionState) => (s(m).engines[e.id] ?? 0) > 0 && s(m).fuel > 0 && !isDocked(s(m)),
    count: (m: MissionState) => `×${s(m).engines[e.id] ?? 0}`,
    output: (m: MissionState) => `${formatNumber((s(m).engines[e.id] ?? 0) * engineThrust(s(m), e))} THR`,
  })),
  ...profile.cars.map((c, i) => ({
    id: c.id,
    label: c.short,
    period: 2 + i * 0.4,
    running: (m: MissionState) => (s(m).cars[c.id] ?? 0) > 0,
    count: (m: MissionState) => `×${s(m).cars[c.id] ?? 0}`,
    output: (m: MissionState) => `${formatNumber((s(m).cars[c.id] ?? 0) * carValue(s(m), c))} CR/KM`,
  })),
];
}

export function createHaulageUi(store: Store, profile: HaulProfile, words: HaulWords): ScenarioUi {
  const systems = createHaulageSystemsPanel(store, profile, words);
  const upgrades = createUpgradesPanel<HaulageMission>(store, { all: profile.upgrades, available: availableHaulageUpgrades });
  const helm = createHelm(store, words);
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
        const v = currentSpeed(m);
        const income = incomeRate(m);
        const base = {
          values: [v, trainValue(m), income] as [number, number, number],
          meter: isDocked(m) ? 0 : (m.travelled / legDistance(m)) * 100,
          rate: income,
        };
        if (isDocked(m)) {
          return { ...base, limit: 'docked', highlight: null, severe: false, note: `AT ${profile.station(m.leg - 1)} · REFUEL BEFORE DEPARTURE` };
        }
        if (thrust(m) === 0) {
          return { ...base, limit: 'thrust', highlight: 0, severe: false, note: words.noEngines };
        }
        if (m.fuel <= 0) {
          return { ...base, limit: 'fuel', highlight: 0, severe: true, note: 'TANKS DRY · COASTING ON THRUSTERS · CALL A FUEL TENDER OR REFUEL AT THE NEXT STATION' };
        }
        if (burn > safeBurn(m)) {
          return { ...base, limit: 'strain', highlight: 1, severe: true, note: `${words.dial} ${burn} PAST THE STRAIN LINE (${safeBurn(m)}) · FREIGHT TAKING DAMAGE` };
        }
        if (m.fuel < fuelForLeg(m)) {
          return { ...base, limit: 'fuel', highlight: 0, severe: true, note: `FUEL SHORT FOR THIS LEG · ${formatNumber(fuelForLeg(m) - m.fuel)} MORE NEEDED` };
        }
        return { ...base, limit: 'thrust', highlight: 0, severe: false, note: `BOUND FOR ${profile.station(m.leg)} · ${words.dial} ${burn}` };
      },
    },
    monitor: monitorRows(profile, words),
    stats: [
      { label: 'CREDITS', aria: 'Credits', read: (m) => formatNumber(m.credits) },
      { label: 'LEGS', aria: 'Legs delivered', read: (m) => String(s(m).leg) },
      { label: 'THRUST', aria: 'Total thrust', read: (m) => formatNumber(thrust(s(m))) },
    ],
    action: {
      label: words.action,
      aria: words.actionAria,
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
