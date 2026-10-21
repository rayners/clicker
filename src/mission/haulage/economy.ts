import { BEACON_LEG, CARS, ENGINES, TUG_MASS, TUG_VALUE, stationName, type CarDef, type EngineDef } from '../../data/haulage/systems';
import { HAULAGE_UPGRADES, type HaulageEffect } from '../../data/haulage/upgrades';
import { HAULAGE_CREW_BOOSTS } from '../../data/haulage/crew-boosts';
import { formatNumber } from '../../shared/format';
import { isCrewEffective } from '../crew';
import { horrorProductionMultiplier } from '../horrors';
import { appendLog } from '../log';
import type { HaulageMission as MissionState } from '../state';

export const COST_GROWTH = 1.15;
/** Cars are the value side of the haul and get dearer a little faster than engines. */
export const CAR_COST_GROWTH = 1.18;
export const MIN_BURN = 1;
export const MAX_BURN = 10;
/** The notch at which speed and fuel rate are quoted: thrust over mass, one unit of fuel per second per four of thrust. */
export const NOMINAL_BURN = 5;
export const DEFAULT_BURN = 5;
const SAFE_BURN = 6;
/** Share of the freight's condition lost per leg for each notch past the strain line, squared. */
const STRAIN = 0.02;
/** Fuel burned per second per point of thrust at the nominal burn. Rises with the square of the burn. */
const FUEL_PER_THRUST = 0.25;
export const FUEL_PRICE = 1;
/** Credits per unit of freight value per unit of distance delivered. */
const PAY = 1;
const WINDOW_BONUS = 0.5;
const LEG_BASE = 30;
const LEG_GROWTH = 1.6;
const WINDOW_BASE = 60;
const WINDOW_GROWTH = 1.3;
export const DOCK_SECONDS = 10;
const THRUSTER_PUSH = 1;
// Same curve as extraction's shaft depth, so the shared story scale lines up (tuned by the pacing bot).
const PROGRESS_SCALE = 0.0432;
const PROGRESS_EXPONENT = 5.48;

interface Multipliers {
  thrusters: number;
  autoThrusters: number;
  thrust: number;
  engine: Record<string, number>;
  car: Record<string, number>;
  pay: number;
  fuelEfficiency: number;
  safeBurn: number;
  autopilot: boolean;
  droneLoaders: boolean;
  window: number;
}

function applyEffect(r: Multipliers, e: HaulageEffect): void {
  switch (e.kind) {
    case 'thrusterMultiplier':
      r.thrusters *= e.value;
      break;
    case 'autoThrusters':
      r.autoThrusters += e.value;
      break;
    case 'thrustMultiplier':
      r.thrust *= e.value;
      break;
    case 'engineMultiplier':
      r.engine[e.engine] = (r.engine[e.engine] ?? 1) * e.value;
      break;
    case 'carMultiplier':
      r.car[e.car] = (r.car[e.car] ?? 1) * e.value;
      break;
    case 'payMultiplier':
      r.pay *= e.value;
      break;
    case 'fuelEfficiency':
      r.fuelEfficiency *= e.value;
      break;
    case 'safeBurn':
      r.safeBurn += e.value;
      break;
    case 'autopilot':
      r.autopilot = true;
      break;
    case 'droneLoaders':
      r.droneLoaders = true;
      break;
    case 'windowMultiplier':
      r.window *= e.value;
      break;
  }
}

function multipliers(m: MissionState): Multipliers {
  const r: Multipliers = {
    thrusters: 1,
    autoThrusters: 0,
    thrust: 1,
    engine: {},
    car: {},
    pay: horrorProductionMultiplier(m) * m.config.productionMultiplier,
    fuelEfficiency: 1,
    safeBurn: SAFE_BURN,
    autopilot: false,
    droneLoaders: false,
    window: 1,
  };
  for (const u of HAULAGE_UPGRADES) if (m.upgrades.includes(u.id)) applyEffect(r, u.effect);
  for (const [id, boost] of Object.entries(HAULAGE_CREW_BOOSTS)) if (isCrewEffective(m, id)) applyEffect(r, boost.effect);
  return r;
}

// ---------- purchases ----------

export const engineCost = (def: EngineDef, owned: number): number => Math.ceil(def.baseCost * COST_GROWTH ** owned);
export const carCost = (def: CarDef, owned: number): number => Math.ceil(def.baseCost * CAR_COST_GROWTH ** owned);

export function buyEngine<M extends MissionState>(m: M, id: string): M {
  const def = ENGINES.find((e) => e.id === id);
  if (!def) return m;
  const owned = m.engines[id] ?? 0;
  const cost = engineCost(def, owned);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, engines: { ...m.engines, [id]: owned + 1 } };
}

export function buyCar<M extends MissionState>(m: M, id: string): M {
  const def = CARS.find((c) => c.id === id);
  if (!def) return m;
  const owned = m.cars[id] ?? 0;
  const cost = carCost(def, owned);
  if (m.credits < cost) return m;
  return { ...m, credits: m.credits - cost, cars: { ...m.cars, [id]: owned + 1 } };
}

/** The first tier is always visible; each further one once the one before it is owned. */
export function isEngineRevealed(m: MissionState, index: number): boolean {
  return index === 0 || ENGINES.slice(index - 1).some((e) => (m.engines[e.id] ?? 0) > 0);
}

export function isCarRevealed(m: MissionState, index: number): boolean {
  return index === 0 || CARS.slice(index - 1).some((c) => (m.cars[c.id] ?? 0) > 0);
}

// ---------- the train ----------

export function engineThrust(m: MissionState, def: EngineDef): number {
  const mult = multipliers(m);
  return def.thrust * (mult.engine[def.id] ?? 1) * mult.thrust;
}

export function thrust(m: MissionState): number {
  return ENGINES.reduce((s, e) => s + (m.engines[e.id] ?? 0) * engineThrust(m, e), 0);
}

export function carValue(m: MissionState, def: CarDef): number {
  return def.value * (multipliers(m).car[def.id] ?? 1);
}

/** Freight value per unit of distance: what the whole train earns as it moves. */
export function trainValue(m: MissionState): number {
  return CARS.reduce((s, c) => s + (m.cars[c.id] ?? 0) * carValue(m, c), TUG_VALUE);
}

export function trainMass(m: MissionState): number {
  return CARS.reduce((s, c) => s + (m.cars[c.id] ?? 0) * c.mass, TUG_MASS);
}

export const safeBurn = (m: MissionState): number => multipliers(m).safeBurn;

export function setBurn<M extends MissionState>(m: M, burn: number): M {
  const next = Math.max(MIN_BURN, Math.min(MAX_BURN, Math.round(burn)));
  return next === m.burn ? m : { ...m, burn: next };
}

/** Distance per second on the engines alone, at a given notch. */
export function speed(m: MissionState, burn: number): number {
  return (thrust(m) * (burn / NOMINAL_BURN)) / trainMass(m);
}

export function fuelRate(m: MissionState, burn: number): number {
  return (thrust(m) * FUEL_PER_THRUST * (burn / NOMINAL_BURN) ** 2) / multipliers(m).fuelEfficiency;
}

// ---------- legs and windows ----------

export const legDistance = (leg: number): number => LEG_BASE * LEG_GROWTH ** leg;

export const legWindow = (m: MissionState, leg: number): number => WINDOW_BASE * WINDOW_GROWTH ** leg * multipliers(m).window;

export const isDocked = (m: MissionState): boolean => m.docked > 0;

/** Fuel for what is left of this leg (or all of the next one, at a dock), at the burn the tug will fly. */
export function fuelForLeg(m: MissionState): number {
  const burn = effectiveBurn(m);
  const v = speed(m, burn);
  if (v <= 0) return 0;
  const remaining = legDistance(m.leg) - m.travelled;
  return (remaining / v) * fuelRate(m, burn);
}

/** Buy fuel for the next leg at a station, as far as the credits go. */
export function refuel<M extends MissionState>(m: M): M {
  if (!isDocked(m)) return m;
  const want = Math.max(0, fuelForLeg(m) - m.fuel);
  const bought = Math.min(want, m.credits / FUEL_PRICE);
  if (bought <= 0) return m;
  return { ...m, credits: m.credits - bought * FUEL_PRICE, fuel: m.fuel + bought };
}

// ---------- the burn: player or autopilot ----------

export function isAutopilotActive(m: MissionState): boolean {
  return multipliers(m).autopilot && !m.autopilotOff;
}

/** Take the burn back from WARDEN, or hand it over again. Only once the autopilot is installed. */
export function toggleAutopilot<M extends MissionState>(m: M): M {
  if (!multipliers(m).autopilot) return m;
  return { ...m, autopilotOff: !m.autopilotOff };
}

/** Fuel spent per credit earned at a notch: the share of each delivery the tanks eat. */
function fuelShare(m: MissionState, burn: number): number {
  return ((FUEL_PRICE * FUEL_PER_THRUST * trainMass(m)) / (PAY * trainValue(m) * multipliers(m).fuelEfficiency)) * (burn / NOMINAL_BURN);
}

/**
 * WARDEN's choice: the gentlest notch that still makes the window, never past the strain line. With the window
 * lost, the notch that earns most once fuel is paid for.
 */
function autopilotBurn(m: MissionState): number {
  const safe = Math.min(MAX_BURN, safeBurn(m));
  const thrustNow = thrust(m);
  if (thrustNow <= 0) return safe;
  const timeLeft = legWindow(m, m.leg) - m.legTime;
  const remaining = legDistance(m.leg) - m.travelled;
  if (timeLeft > 0) {
    const needed = Math.ceil((remaining / timeLeft) * NOMINAL_BURN * (trainMass(m) / thrustNow));
    if (needed <= safe) return Math.max(MIN_BURN, needed);
  }
  // Net earnings per second scale with b(1 - share(b)); the best notch is where share(b) = 1/2.
  const best = Math.round(NOMINAL_BURN / (2 * fuelShare(m, NOMINAL_BURN)));
  return Math.max(MIN_BURN, Math.min(safe, best));
}

export function effectiveBurn(m: MissionState): number {
  return isAutopilotActive(m) ? autopilotBurn(m) : m.burn;
}

// ---------- manual bursts and the tick ----------

export const thrusterPower = (m: MissionState): number => THRUSTER_PUSH * multipliers(m).thrusters;
export const autoThrusterRate = (m: MissionState): number => multipliers(m).autoThrusters;

/** What a delivery of this leg pays, if it arrived now. */
export function deliveryPay(m: MissionState): number {
  const onTime = m.legTime <= legWindow(m, m.leg);
  return PAY * trainValue(m) * legDistance(m.leg) * m.condition * (onTime ? 1 + WINDOW_BONUS : 1) * multipliers(m).pay;
}

/** Expected credits per second while under way: a delivery's pay spread over the time the leg takes. */
export function incomeRate(m: MissionState): number {
  const burn = effectiveBurn(m);
  const v = (m.fuel > 0 ? speed(m, burn) : 0) + autoThrusterRate(m) * thrusterPower(m);
  if (v <= 0) return 0;
  const legSeconds = legDistance(m.leg) / v + DOCK_SECONDS;
  return deliveryPay(m) / legSeconds;
}

function arrive<M extends MissionState>(m: M): M {
  const pay = deliveryPay(m);
  const onTime = m.legTime <= legWindow(m, m.leg);
  const station = stationName(m.leg);
  let next: M = {
    ...m,
    credits: m.credits + pay,
    lifetimeCredits: m.lifetimeCredits + pay,
    delivered: m.delivered + pay,
    onTime: m.onTime + (onTime ? 1 : 0),
    leg: m.leg + 1,
    travelled: 0,
    legTime: 0,
    condition: 1,
    docked: DOCK_SECONDS,
  };
  const damaged = m.condition < 1 ? ` FREIGHT CONDITION ${Math.round(m.condition * 100)}%.` : '';
  next = appendLog(next, 'corp', `DELIVERED AT ${station}: ${formatNumber(pay)} CR${onTime ? ' (INSIDE THE WINDOW, +50%)' : ' (WINDOW MISSED)'}.${damaged}`);
  if (multipliers(next).droneLoaders) next = refuel(next);
  return next;
}

/** Push the train along the current leg, delivering if it gets there. */
function travel<M extends MissionState>(m: M, distance: number, burn: number): M {
  if (distance <= 0) return m;
  const length = legDistance(m.leg);
  const covered = Math.min(distance, length - m.travelled);
  const over = Math.max(0, burn - safeBurn(m));
  const condition = Math.max(0, m.condition - STRAIN * over * over * (covered / length));
  const next = { ...m, travelled: m.travelled + covered, condition };
  return next.travelled >= length - 1e-9 ? arrive(next) : next;
}

/** A burst on the manoeuvring thrusters: a little distance, no fuel. Nothing to push against at a dock. */
export function fireThrusters<M extends MissionState>(m: M): M {
  if (isDocked(m)) return m;
  return travel(m, thrusterPower(m), MIN_BURN);
}

export function tickHaulage<M extends MissionState>(m: M, dt: number): M {
  if (isDocked(m)) {
    const docked = Math.max(0, m.docked - dt);
    return { ...m, docked };
  }
  const burn = effectiveBurn(m);
  const rate = fuelRate(m, burn);
  // A dry tank leaves only the manoeuvring thrusters.
  const share = rate > 0 ? Math.min(1, m.fuel / (rate * dt)) : 0;
  const distance = speed(m, burn) * dt * share + autoThrusterRate(m) * thrusterPower(m) * dt;
  const fuelled = { ...m, fuel: Math.max(0, m.fuel - rate * dt * share), legTime: m.legTime + dt };
  return travel(fuelled, distance, burn);
}

/** Haulage progress on the shared story scale (extraction's metres). */
export function progress(m: MissionState): number {
  return Math.floor(PROGRESS_SCALE * Math.log10(1 + m.delivered) ** PROGRESS_EXPONENT);
}

export const answeredBeacon = (m: MissionState): boolean => m.leg > BEACON_LEG;

// ---------- requisitions ----------

export function isHaulageUpgradeUnlocked(m: MissionState, id: string): boolean {
  const u = HAULAGE_UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  if (u.unlock.delivered !== undefined && m.delivered < u.unlock.delivered) return false;
  if (u.unlock.engine && (m.engines[u.unlock.engine.id] ?? 0) < u.unlock.engine.count) return false;
  if (u.unlock.car && (m.cars[u.unlock.car.id] ?? 0) < u.unlock.car.count) return false;
  return true;
}

export function availableHaulageUpgrades(m: MissionState) {
  return HAULAGE_UPGRADES.filter((u) => !m.upgrades.includes(u.id) && isHaulageUpgradeUnlocked(m, u.id)).sort((a, b) => a.cost - b.cost);
}

export function buyHaulageUpgrade<M extends MissionState>(m: M, id: string): M {
  const u = HAULAGE_UPGRADES.find((x) => x.id === id);
  if (!u || m.upgrades.includes(id) || !isHaulageUpgradeUnlocked(m, id) || m.credits < u.cost) return m;
  return { ...m, credits: m.credits - u.cost, upgrades: [...m.upgrades, id] };
}
