import { PROCESSORS, REACTORS, SPEC_REVISIONS } from '../../data/terraform/systems';
import { TERRAFORM_DIRECTIVES } from '../../data/terraform/directives';
import { TERRAFORM_BEATS } from '../../data/terraform/story';
import { TERRAFORM_ARCHIVE } from '../../data/terraform/archive';
import { TERRAFORM_LEXICON } from '../../data/terraform/lexicon';
import { TERRAFORM_CREW_BOOSTS } from '../../data/terraform/crew-boosts';
import type { ScenarioDef } from '../kinds';
import type { MissionConfig, MissionState, TerraformMission } from '../state';
import { progress, specMatch, tickTerraform } from './economy';
import type { TerraformFields } from './state';

const EQUIPMENT_LOSS = 0.1;
/** Owning this lets the story find what lies beneath the reservoir. */
const DEEP_EQUIPMENT = 'aquifer';

const t = (m: MissionState) => m as TerraformMission;
const zeroes = (ids: readonly { id: string }[]) => Object.fromEntries(ids.map((x) => [x.id, 0]));

export const TERRAFORM: ScenarioDef = {
  id: 'terraform',
  fields: (): TerraformFields => {
    const first = SPEC_REVISIONS[0]!.targets;
    return {
      scenario: 'terraform',
      reactors: zeroes(REACTORS),
      processors: zeroes(PROCESSORS),
      allocation: { atmosphere: Math.round(first.atmosphere * 10), heat: Math.round(first.heat * 10), water: Math.round(first.water * 10) },
      lineTotals: { atmosphere: 0, heat: 0, water: 0 },
      processed: 0,
      lifetimeUnits: 0,
    };
  },
  boot: (config: MissionConfig) => [
    'WARDEN OPERATIONS INTELLIGENCE v4.1.7 ... ONLINE',
    `STATION: ${config.shipName.toUpperCase()} // KESSLER-AMARI COMBINE`,
    `SURFACE CONTACT: ${config.targetBody.toUpperCase()}. ATMOSPHERE: NONE. MEAN TEMPERATURE: 61 K.`,
    'CREW STATUS: 7/7 IN CRYOSTASIS. COLONY TRANSPORT: 4,000 BERTHS IN TRANSIT.',
    'AWAITING PROCESSING ORDERS.',
  ],
  tick: (m, dt) => tickTerraform(t(m), dt),
  signals: (m) => ({ progress: progress(t(m)), deepAccess: (t(m).processors[DEEP_EQUIPMENT] ?? 0) > 0 }),
  lexicon: TERRAFORM_LEXICON,
  beats: TERRAFORM_BEATS,
  directives: TERRAFORM_DIRECTIVES,
  metric: (m, name) => {
    if (name === 'units') return t(m).lifetimeUnits;
    if (name === 'match') return Math.floor(specMatch(t(m)) * 100);
    if (name.startsWith('proc:')) return t(m).processors[name.slice(5)] ?? 0;
    return 0;
  },
  archive: TERRAFORM_ARCHIVE,
  crewBoostText: Object.fromEntries(Object.entries(TERRAFORM_CREW_BOOSTS).map(([id, b]) => [id, b.text])),
  loseEquipment: (m, roll) => {
    const s = t(m);
    const owned = PROCESSORS.filter((p) => (s.processors[p.id] ?? 0) > 0);
    if (owned.length === 0) return null;
    const p = owned[Math.floor(roll() * owned.length)]!;
    const count = s.processors[p.id] ?? 0;
    const lost = Math.max(1, Math.floor(count * EQUIPMENT_LOSS));
    return { m: { ...s, processors: { ...s.processors, [p.id]: count - lost } }, name: p.name };
  },
  outcome: (m) => ({ output: t(m).processed, outputUnit: 'UNITS' }),
};
