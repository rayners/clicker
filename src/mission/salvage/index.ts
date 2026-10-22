import { COMPARTMENTS, CUTTERS, SHORING } from '../../data/salvage/systems';
import { SALVAGE_DIRECTIVES } from '../../data/salvage/directives';
import { SALVAGE_BEATS } from '../../data/salvage/story';
import { SALVAGE_ARCHIVE } from '../../data/salvage/archive';
import { SALVAGE_LEXICON } from '../../data/salvage/lexicon';
import { SALVAGE_CREW_BOOSTS } from '../../data/salvage/crew-boosts';
import { createGround, held } from '../../shared/ground';
import type { ScenarioDef } from '../kinds';
import type { MissionConfig, MissionState, SalvageMission } from '../state';
import { DEFAULT_NOTCH, progress, tickSalvage } from './economy';
import type { SalvageFields } from './state';

const EQUIPMENT_LOSS = 0.1;
const HOLD = COMPARTMENTS.findIndex((c) => c.deep);

const s = (m: MissionState) => m as SalvageMission;
const zeroes = (ids: readonly { id: string }[]) => Object.fromEntries(ids.map((x) => [x.id, 0]));

export const SALVAGE: ScenarioDef = {
  id: 'salvage',
  fields: (): SalvageFields => ({
    scenario: 'salvage',
    cutters: zeroes(CUTTERS),
    shoring: zeroes(SHORING),
    ground: createGround(COMPARTMENTS),
    notch: DEFAULT_NOTCH,
    stress: 0,
    sealedFor: 0,
    governorOff: false,
    recovered: 0,
    deepest: 0,
    paidTo: 0,
    breaches: 0,
  }),
  boot: (config: MissionConfig) => [
    'WARDEN OPERATIONS INTELLIGENCE v4.1.7 ... ONLINE',
    `VESSEL: ${config.shipName.toUpperCase()} // KESSLER-AMARI COMBINE SALVAGE DIVISION`,
    `DERELICT IN TOW RANGE: ${config.targetBody.toUpperCase()}. LOST 31 YEARS. RUNNING LIGHTS: ON.`,
    'CREW STATUS: 7/7 IN CRYOSTASIS. SALVAGE CLAIM: FILED.',
    'AWAITING CUTTING ORDERS. THE TORCH ARM IS READY.',
  ],
  tick: (m, dt) => tickSalvage(s(m), dt),
  signals: (m) => ({ progress: progress(s(m)), deepAccess: s(m).deepest > HOLD }),
  lexicon: SALVAGE_LEXICON,
  beats: SALVAGE_BEATS,
  directives: SALVAGE_DIRECTIVES,
  metric: (m, name) => {
    if (name === 'recovered') return s(m).recovered;
    if (name === 'held') return held(s(m).ground);
    if (name === 'deepest') return s(m).deepest;
    if (name.startsWith('cutter:')) return s(m).cutters[name.slice(7)] ?? 0;
    return 0;
  },
  archive: SALVAGE_ARCHIVE,
  crewBoostText: Object.fromEntries(Object.entries(SALVAGE_CREW_BOOSTS).map(([id, b]) => [id, b.text])),
  loseEquipment: (m, roll) => {
    const sal = s(m);
    const owned = CUTTERS.filter((c) => (sal.cutters[c.id] ?? 0) > 0);
    if (owned.length === 0) return null;
    const c = owned[Math.floor(roll() * owned.length)]!;
    const count = sal.cutters[c.id] ?? 0;
    const lost = Math.max(1, Math.floor(count * EQUIPMENT_LOSS));
    return { m: { ...sal, cutters: { ...sal.cutters, [c.id]: count - lost } }, name: c.name };
  },
  outcome: (m) => ({ output: s(m).deepest, outputUnit: 'COMPARTMENTS' }),
  stakes: (m) => {
    const sal = s(m);
    return `THE AURELIAN GIFT: ${held(sal.ground)} OF ${COMPARTMENTS.length} COMPARTMENTS OPEN. ${sal.breaches} BREACHES. 2,400 COLONISTS ON HER MANIFEST, NONE ABOARD.`;
  },
};
