import { FABRICATORS, SECTIONS, TROOPERS } from '../../data/security/systems';
import { SECURITY_DIRECTIVES } from '../../data/security/directives';
import { SECURITY_BEATS } from '../../data/security/story';
import { SECURITY_ARCHIVE } from '../../data/security/archive';
import { SECURITY_LEXICON } from '../../data/security/lexicon';
import { SECURITY_CREW_BOOSTS } from '../../data/security/crew-boosts';
import { createGround, held } from '../../engine/ground';
import type { ScenarioDef } from '../kinds';
import type { MissionConfig, MissionState, SecurityMission } from '../state';
import { DEFAULT_ASSAULT_SHARE, progress, tickSecurity } from './economy';
import type { SecurityFields } from './state';

const EQUIPMENT_LOSS = 0.1;
const SUBLEVELS = SECTIONS.findIndex((s) => s.deep);

const s = (m: MissionState) => m as SecurityMission;
const zeroes = (ids: readonly { id: string }[]) => Object.fromEntries(ids.map((x) => [x.id, 0]));
const heads = (m: SecurityMission) => TROOPERS.reduce((n, t) => n + (m.troopers[t.id] ?? 0) * t.heads, 0);

export const SECURITY: ScenarioDef = {
  id: 'security',
  fields: (): SecurityFields => ({
    scenario: 'security',
    troopers: zeroes(TROOPERS),
    fabricators: zeroes(FABRICATORS),
    ground: createGround(SECTIONS),
    assaultShare: DEFAULT_ASSAULT_SHARE,
    sentries: 0,
    netOff: false,
    recovered: 0,
    deepest: 0,
  }),
  boot: (config: MissionConfig) => [
    'WARDEN OPERATIONS INTELLIGENCE v4.1.7 ... ONLINE',
    `VESSEL: ${config.shipName.toUpperCase()} // KESSLER-AMARI COMBINE SECURITY DIVISION`,
    `ORBIT ESTABLISHED: ${config.targetBody.toUpperCase()}. COLONY BEACON: SILENT. COLONY POPULATION ON FILE: 158.`,
    'CREW STATUS: 7/7 IN CRYOSTASIS. DETACHMENT: STANDING BY ON THE PAD.',
    'AWAITING TACTICAL ORDERS. FIRE SUPPORT IS AVAILABLE.',
  ],
  tick: (m, dt) => tickSecurity(s(m), dt),
  signals: (m) => ({ progress: progress(s(m)), deepAccess: s(m).deepest > SUBLEVELS }),
  lexicon: SECURITY_LEXICON,
  beats: SECURITY_BEATS,
  directives: SECURITY_DIRECTIVES,
  metric: (m, name) => {
    if (name === 'recovered') return s(m).recovered;
    if (name === 'held') return held(s(m).ground);
    if (name === 'deepest') return s(m).deepest;
    if (name.startsWith('troop:')) return s(m).troopers[name.slice(6)] ?? 0;
    return 0;
  },
  archive: SECURITY_ARCHIVE,
  crewBoostText: Object.fromEntries(Object.entries(SECURITY_CREW_BOOSTS).map(([id, b]) => [id, b.text])),
  loseEquipment: (m, roll) => {
    const sec = s(m);
    const owned = TROOPERS.filter((t) => (sec.troopers[t.id] ?? 0) > 0);
    if (owned.length === 0) return null;
    const t = owned[Math.floor(roll() * owned.length)]!;
    const count = sec.troopers[t.id] ?? 0;
    const lost = Math.max(1, Math.floor(count * EQUIPMENT_LOSS));
    return { m: { ...sec, troopers: { ...sec.troopers, [t.id]: count - lost } }, name: t.name };
  },
  outcome: (m) => ({ output: s(m).deepest, outputUnit: 'SECTORS' }),
  stakes: (m) => {
    const sec = s(m);
    return `THE COLONY: ${held(sec.ground)} OF ${SECTIONS.length} SECTORS HELD. ${heads(sec).toLocaleString('en-US')} TROOPERS ON THE GROUND. THEY SIGNED UP FOR PEST CONTROL.`;
  },
};
