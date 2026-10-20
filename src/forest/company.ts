import { CLASSES, CLASS_IDS, type ClassId } from '../forest-data/classes';
import { REGIONS, type RegionDef } from '../forest-data/regions';
import { BUILDINGS, type BuildingId } from '../forest-data/buildings';
import { FOREST_UPGRADES, type ForestEffect, type ForestUpgrade } from '../forest-data/upgrades';
import { nextRandom } from '../shared/rng';
import { formatNumber } from '../shared/format';
import { appendLog } from '../shared/log';
import { runForestStory } from './story';
import { sinceBeat } from '../shared/story';
import { emptyComposition, type Company, type Composition, type EntryKind, type Party } from './state';

export const COST_GROWTH = 1.15;
export const FORAGE_YIELD = 1;
/** Silver per relic at appraisal. */
export const RELIC_PRICE = 1;
const APPRAISAL_BASE = 3;
/** Average seconds for a wounded hand to mend, before the hospice. */
const MEND_SECONDS = 180;
const HOSPICE_BONUS = 0.5;
const RENOWN_HAUL = 0.25;
const GRACE_BLIGHT = 0.2;
const GRACE_HEALING = 0.25;
/** Each armoury level multiplies every hand's strength. */
const ARMOURY_STRENGTH = 1.5;
/** Blight per second from the vault, per order of magnitude of relics held. */
const VAULT_BLIGHT = 0.01;
const CHAPEL_EASE = 0.006;
/** Above this blight, hands start to turn. */
export const TURN_THRESHOLD = 40;
/** Chance per hand per second of turning, at full blight. */
const TURN_RATE = 1 / 600;
/** Each turned hand makes every region this much more dangerous. */
const TURNED_DANGER = 0.03;
/** Once the wood wakes (Act IV), danger rises by this share per minute. */
const WAKING_DANGER = 0.01;
export const KEY_FRAGMENTS = 7;
/** Chance a returning party brings back a fragment, by region. */
const FRAGMENT_CHANCE: Record<string, number> = { undercity: 0.2, heartwood: 0.35 };
/** Blight per second for every fragment held. */
const KEY_BLIGHT = 0.02;
export const PENANCE_AMOUNT = 10;
const PENANCE_BASE = 25;
const PENANCE_SHARE = 0.05;
/** Seconds of unpaid wages before another hand walks out. */
const DESERT_SECONDS = 5;
const MAX_BLIGHT = 100;
const HAUL_CAP = 1.5;
const HAUL_VARIANCE = 0.25;
/** Each scout along adds this share to the leagues a trip charts. */
const SCOUT_CHARTING = 0.5;

const def = (id: ClassId) => CLASSES.find((k) => k.id === id)!;

interface Modifiers {
  strength: Composition;
  haul: number;
  wounds: number;
  blight: number;
  wages: number;
  charting: number;
  forage: number;
  autoForage: number;
  standingRegions: number;
}

function applyEffect(m: Modifiers, e: ForestEffect): void {
  switch (e.kind) {
    case 'classStrength':
      m.strength[e.id] *= e.value;
      break;
    case 'haulMultiplier':
      m.haul *= e.value;
      break;
    case 'woundMultiplier':
      m.wounds *= e.value;
      break;
    case 'blightMultiplier':
      m.blight *= e.value;
      break;
    case 'wageMultiplier':
      m.wages *= e.value;
      break;
    case 'chartMultiplier':
      m.charting *= e.value;
      break;
    case 'forageMultiplier':
      m.forage *= e.value;
      break;
    case 'autoForage':
      m.autoForage += e.value;
      break;
    case 'quartermaster':
      m.standingRegions += e.value;
      break;
  }
}

function modifiers(c: Company): Modifiers {
  const m: Modifiers = {
    strength: Object.fromEntries(CLASS_IDS.map((id) => [id, 1])) as Composition,
    haul: 1,
    wounds: 1,
    blight: 1,
    wages: 1,
    charting: 1,
    forage: 1,
    autoForage: 0,
    standingRegions: 0,
  };
  for (const u of FOREST_UPGRADES) if (c.upgrades.includes(u.id)) applyEffect(m, u.effect);
  // What earlier charters earned: Renown fills the packs, Grace keeps the dark off.
  m.haul *= 1 + RENOWN_HAUL * c.charter.renown;
  m.blight /= 1 + GRACE_BLIGHT * c.charter.grace;
  return m;
}
const size = (comp: Composition) => CLASS_IDS.reduce((s, id) => s + comp[id], 0);
const log = (c: Company, kind: EntryKind, text: string) => appendLog<EntryKind, Company>(c, kind, text);

function roller(c: Company) {
  let state = c.rng;
  return {
    roll: () => {
      const [value, next] = nextRandom(state);
      state = next;
      return value;
    },
    state: () => state,
  };
}

/** Leagues charted into the wood. */
export function delve(c: Company): number {
  return c.charted;
}

export function isRegionOpen(c: Company, region: RegionDef): boolean {
  return delve(c) >= region.opensAt;
}

/** The deepest open region, the one beyond it, and how much of the way there is charted (0..1). */
export function frontier(c: Company): { region: RegionDef; next: RegionDef | null; progress: number } {
  const index = REGIONS.reduce((deepest, r, i) => (isRegionOpen(c, r) ? i : deepest), 0);
  const region = REGIONS[index]!;
  const next = REGIONS[index + 1] ?? null;
  const progress = next ? Math.min(1, (c.charted - region.opensAt) / (next.opensAt - region.opensAt)) : 1;
  return { region, next, progress };
}

/** Leagues a returning party charts, before the cap at the next region. */
export function chartingPerTrip(c: Company, region: RegionDef, comp: Composition): number {
  return region.chart * (1 + SCOUT_CHARTING * comp.scout) * modifiers(c).charting;
}

/** A region only teaches the way as far as the region after it. */
function chart(c: Company, region: RegionDef, comp: Composition, survivors: number): Company {
  const index = REGIONS.indexOf(region);
  const next = REGIONS[index + 1];
  if (!next || c.charted >= next.opensAt || survivors === 0) return c;
  const gained = chartingPerTrip(c, region, comp) * (survivors / size(comp));
  const charted = Math.min(next.opensAt, c.charted + gained);
  const reached = charted >= next.opensAt;
  return log(
    { ...c, charted },
    reached ? 'town' : 'ledger',
    reached
      ? `THE WAY TO ${next.name} IS CHARTED. THE HANDS WILL GO THERE NOW.`
      : `THE WAY TOWARD ${next.name} CHARTED: ${charted.toFixed(1)} OF ${next.opensAt} LEAGUES.`,
  );
}

function gather(c: Company, relics: number): Company {
  return { ...c, relics: c.relics + relics, lifetimeRelics: c.lifetimeRelics + relics };
}

export function forage(c: Company): Company {
  return gather(c, FORAGE_YIELD * modifiers(c).forage);
}

/** Forages per second done by gleaners. */
export function autoForageRate(c: Company): number {
  return modifiers(c).autoForage;
}

// ---------- recruiting and wages ----------

export function hireCost(c: Company, id: ClassId): number {
  return Math.ceil(def(id).baseCost * COST_GROWTH ** c.hired[id]);
}

export function hire(c: Company, id: ClassId): Company {
  const cost = hireCost(c, id);
  if (c.silver < cost) return c;
  return { ...c, silver: c.silver - cost, hired: { ...c.hired, [id]: c.hired[id] + 1 } };
}

export function wages(c: Company): number {
  return CLASS_IDS.reduce((s, id) => s + c.hired[id] * def(id).wage, 0) * modifiers(c).wages;
}

function inField(c: Company, id: ClassId): number {
  return c.parties.reduce((s, p) => s + p.comp[id], 0);
}

/** Rested hands in the hall, free to be sent. */
export function available(c: Company, id: ClassId): number {
  return Math.max(0, c.hired[id] - c.wounded[id] - inField(c, id));
}

function payWages(c: Company, dt: number): Company {
  const due = wages(c) * dt;
  if (c.silver >= due) return { ...c, silver: c.silver - due, arrears: 0 };
  let next: Company = { ...c, silver: 0, arrears: c.arrears + dt / DESERT_SECONDS };
  while (next.arrears >= 1) {
    // The unpaid walk out of the hall first: whoever is idle and most numerous.
    const leaving = [...CLASS_IDS].sort((a, b) => available(next, b) - available(next, a))[0]!;
    if (available(next, leaving) === 0) break;
    next = { ...next, arrears: next.arrears - 1, hired: { ...next.hired, [leaving]: next.hired[leaving] - 1 } };
    next = log(next, 'ledger', `ONE ${def(leaving).name} DESERTED. WAGES UNPAID.`);
  }
  return next;
}

// ---------- standing orders and expeditions ----------

export function adjustOrder(c: Company, region: string, id: ClassId, step: 1 | -1): Company {
  const order = c.orders[region];
  if (!order) return c;
  const value = Math.max(0, order[id] + step);
  if (value === order[id]) return c;
  return { ...c, orders: { ...c.orders, [region]: { ...order, [id]: value } } };
}

export interface Projection {
  strength: number;
  danger: number;
  /** Strength over danger: below 1 the wood wins. */
  ratio: number;
  haul: number;
  duration: number;
  /** Chance each hand comes back wounded. */
  woundRisk: number;
  /** Chance a wounded hand dies instead. */
  deathRisk: number;
  blightPerHand: number;
}

/** Expected outcome of sending this composition into this region. */
/** How much more dangerous the wood is than its maps say: turned hands, and a waking forest. */
export function dangerMultiplier(c: Company): number {
  const awake = sinceBeat(c, 'act-4');
  const waking = awake > 0 ? WAKING_DANGER * (awake / 60) : 0;
  return (1 + TURNED_DANGER * c.turned) * (1 + waking);
}

export function project(c: Company, region: RegionDef, comp: Composition): Projection {
  const mod = modifiers(c);
  const danger = region.danger * dangerMultiplier(c);
  const armour = ARMOURY_STRENGTH ** c.buildings.armoury;
  const strength = CLASS_IDS.reduce((s, id) => s + comp[id] * def(id).strength * mod.strength[id], 0) * armour;
  const ratio = strength / danger;
  const effective = Math.max(0.2, ratio);
  return {
    strength,
    danger,
    ratio,
    haul: region.relics * Math.min(HAUL_CAP, ratio) * (1 + 0.15 * comp.scout + 0.2 * comp.mystic) * mod.haul,
    duration: region.duration * Math.max(0.5, 1 - 0.08 * comp.scout),
    woundRisk: Math.min(0.9, (region.harm / effective ** 1.5 / (1 + 0.6 * comp.mender)) * mod.wounds),
    deathRisk: Math.min(0.8, Math.max(0.02, 0.35 * (1 - ratio) + 0.05)) / (1 + 0.3 * comp.mender),
    blightPerHand: (region.blight / (1 + 0.35 * comp.mystic)) * mod.blight,
  };
}

export function dispatch(c: Company, regionId: string): Company {
  const region = REGIONS.find((r) => r.id === regionId);
  const order = c.orders[regionId];
  if (!region || !order || !isRegionOpen(c, region) || size(order) === 0) return c;
  if (CLASS_IDS.some((id) => available(c, id) < order[id])) return c;
  const party: Party = {
    id: c.nextPartyId,
    region: regionId,
    comp: { ...order },
    departedAt: c.elapsed,
    returnsAt: c.elapsed + project(c, region, order).duration,
  };
  return { ...c, parties: [...c.parties, party], nextPartyId: c.nextPartyId + 1 };
}

function resolve(c: Company, party: Party): Company {
  const region = REGIONS.find((r) => r.id === party.region)!;
  const p = project(c, region, party.comp);
  const r = roller(c);
  const wounded = emptyComposition();
  const dead = emptyComposition();
  for (const id of CLASS_IDS) {
    for (let i = 0; i < party.comp[id]; i++) {
      if (r.roll() >= p.woundRisk) continue;
      if (r.roll() < p.deathRisk) dead[id] += 1;
      else wounded[id] += 1;
    }
  }
  const haul = Math.max(0, p.haul * (1 + HAUL_VARIANCE * (2 * r.roll() - 1)));
  const survivors = size(party.comp) - size(dead);
  const fragment = survivors > 0 && c.keyFragments < KEY_FRAGMENTS && r.roll() < (FRAGMENT_CHANCE[region.id] ?? 0);
  const blight = p.blightPerHand * size(party.comp);
  let next: Company = {
    ...c,
    rng: r.state(),
    parties: c.parties.filter((x) => x.id !== party.id),
    relics: c.relics + haul,
    lifetimeRelics: c.lifetimeRelics + haul,
    hired: Object.fromEntries(CLASS_IDS.map((id) => [id, c.hired[id] - dead[id]])) as Composition,
    lifetimeDead: c.lifetimeDead + size(dead),
    wounded: Object.fromEntries(CLASS_IDS.map((id) => [id, c.wounded[id] + wounded[id]])) as Composition,
    blight: Math.min(MAX_BLIGHT, c.blight + blight),
    keyFragments: c.keyFragments + (fragment ? 1 : 0),
  };
  const losses = [size(wounded) > 0 ? `${size(wounded)} WOUNDED` : '', size(dead) > 0 ? `${size(dead)} DEAD` : '']
    .filter(Boolean)
    .join(', ');
  next = log(next, 'ledger', `PARTY ${party.id} RETURNS FROM ${region.name}: ${formatNumber(haul)} RELICS.${losses ? ` ${losses}.` : ' ALL HANDS ACCOUNTED FOR.'}`);
  if (fragment) {
    next = log(next, 'omen', `AMONG THE HAUL: A FRAGMENT OF A KEY, ASH-GREY AND WARM. THE COMPANY HOLDS ${next.keyFragments} OF ${KEY_FRAGMENTS}.`);
  }
  return chart(next, region, party.comp, survivors);
}

// ---------- healing, appraisal, blight, buildings ----------

/** Fraction of each class's wounded who mend per second. */
export function healRate(c: Company): number {
  return ((1 + HOSPICE_BONUS * c.buildings.hospice) * (1 + GRACE_HEALING * c.charter.grace)) / MEND_SECONDS;
}

function mend(c: Company, dt: number): Company {
  const rate = healRate(c);
  const wounded = { ...c.wounded };
  const mending = { ...c.mending };
  for (const id of CLASS_IDS) {
    if (wounded[id] === 0) {
      mending[id] = 0;
      continue;
    }
    mending[id] += wounded[id] * rate * dt;
    const healed = Math.min(wounded[id], Math.floor(mending[id]));
    wounded[id] -= healed;
    mending[id] -= healed;
  }
  return { ...c, wounded, mending };
}

/** Relics per second the Collegium buyers will take. */
export function appraisalRate(c: Company): number {
  return APPRAISAL_BASE * 2 ** c.buildings.appraisal;
}

function appraise(c: Company, dt: number): Company {
  const sold = Math.min(c.relics, appraisalRate(c) * dt);
  const silver = sold * RELIC_PRICE;
  return { ...c, relics: c.relics - sold, silver: c.silver + silver, lifetimeSilver: c.lifetimeSilver + silver };
}

function settleBlight(c: Company, dt: number): Company {
  const rising = VAULT_BLIGHT * Math.log10(1 + c.relics) + KEY_BLIGHT * c.keyFragments;
  const easing = CHAPEL_EASE * c.buildings.chapel;
  const blight = Math.min(MAX_BLIGHT, Math.max(0, c.blight + (rising - easing) * dt));
  return blight === c.blight ? c : { ...c, blight };
}

export function penanceCost(c: Company): number {
  return Math.ceil(PENANCE_BASE + PENANCE_SHARE * c.lifetimeSilver);
}

export function penance(c: Company): Company {
  const cost = penanceCost(c);
  if (c.blight <= 0 || c.silver < cost) return c;
  return { ...c, silver: c.silver - cost, blight: Math.max(0, c.blight - PENANCE_AMOUNT) };
}

export function buildingCost(c: Company, id: BuildingId): number {
  const b = BUILDINGS.find((x) => x.id === id)!;
  return Math.ceil(b.baseCost * b.costGrowth ** c.buildings[id]);
}

export function buyBuilding(c: Company, id: BuildingId): Company {
  const cost = buildingCost(c, id);
  if (c.silver < cost) return c;
  return { ...c, silver: c.silver - cost, buildings: { ...c.buildings, [id]: c.buildings[id] + 1 } };
}

// ---------- requisitions and the Quartermaster ----------

export function isUpgradeUnlocked(c: Company, u: ForestUpgrade): boolean {
  return c.lifetimeRelics >= (u.unlock.relics ?? 0) && delve(c) >= (u.unlock.delve ?? 0);
}

export function availableUpgrades(c: Company): ForestUpgrade[] {
  return FOREST_UPGRADES.filter((u) => !c.upgrades.includes(u.id) && isUpgradeUnlocked(c, u)).sort((a, b) => a.cost - b.cost);
}

export function buyUpgrade(c: Company, id: string): Company {
  const u = FOREST_UPGRADES.find((x) => x.id === id);
  if (!u || c.upgrades.includes(id) || !isUpgradeUnlocked(c, u) || c.silver < u.cost) return c;
  return { ...c, silver: c.silver - u.cost, upgrades: [...c.upgrades, id] };
}

/** How many regions' standing orders may send themselves. */
export function maxStandingRegions(c: Company): number {
  return modifiers(c).standingRegions;
}

export function toggleStanding(c: Company, region: string): Company {
  if (c.standing.includes(region)) return { ...c, standing: c.standing.filter((r) => r !== region) };
  const def = REGIONS.find((r) => r.id === region);
  if (!def || !isRegionOpen(c, def) || c.standing.length >= maxStandingRegions(c)) return c;
  return { ...c, standing: [...c.standing, region] };
}

/** Standing regions send a party each tick while the hall has the hands for one, deepest region first. */
function muster(c: Company): Company {
  const deepestFirst = [...c.standing].sort((a, b) => REGIONS.findIndex((r) => r.id === b) - REGIONS.findIndex((r) => r.id === a));
  let next = c;
  for (const region of deepestFirst) next = dispatch(next, region);
  return next;
}

/** Above the threshold, rested hands in the hall walk into the wood at night. */
function turn(c: Company, dt: number): Company {
  if (c.blight <= TURN_THRESHOLD) return c.turning === 0 ? c : { ...c, turning: 0 };
  const rate = TURN_RATE * ((c.blight - TURN_THRESHOLD) / (MAX_BLIGHT - TURN_THRESHOLD));
  const idle = CLASS_IDS.reduce((s, id) => s + available(c, id), 0);
  let next: Company = { ...c, turning: c.turning + idle * rate * dt };
  const r = roller(next);
  while (next.turning >= 1) {
    const pool = CLASS_IDS.flatMap((id) => Array<ClassId>(available(next, id)).fill(id));
    if (pool.length === 0) {
      next = { ...next, turning: 0 };
      break;
    }
    const id = pool[Math.floor(r.roll() * pool.length)]!;
    next = { ...next, turning: next.turning - 1, turned: next.turned + 1, hired: { ...next.hired, [id]: next.hired[id] - 1 } };
    next = log(next, 'omen', `A ${def(id).name} WALKED INTO THE WOOD AT NIGHT. THE GATE WAS BARRED FROM INSIDE. THE LEDGER COUNTS ${next.turned} TURNED.`);
  }
  return { ...next, rng: r.state() };
}

// ---------- the tick ----------

export function tickCompany(c: Company, dt: number): Company {
  let next: Company = { ...c, elapsed: c.elapsed + dt };
  for (const party of next.parties.filter((p) => p.returnsAt <= next.elapsed)) next = resolve(next, party);
  const gleaned = autoForageRate(next) * FORAGE_YIELD * modifiers(next).forage * dt;
  if (gleaned > 0) next = gather(next, gleaned);
  next = muster(next);
  next = mend(next, dt);
  next = appraise(next, dt);
  next = payWages(next, dt);
  return runForestStory(turn(settleBlight(next, dt), dt));
}

// ---------- rates (for the flow readout and the bot) ----------

/** Expected relics per second from the parties now in the field. */
export function gatherRate(c: Company): number {
  return c.parties.reduce((s, party) => {
    const region = REGIONS.find((r) => r.id === party.region)!;
    const p = project(c, region, party.comp);
    return s + p.haul / p.duration;
  }, 0);
}

/** Seconds over which the vault's stock is counted as selling down, for a steady (not momentary) income figure. */
const VAULT_HORIZON = 60;

/** Silver per second from appraisal: limited by the buyers, fed by the field and the vault. */
export function incomeRate(c: Company): number {
  return Math.min(c.relics / VAULT_HORIZON + gatherRate(c), appraisalRate(c)) * RELIC_PRICE;
}

export function netRate(c: Company): number {
  return incomeRate(c) - wages(c);
}
