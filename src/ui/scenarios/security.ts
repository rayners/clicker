import { formatNumber } from '../../engine/format';
import type { Store } from '../../core/store';
import { FABRICATORS, SECTIONS, TROOPERS } from '../../data/security/systems';
import { SECURITY_UPGRADES } from '../../data/security/upgrades';
import {
  ammoDemand,
  ammoSupply,
  assaultForce,
  autoSupportRate,
  availableSecurityUpgrades,
  force,
  holdForce,
  holdNeeded,
  incomeRate,
  sentryHold,
  supportPower,
  trooperForce,
} from '../../mission/security/economy';
import type { MissionState, SecurityMission } from '../../mission/state';
import { frontier, held } from '../../engine/ground';
import { h } from '../../engine/ui/dom';
import { createSecuritySystemsPanel } from '../security-systems';
import { createSite } from '../site';
import { createSplit } from '../split';
import { createUpgradesPanel } from '../upgrades';
import type { MonitorRow, ScenarioUi } from './types';

const s = (m: MissionState) => m as SecurityMission;
const PERIOD_BASE = 1.1;
const PERIOD_STEP = 0.5;

const MONITOR: MonitorRow[] = [
  {
    id: 'autosupport',
    label: 'FIRE CTRL',
    period: 1,
    running: (m) => autoSupportRate(s(m)) > 0,
    count: (m) => `${formatNumber(autoSupportRate(s(m)))} CALL/S`,
    output: (m) => `${formatNumber(autoSupportRate(s(m)) * supportPower(s(m)))} FRC`,
  },
  ...FABRICATORS.map((f, i) => ({
    id: f.id,
    label: f.short,
    period: 2 + i * 0.4,
    running: (m: MissionState) => (s(m).fabricators[f.id] ?? 0) > 0,
    count: (m: MissionState) => `×${s(m).fabricators[f.id] ?? 0}`,
    output: (m: MissionState) => `${formatNumber((s(m).fabricators[f.id] ?? 0) * f.rate)} RDS/S`,
  })),
  ...TROOPERS.map((t, i) => ({
    id: t.id,
    label: t.short,
    period: PERIOD_BASE + (i % 4) * PERIOD_STEP,
    running: (m: MissionState) => (s(m).troopers[t.id] ?? 0) > 0,
    count: (m: MissionState) => `×${s(m).troopers[t.id] ?? 0}`,
    output: (m: MissionState) => `${formatNumber((s(m).troopers[t.id] ?? 0) * trooperForce(s(m), t))} FRC`,
  })),
  {
    id: 'sentries',
    label: 'SENTRIES',
    period: 0.8,
    running: (m) => s(m).sentries > 0,
    count: (m) => `×${s(m).sentries}`,
    output: (m) => `HOLD ${formatNumber(sentryHold(s(m)))}`,
  },
];

export function createSecurityUi(store: Store): ScenarioUi {
  const systems = createSecuritySystemsPanel(store);
  const upgrades = createUpgradesPanel<SecurityMission>(store, { all: SECURITY_UPGRADES, available: availableSecurityUpgrades });
  const split = createSplit(store);
  const site = createSite({ sections: SECTIONS, label: 'Colony sectors' });
  return {
    flow: {
      cells: [
        { label: 'AMMO', aria: 'Ammunition supply', unit: 'RDS/S' },
        { label: 'ASSAULT', aria: 'Assault force', unit: 'FORCE' },
        { label: 'INCOME', aria: 'Income', unit: 'CR/S' },
      ],
      identity: (m) => `${m.config.shipName}:${m.seed}`,
      meterLabel: 'Frontier taken',
      rateUnit: 'CR/S',
      read: (mission) => {
        const m = s(mission);
        const supply = ammoSupply(m);
        const demand = ammoDemand(m);
        const line = frontier(m.ground);
        const income = incomeRate(m);
        const base = {
          values: [supply, assaultForce(m), income] as [number, number, number],
          meter: line < SECTIONS.length ? m.ground[line]!.control * 100 : 100,
          rate: income,
        };
        const need = holdNeeded(m);
        if (force(m) === 0) {
          return { ...base, limit: 'force', highlight: 1, severe: false, note: 'NO TROOPERS DEPLOYED · CALL FIRE SUPPORT OR DEPLOY IN SYSTEMS' };
        }
        if (holdForce(m) < need) {
          return {
            ...base,
            limit: 'hold',
            highlight: 2,
            severe: true,
            note: `LINE STRETCHED · HOLDING ${formatNumber(holdForce(m))} OF ${formatNumber(need)} · SECTORS SLIPPING`,
          };
        }
        if (demand > supply) {
          return { ...base, limit: 'ammo', highlight: 0, severe: true, note: `AMMO-LIMITED · ${formatNumber(demand - supply)} RDS/S SHORT · BUILD FABRICATORS` };
        }
        if (line >= SECTIONS.length) {
          return { ...base, limit: 'secured', highlight: null, severe: false, note: 'COLONY SECURED · EVERY SECTOR UNDER COMPANY CONTROL' };
        }
        return { ...base, limit: 'force', highlight: 1, severe: false, note: `PUSHING ${SECTIONS[line]!.name} · ${held(m.ground)} OF ${SECTIONS.length} HELD` };
      },
    },
    monitor: MONITOR,
    stats: [
      { label: 'CREDITS', aria: 'Credits', read: (m) => formatNumber(m.credits) },
      { label: 'SECTORS', aria: 'Sectors held', read: (m) => `${held(s(m).ground)}/${SECTIONS.length}` },
      { label: 'FORCE', aria: 'Total force', read: (m) => formatNumber(force(s(m))) },
    ],
    sprites: { vessel: 'transport', target: 'colony', action: 'reticle' },
    action: {
      label: 'CALL FIRE SUPPORT',
      aria: 'Call fire support',
      action: { type: 'fireSupport' },
      perPress: (m) => supportPower(s(m)),
      autoRate: (m) => autoSupportRate(s(m)),
      autoYieldPerSecond: (m) => autoSupportRate(s(m)) * supportPower(s(m)),
    },
    systems: { el: systems.el, render: (m) => systems.render(s(m)) },
    upgrades: { el: upgrades.el, render: (m) => upgrades.render(s(m)), hasAny: (m) => upgrades.hasAny(s(m)) },
    controls: {
      el: h('div', { class: 'sec-controls' }, split.el, site.el),
      render: (m) => {
        split.render(s(m));
        site.render(s(m));
      },
    },
  };
}
