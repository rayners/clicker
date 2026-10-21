import { advance, createGame, createProfile, tickGame, type GameState } from '../core/game';
import { creatureUpgradeCost, CREATURE_ADAPTER, isCreatureUpgradeAvailable, startCreature, type CreaturePrey } from '../core/creature';
import { CREATURE_UPGRADES } from '../data/creature/upgrades';
import { missionConfigFor } from '../core/prestige';
import { reduce, type Action } from '../core/store';
import { CREW } from '../data/crew';
import { GENERATORS } from '../data/extraction/generators';
import { generatorCost, generatorRate, oreRate, refineryCapacity, refineryCost } from '../mission/extraction/economy';
import { availableUpgrades } from '../mission/extraction/upgrades';
import { crewStatus, isCrewUnlocked, maxAwake, awakeCount } from '../mission/crew';
import { containmentLevelCost, isSpecialProjectsUnlocked, reinforceCost, rigCost, ventCost } from '../mission/organism/containment';
import { createMission, type MissionOf, type MissionState, type ScenarioId } from '../mission/state';
import { LINES, PROCESSORS, REACTORS } from '../data/terraform/systems';
import {
  allocate,
  availableTerraformUpgrades,
  capacity,
  incomeRate,
  isAutoBalanced,
  isProcessorRevealed,
  isReactorRevealed,
  power,
  processorCost,
  processorRate,
  reactorCost,
  spec,
  canThaw,
} from '../mission/terraform/economy';

import { FABRICATORS, TROOPERS } from '../data/security/systems';
import {
  ammoDemand,
  ammoSupply,
  availableSecurityUpgrades,
  fabricatorCost,
  holdForce,
  isFabricatorRevealed,
  isTacticalNetActive,
  isTrooperRevealed,
  sentryCost,
  trooperCost,
  trooperForce,
} from '../mission/security/economy';
import { held as heldCount } from '../shared/ground';
import { CARS, ENGINES } from '../data/haulage/systems';
import {
  availableHaulageUpgrades,
  carCost,
  engineCost,
  fuelForLeg,
  fuelPrice,
  isAutopilotActive,
  isCarRevealed,
  isDocked,
  isEngineRevealed,
  safeBurn,
  thrust,
  trainMass,
  trainValue,
} from '../mission/haulage/economy';
import { SECTIONS } from '../data/security/systems';

export interface SimOptions {
  seed: number;
  scenario?: ScenarioId;
  maxSeconds: number;
  seniority?: number;
  /** Clicks per second while the player is actively playing. */
  activeClicks?: number;
  /** How long the player actively clicks before going mostly idle. */
  activeSeconds?: number;
  /** Seconds between the bot's purchase decisions. */
  decisionInterval?: number;
  /** Called every ten minutes of simulated time (tuning scripts). */
  trace?(game: GameState, t: number): void;
}

export interface SimResult {
  actAt: Record<number, number>;
  terminusAt?: number;
  final: GameState;
}

/** Decisions any contract needs: containment emergencies and crew. */
function decideShared(game: GameState): Action | null {
  const m = game.mission as MissionOf<ScenarioId, 'organism'>;

  // Containment emergencies first.
  if (m.contacts >= 3 && m.credits >= ventCost(m)) {
    // Get everyone back into cryo before opening the decks to vacuum.
    const awake = CREW.find((c) => m.crew[c.id]?.status === 'awake');
    return awake ? { type: 'sleepCrew', id: awake.id } : { type: 'vent' };
  }
  if (isSpecialProjectsUnlocked(m) && m.integrity < 40 && m.credits >= reinforceCost(m)) return { type: 'reinforce' };

  // Crew: sleep the exhausted, wake whoever is affordable and rested.
  for (const c of CREW) {
    if (crewStatus(m, c.id) === 'exhausted') return { type: 'sleepCrew', id: c.id };
  }
  if (isCrewUnlocked(m) && awakeCount(m) < maxAwake(m)) {
    const candidate = CREW.find((c) => m.crew[c.id]?.status === 'cryo' && m.crew[c.id]!.fatigue === 0 && c.thawCost <= m.credits * 0.25);
    if (candidate) return { type: 'wakeCrew', id: candidate.id };
  }

  return null;
}

/** Special Projects: keep containment ahead of the specimen count, keep recovering. */
function decideProjects(game: GameState): Action | null {
  const m = game.mission as MissionOf<ScenarioId, 'organism'>;
  if (isSpecialProjectsUnlocked(m)) {
    if (m.specimens >= 4 + m.containmentLevel * 4 && m.credits >= containmentLevelCost(m)) return { type: 'buyContainmentLevel' };
    const containable = m.specimens < 10 * (1 + m.containmentLevel);
    if (containable && m.credits >= rigCost(m) && rigCost(m) < m.credits * 0.5) return { type: 'buyRig' };
  }
  return null;
}

function decideExtraction(game: GameState): Action | null {
  const m = game.mission as MissionOf<'extraction', 'organism'>;
  const upgrade = availableUpgrades(m).find((u) => u.cost <= m.credits);
  if (upgrade) return { type: 'buyUpgrade', id: upgrade.id };
  const projects = decideProjects(game);
  if (projects) return projects;

  // Keep the refinery ahead of production, otherwise buy the most cost-effective generator.
  const income = oreRate(m) + 1;
  if (refineryCapacity(m) < income * 1.2 && m.credits >= refineryCost(m)) return { type: 'buyRefinery' };
  let best: { id: string; value: number } | null = null;
  for (const g of GENERATORS) {
    const index = GENERATORS.indexOf(g);
    if (index > 0 && GENERATORS.slice(index - 1).every((x) => (m.generators[x.id] ?? 0) === 0)) continue;
    const cost = generatorCost(g, m.generators[g.id] ?? 0);
    if (cost > m.credits) continue;
    const value = generatorRate(m, g) / cost;
    if (!best || value > best.value) best = { id: g.id, value };
  }
  if (best && refineryCapacity(m) >= income) return { type: 'buyGenerator', id: best.id };
  return null;
}

type Terra = MissionOf<'terraform', 'organism'>;

/** One manual rebalancing step: the single ±10% move that most improves income, if any. */
function bestAllocationStep(m: Terra): Action | null {
  if (isAutoBalanced(m)) return null;
  let best: { action: Action; income: number } | null = null;
  const now = incomeRate(m);
  for (const line of LINES) {
    for (const step of [1, -1] as const) {
      const income = incomeRate(allocate(m, line.id, step));
      if (income > now * 1.001 && (!best || income > best.income)) best = { action: { type: 'allocate', line: line.id, step }, income };
    }
  }
  return best?.action ?? null;
}

function decideTerraform(game: GameState): Action | null {
  const m = game.mission as Terra;
  if (canThaw(m)) return { type: 'thawWave' };
  const upgrade = availableTerraformUpgrades(m).find((u) => u.cost <= m.credits);
  if (upgrade) return { type: 'buyUpgrade', id: upgrade.id };
  const projects = decideProjects(game);
  if (projects) return projects;
  const rebalance = bestAllocationStep(m);
  if (rebalance) return rebalance;

  // Keep reactors ahead of processor demand, otherwise grow the line furthest behind spec.
  const cap = capacity(m);
  const demand = LINES.reduce((s, l) => s + cap[l.id], 0) + 1;
  if (power(m) < demand * 1.2) {
    let bestReactor: { id: string; value: number; cost: number } | null = null;
    REACTORS.forEach((r, i) => {
      if (!isReactorRevealed(m, i)) return;
      const cost = reactorCost(r, m.reactors[r.id] ?? 0);
      if (cost > m.credits) return;
      const value = r.mw / cost;
      if (!bestReactor || value > bestReactor.value) bestReactor = { id: r.id, value, cost };
    });
    const pick = bestReactor as { id: string; value: number; cost: number } | null;
    if (pick && pick.cost <= m.credits) return { type: 'buyReactor', id: pick.id };
    if (power(m) < demand) return null;
  }
  const w = spec(m);
  const behind = [...LINES].sort((a, b) => cap[a.id] / w[a.id] - cap[b.id] / w[b.id])[0]!;
  let best: { id: string; value: number; cost: number } | null = null;
  for (const p of PROCESSORS.filter((x) => x.line === behind.id)) {
    if (!isProcessorRevealed(m, p)) continue;
    const cost = processorCost(p, m.processors[p.id] ?? 0);
    if (cost > m.credits) continue;
    const value = processorRate(m, p) / cost;
    if (!best || value > best.value) best = { id: p.id, value, cost };
  }
  if (best && best.cost <= m.credits) return { type: 'buyProcessor', id: best.id };
  return null;
}

type Sec = MissionOf<'security', 'organism'>;
const MIN_ASSAULT_SHARE = 3;

/** Hold what is secured, push with the rest, keep the fabricators ahead of the guns. */
function decideSecurity(game: GameState): Action | null {
  const m = game.mission as Sec;
  const upgrade = availableSecurityUpgrades(m).find((u) => u.cost <= m.credits);
  if (upgrade) return { type: 'buyUpgrade', id: upgrade.id };
  const projects = decideProjects(game);
  if (projects) return projects;

  if (!isTacticalNetActive(m)) {
    const need = m.ground.reduce((s, sec, i) => (sec.secured ? s + SECTIONS[i]!.threat : s), 0);
    const hold = holdForce(m);
    // Never give up the assault entirely: an overstretched line is fixed by buying force, not by stalling.
    if (hold < need && m.assaultShare > MIN_ASSAULT_SHARE) return { type: 'shiftSplit', step: -1 };
    if (hold > need * 1.5 && m.assaultShare < 10) return { type: 'shiftSplit', step: 1 };
  }
  if (ammoDemand(m) > ammoSupply(m) * 0.95) {
    let best: { id: string; value: number } | null = null;
    FABRICATORS.forEach((f, i) => {
      if (!isFabricatorRevealed(m, i)) return;
      const cost = fabricatorCost(f, m.fabricators[f.id] ?? 0);
      if (cost > m.credits) return;
      const value = f.rate / cost;
      if (!best || value > best.value) best = { id: f.id, value };
    });
    const pick = best as { id: string; value: number } | null;
    if (pick) return { type: 'buyFabricator', id: pick.id };
    if (ammoDemand(m) > ammoSupply(m) * 1.5) return null;
  }
  if (heldCount(m.ground) > m.sentries + 2 && sentryCost(m) < m.credits * 0.3) return { type: 'buySentry' };
  let best: { id: string; value: number } | null = null;
  TROOPERS.forEach((t, i) => {
    if (!isTrooperRevealed(m, i)) return;
    const cost = trooperCost(t, m.troopers[t.id] ?? 0);
    if (cost > m.credits) return;
    const value = trooperForce(m, t) / cost;
    if (!best || value > best.value) best = { id: t.id, value };
  });
  const pick = best as { id: string; value: number } | null;
  return pick ? { type: 'buyTrooper', id: pick.id } : null;
}

type Haul = MissionOf<'haulage', 'organism'>;
/** Trips' worth of fuel money the bot keeps back before buying anything else. */
const FUEL_RESERVE_LEGS = 1.5;

/** What the train earns as it moves, roughly: thrust carries value, mass holds it back. */
const haulPower = (m: Haul) => (thrust(m) * trainValue(m)) / trainMass(m);

/** Keep the tanks full and the burn at the strain line; buy whichever engine or car adds most earning power per credit. */
function decideHaulage(game: GameState): Action | null {
  const m = game.mission as Haul;
  // Fill up at every station; a dry tank between stations is worth a tender's markup.
  if ((isDocked(m) ? m.fuel < fuelForLeg(m) : m.fuel <= 0 && fuelForLeg(m) > 0) && m.credits > 0) return { type: 'refuel' };
  if (!isAutopilotActive(m) && m.burn !== Math.min(10, safeBurn(m))) return { type: 'shiftBurn', step: m.burn < safeBurn(m) ? 1 : -1 };
  const upgrade = availableHaulageUpgrades(m).find((u) => u.cost <= m.credits);
  if (upgrade) return { type: 'buyUpgrade', id: upgrade.id };
  const projects = decideProjects(game);
  if (projects) return projects;

  const now = haulPower(m);
  let best: { action: Action; value: number } | null = null;
  const consider = (action: Action, cost: number, after: Haul) => {
    // Keep enough back to fuel the heavier train that the purchase makes.
    if (cost + Math.max(0, fuelForLeg(after) * FUEL_RESERVE_LEGS - m.fuel) * fuelPrice(m) > m.credits) return;
    // With no engines yet, an engine is the only thing worth having.
    const gain = now === 0 ? thrust(after) : haulPower(after) - now;
    const value = gain / cost;
    if (gain > 0 && (!best || value > best.value)) best = { action, value };
  };
  ENGINES.forEach((e, i) => {
    if (!isEngineRevealed(m, i)) return;
    const cost = engineCost(e, m.engines[e.id] ?? 0);
    consider({ type: 'buyEngine', id: e.id }, cost, { ...m, engines: { ...m.engines, [e.id]: (m.engines[e.id] ?? 0) + 1 } });
  });
  CARS.forEach((c, i) => {
    if (!isCarRevealed(m, i)) return;
    const cost = carCost(c, m.cars[c.id] ?? 0);
    consider({ type: 'buyCar', id: c.id }, cost, { ...m, cars: { ...m.cars, [c.id]: (m.cars[c.id] ?? 0) + 1 } });
  });
  const pick = best as { action: Action; value: number } | null;
  return pick ? pick.action : null;
}

/** A sensible, greedy player. Not optimal: idle-ish after the first stretch, checks in periodically. */
function decide(game: GameState): Action | null {
  const shared = decideShared(game);
  if (shared) return shared;
  if (game.mission.scenario === 'terraform') return decideTerraform(game);
  if (game.mission.scenario === 'security') return decideSecurity(game);
  if (game.mission.scenario === 'haulage') return decideHaulage(game);
  return decideExtraction(game);
}

const PRESS: Record<ScenarioId, Action> = { extraction: { type: 'drill' }, terraform: { type: 'surge' }, security: { type: 'fireSupport' },
  haulage: { type: 'fireThrusters' } };

const DEFEND_SECONDS = 5;
const EARLY_TAPS = 4;
const LATE_TAPS = 0.1;
const EARLY_SECONDS = 20 * 60;

/** A contract's own WARDEN, played by the bot: taps early, then buys every few seconds. Prey for the creature. */
export function defendMission<P extends { mission: MissionState; taps: number; decideIn: number }>(p: P, dt: number): P {
  let game: GameState = { ...createGame(0, 0), mission: p.mission };
  let taps = p.taps + dt * (p.mission.elapsed < EARLY_SECONDS ? EARLY_TAPS : LATE_TAPS);
  while (taps >= 1) {
    game = reduce(game, PRESS[p.mission.scenario]);
    taps -= 1;
  }
  let decideIn = p.decideIn - dt;
  if (decideIn <= 0) {
    decideIn += DEFEND_SECONDS;
    for (let i = 0; i < 20; i++) {
      const action = decide(game);
      if (!action) break;
      const next = reduce(game, action);
      if (next === game) break;
      game = next;
    }
  }
  return { ...p, mission: game.mission, taps, decideIn };
}

/** Ease off a ship before its WARDEN works it out; go back once it has mostly forgotten. */
const EASE_OFF_AT = 0.8;
const RETURN_AT = 0.4;

/** A sensible creature: grows when it can, lies low when notorious, stalks the ship least likely to vent. */
function decideCreature(game: GameState): Action | null {
  const c = game.creature!;
  const h = c.hunt;
  const upgrade = CREATURE_UPGRADES.find((u) => isCreatureUpgradeAvailable(c, u.id) && creatureUpgradeCost(c, u.id) <= h.dread);
  if (upgrade) return { type: 'buyCreatureUpgrade', id: upgrade.id };
  if (!h.dormant && h.notoriety > 4) return { type: 'toggleCreatureDormant' };
  if (h.dormant && h.notoriety < 1) return { type: 'toggleCreatureDormant' };
  const alarm = (p: CreaturePrey) => CREATURE_ADAPTER.alarm(p);
  const wary = h.prey.findIndex((p, i) => alarm(p) >= EASE_OFF_AT && h.split[i]! > 0);
  if (wary >= 0) return { type: 'shiftCreaturePush', index: wary, step: -1 };
  const used = h.split.reduce((a, b) => a + b, 0);
  if (used < h.strength) {
    const order = h.prey
      .map((p, i) => ({ i, score: alarm(p) + h.split[i]! * 0.2, ready: h.split[i]! > 0 ? alarm(p) < EASE_OFF_AT : alarm(p) < RETURN_AT }))
      .filter((x) => x.ready)
      .sort((a, b) => a.score - b.score);
    if (order[0]) return { type: 'shiftCreaturePush', index: order[0].i, step: 1 };
  }
  return null;
}

export function simulateCreature(options: { seed: number; maxSeconds: number; passive?: boolean }): { harvest: number; upgrades: number; beaten: number; final: GameState } {
  let game = startCreature(createGame(options.seed, 0), options.seed);
  for (let t = 1; t <= options.maxSeconds; t++) {
    if (!options.passive && t % 5 === 0) {
      for (let i = 0; i < 20; i++) {
        const action = decideCreature(game);
        if (!action) break;
        const next = reduce(game, action);
        if (next === game) break;
        game = next;
      }
    }
    game = advance(game, 1).game;
  }
  const h = game.creature!.hunt;
  return { harvest: h.harvest, upgrades: Object.values(game.creature!.bought).reduce((a, b) => a + b, 0), beaten: h.beaten, final: game };
}

export function simulateRun(options: SimOptions): SimResult {
  const { seed, maxSeconds, scenario = 'extraction', seniority = 0, activeClicks = 4, activeSeconds = 20 * 60, decisionInterval = 5 } =
    options;
  let game: GameState = createGame(seed, 0);
  const profile = seniority > 0 ? { ...createProfile(), seniority, contractsCompleted: 1, endingsSeen: ['deliver'] } : game.profile;
  game = { ...game, profile, mission: createMission(missionConfigFor(profile, scenario), seed) };
  const press = PRESS[scenario];
  const actAt: Record<number, number> = { 1: 0 };
  let terminusAt: number | undefined;

  for (let t = 1; t <= maxSeconds; t++) {
    const clicks = t <= activeSeconds ? activeClicks : t % 10 === 0 ? 1 : 0;
    for (let c = 0; c < clicks; c++) game = reduce(game, press);
    if (t % decisionInterval === 0) {
      // Several purchases per check-in, like a player clearing affordable buttons.
      for (let i = 0; i < 20; i++) {
        const action = decide(game);
        if (!action) break;
        const next = reduce(game, action);
        if (next === game) break;
        game = next;
      }
    }
    game = tickGame(game, 1);
    if (options.trace && t % 600 === 0) options.trace(game, t);
    const act = game.mission.act;
    if (actAt[act] === undefined) actAt[act] = t;
    if (terminusAt === undefined && game.mission.flags.includes('terminus')) {
      terminusAt = t;
      break;
    }
  }
  return { actAt, terminusAt, final: game };
}
