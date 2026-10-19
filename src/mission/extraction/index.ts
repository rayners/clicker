import { GENERATORS } from '../../data/extraction/generators';
import { DIRECTIVES } from '../../data/extraction/directives';
import { EXTRACTION_BEATS } from '../../data/extraction/story';
import { EXTRACTION_ARCHIVE } from '../../data/extraction/archive';
import { EXTRACTION_LEXICON } from '../../data/extraction/lexicon';
import { CREW_BOOSTS } from '../../data/extraction/crew-boosts';
import type { ScenarioDef } from '../kinds';
import type { ExtractionMission, MissionConfig, MissionState } from '../state';
import { tickExtraction } from './economy';
import { depth } from './progress';
import type { ExtractionFields } from './state';

const EQUIPMENT_LOSS = 0.1;
const DEEP_EQUIPMENT = 'bore';

const x = (m: MissionState) => m as ExtractionMission;

export const EXTRACTION: ScenarioDef = {
  id: 'extraction',
  fields: (): ExtractionFields => ({
    scenario: 'extraction',
    ore: 0,
    lifetimeOre: 0,
    generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
    refineryLevel: 0,
  }),
  boot: (config: MissionConfig) => [
    'WARDEN OPERATIONS INTELLIGENCE v4.1.7 ... ONLINE',
    `VESSEL: ${config.shipName.toUpperCase()} // KESSLER-AMARI COMBINE`,
    `ORBIT ESTABLISHED: ${config.targetBody.toUpperCase()}`,
    'CREW STATUS: 7/7 IN CRYOSTASIS. ALL VITALS NOMINAL.',
    'AWAITING EXTRACTION ORDERS.',
  ],
  tick: (m, dt) => tickExtraction(x(m), dt),
  signals: (m) => ({ progress: depth(x(m)), deepAccess: (x(m).generators[DEEP_EQUIPMENT] ?? 0) > 0 }),
  lexicon: EXTRACTION_LEXICON,
  beats: EXTRACTION_BEATS,
  directives: DIRECTIVES,
  metric: (m, name) => (name === 'ore' ? x(m).lifetimeOre : name.startsWith('gen:') ? (x(m).generators[name.slice(4)] ?? 0) : 0),
  archive: EXTRACTION_ARCHIVE,
  crewBoostText: Object.fromEntries(Object.entries(CREW_BOOSTS).map(([id, b]) => [id, b.text])),
  loseEquipment: (m, roll) => {
    const e = x(m);
    const owned = GENERATORS.filter((g) => (e.generators[g.id] ?? 0) > 0);
    if (owned.length === 0) return null;
    const g = owned[Math.floor(roll() * owned.length)]!;
    const count = e.generators[g.id] ?? 0;
    const lost = Math.max(1, Math.floor(count * EQUIPMENT_LOSS));
    return { m: { ...e, generators: { ...e.generators, [g.id]: count - lost } }, name: g.name };
  },
  outcome: (m) => ({ output: x(m).lifetimeOre, outputUnit: 'ORE' }),
};
