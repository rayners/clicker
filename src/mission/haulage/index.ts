import { HAULAGE_DIRECTIVES } from '../../data/haulage/directives';
import { HAULAGE_BEATS } from '../../data/haulage/story';
import { HAULAGE_ARCHIVE } from '../../data/haulage/archive';
import { HAULAGE_LEXICON } from '../../data/haulage/lexicon';
import { OVERLAND_DIRECTIVES } from '../../data/overland/directives';
import { OVERLAND_BEATS } from '../../data/overland/story';
import { OVERLAND_ARCHIVE } from '../../data/overland/archive';
import { OVERLAND_LEXICON } from '../../data/overland/lexicon';
import type { ArchiveFile, ScenarioDef } from '../kinds';
import type { DirectiveDef } from '../directives';
import type { Beat } from '../story';
import type { Lexicon } from '../../shared/lexicon';
import type { HaulageMission, MissionConfig, MissionState } from '../state';
import { answeredBeacon, DEFAULT_BURN, progress, tickHaulage, trainValue } from './economy';
import { LAND_HAUL, SPACE_HAUL, type HaulProfile } from './profiles';
import type { HaulageFields, HaulId } from './state';

/** Share of a car tier cut loose when the horror takes equipment. */
const EQUIPMENT_LOSS = 0.1;

const s = (m: MissionState) => m as HaulageMission;
const zeroes = (ids: readonly { id: string }[]) => Object.fromEntries(ids.map((x) => [x.id, 0]));

interface HaulWords {
  boot(config: MissionConfig): string[];
  lexicon: Lexicon;
  beats: readonly Beat[];
  directives: readonly DirectiveDef[];
  archive: readonly ArchiveFile[];
  /** What is at stake at the terminus: the train and its freight. */
  stakes(cars: number, value: string): string;
}

/** One haul's scenario: the shared rules, with this haul's fleet, route and words. */
function haulScenario<S extends HaulId>(id: S, profile: HaulProfile, words: HaulWords): ScenarioDef {
  const carCount = (m: HaulageMission) => profile.cars.reduce((n, c) => n + (m.cars[c.id] ?? 0), 0);
  return {
    id,
    fields: (): HaulageFields<S> => ({
      scenario: id,
      engines: zeroes(profile.engines),
      cars: zeroes(profile.cars),
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
    boot: words.boot,
    tick: (m, dt) => tickHaulage(s(m), dt),
    signals: (m) => ({ progress: progress(s(m)), deepAccess: answeredBeacon(s(m)) }),
    lexicon: words.lexicon,
    beats: words.beats,
    directives: words.directives,
    metric: (m, name) => {
      const h = s(m);
      if (name === 'delivered') return h.delivered;
      if (name === 'legs') return h.leg;
      if (name === 'onTime') return h.onTime;
      if (name.startsWith('engine:')) return h.engines[name.slice(7)] ?? 0;
      if (name.startsWith('car:')) return h.cars[name.slice(4)] ?? 0;
      return 0;
    },
    archive: words.archive,
    crewBoostText: Object.fromEntries(Object.entries(profile.crewBoosts).map(([crew, b]) => [crew, b.text])),
    loseEquipment: (m, roll) => {
      const h = s(m);
      const owned = profile.cars.filter((c) => (h.cars[c.id] ?? 0) > 0);
      if (owned.length === 0) return null;
      const c = owned[Math.floor(roll() * owned.length)]!;
      const count = h.cars[c.id] ?? 0;
      const lost = Math.max(1, Math.floor(count * EQUIPMENT_LOSS));
      return { m: { ...h, cars: { ...h.cars, [c.id]: count - lost } }, name: c.name };
    },
    outcome: (m) => ({ output: s(m).leg, outputUnit: 'LEGS' }),
    stakes: (m) => words.stakes(carCount(s(m)), Math.round(trainValue(s(m))).toLocaleString('en-US')),
  };
}

export const HAULAGE = haulScenario('haulage', SPACE_HAUL, {
  boot: (config) => [
    'WARDEN OPERATIONS INTELLIGENCE v4.1.7 ... ONLINE',
    `VESSEL: ${config.shipName.toUpperCase()} // KESSLER-AMARI COMBINE FREIGHT DIVISION`,
    `ROUTE FILED: ${config.targetBody.toUpperCase()}. FIRST STATION: ${SPACE_HAUL.station(0)}.`,
    'CREW STATUS: 7/7 IN CRYOSTASIS. TRAIN: TUG ONLY. MAIN ENGINES: NONE FITTED.',
    'MANOEUVRING THRUSTERS AVAILABLE. AWAITING ORDERS.',
  ],
  lexicon: HAULAGE_LEXICON,
  beats: HAULAGE_BEATS,
  directives: HAULAGE_DIRECTIVES,
  archive: HAULAGE_ARCHIVE,
  stakes: (cars, value) => `THE TRAIN: ${cars} CARS, FREIGHT AT ${value} CR A KILOMETRE. SEVEN CREW SIGNED ON FOR THE SHARES.`,
});

export const OVERLAND = haulScenario('overland', LAND_HAUL, {
  boot: (config) => [
    'WARDEN OPERATIONS INTELLIGENCE v4.1.7 ... ONLINE',
    `VEHICLE: ${config.shipName.toUpperCase()} // KESSLER-AMARI COMBINE ROAD FREIGHT`,
    `ROUTE FILED: ${config.targetBody.toUpperCase()}. FIRST DEPOT: ${LAND_HAUL.station(0)}.`,
    'CREW STATUS: 7/7 IN THE SLEEPER CAB. RIG: TRACTOR ONLY. POWERTRAIN: NONE FITTED.',
    'STARTER MOTOR AVAILABLE. AWAITING ORDERS.',
  ],
  lexicon: OVERLAND_LEXICON,
  beats: OVERLAND_BEATS,
  directives: OVERLAND_DIRECTIVES,
  archive: OVERLAND_ARCHIVE,
  stakes: (trailers, value) => `THE RIG: ${trailers} TRAILERS, FREIGHT AT ${value} CR A KILOMETRE. THE LIFT IS IN SIGHT.`,
});
