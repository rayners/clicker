import { CARS, ENGINES, stationName } from '../../data/haulage/systems';
import { HAULAGE_DIRECTIVES } from '../../data/haulage/directives';
import { HAULAGE_BEATS } from '../../data/haulage/story';
import { HAULAGE_ARCHIVE } from '../../data/haulage/archive';
import { HAULAGE_LEXICON } from '../../data/haulage/lexicon';
import { HAULAGE_CREW_BOOSTS } from '../../data/haulage/crew-boosts';
import type { ScenarioDef } from '../kinds';
import type { HaulageMission, MissionConfig, MissionState } from '../state';
import { answeredBeacon, DEFAULT_BURN, progress, tickHaulage, trainValue } from './economy';
import type { HaulageFields } from './state';

/** Share of a car tier cut loose when the horror takes equipment. */
const EQUIPMENT_LOSS = 0.1;

const s = (m: MissionState) => m as HaulageMission;
const zeroes = (ids: readonly { id: string }[]) => Object.fromEntries(ids.map((x) => [x.id, 0]));
const carCount = (m: HaulageMission) => CARS.reduce((n, c) => n + (m.cars[c.id] ?? 0), 0);

export const HAULAGE: ScenarioDef = {
  id: 'haulage',
  fields: (): HaulageFields => ({
    scenario: 'haulage',
    engines: zeroes(ENGINES),
    cars: zeroes(CARS),
    leg: 0,
    travelled: 0,
    legTime: 0,
    docked: 0,
    burn: DEFAULT_BURN,
    autopilotOff: false,
    fuel: 0,
    condition: 1,
    accrued: 0,
    delivered: 0,
    onTime: 0,
  }),
  boot: (config: MissionConfig) => [
    'WARDEN OPERATIONS INTELLIGENCE v4.1.7 ... ONLINE',
    `VESSEL: ${config.shipName.toUpperCase()} // KESSLER-AMARI COMBINE FREIGHT DIVISION`,
    `ROUTE FILED: ${config.targetBody.toUpperCase()}. FIRST STATION: ${stationName(0)}.`,
    'CREW STATUS: 7/7 IN CRYOSTASIS. TRAIN: TUG ONLY. MAIN ENGINES: NONE FITTED.',
    'MANOEUVRING THRUSTERS AVAILABLE. AWAITING ORDERS.',
  ],
  tick: (m, dt) => tickHaulage(s(m), dt),
  signals: (m) => ({ progress: progress(s(m)), deepAccess: answeredBeacon(s(m)) }),
  lexicon: HAULAGE_LEXICON,
  beats: HAULAGE_BEATS,
  directives: HAULAGE_DIRECTIVES,
  metric: (m, name) => {
    const h = s(m);
    if (name === 'delivered') return h.delivered;
    if (name === 'legs') return h.leg;
    if (name === 'onTime') return h.onTime;
    if (name.startsWith('engine:')) return h.engines[name.slice(7)] ?? 0;
    if (name.startsWith('car:')) return h.cars[name.slice(4)] ?? 0;
    return 0;
  },
  archive: HAULAGE_ARCHIVE,
  crewBoostText: Object.fromEntries(Object.entries(HAULAGE_CREW_BOOSTS).map(([id, b]) => [id, b.text])),
  loseEquipment: (m, roll) => {
    const h = s(m);
    const owned = CARS.filter((c) => (h.cars[c.id] ?? 0) > 0);
    if (owned.length === 0) return null;
    const c = owned[Math.floor(roll() * owned.length)]!;
    const count = h.cars[c.id] ?? 0;
    const lost = Math.max(1, Math.floor(count * EQUIPMENT_LOSS));
    return { m: { ...h, cars: { ...h.cars, [c.id]: count - lost } }, name: c.name };
  },
  outcome: (m) => ({ output: s(m).leg, outputUnit: 'LEGS' }),
  stakes: (m) => {
    const h = s(m);
    return `THE TRAIN: ${carCount(h)} CARS, FREIGHT AT ${Math.round(trainValue(h)).toLocaleString('en-US')} CR A KILOMETRE. SEVEN CREW SIGNED ON FOR THE SHARES.`;
  },
};
