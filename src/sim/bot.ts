import { createGame, createProfile, tickGame, type GameState } from '../core/game';
import { missionConfigFor } from '../core/prestige';
import { reduce, type Action } from '../core/store';
import { CREW } from '../data/crew';
import { GENERATORS } from '../data/extraction/generators';
import { generatorCost, generatorRate, oreRate, refineryCapacity, refineryCost } from '../mission/extraction/economy';
import { availableUpgrades } from '../mission/extraction/upgrades';
import { crewStatus, isCrewUnlocked, maxAwake, awakeCount } from '../mission/crew';
import { containmentLevelCost, isSpecialProjectsUnlocked, reinforceCost, rigCost, ventCost } from '../mission/organism/containment';
import { createMission, type MissionOf, type ScenarioId } from '../mission/state';
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
} from '../mission/terraform/economy';

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

/** A sensible, greedy player. Not optimal: idle-ish after the first stretch, checks in periodically. */
function decide(game: GameState): Action | null {
  const shared = decideShared(game);
  if (shared) return shared;
  return game.mission.scenario === 'terraform' ? decideTerraform(game) : decideExtraction(game);
}

export function simulateRun(options: SimOptions): SimResult {
  const { seed, maxSeconds, scenario = 'extraction', seniority = 0, activeClicks = 4, activeSeconds = 20 * 60, decisionInterval = 5 } =
    options;
  let game: GameState = createGame(seed, 0);
  const profile = seniority > 0 ? { ...createProfile(), seniority, contractsCompleted: 1, endingsSeen: ['deliver'] } : game.profile;
  game = { ...game, profile, mission: createMission(missionConfigFor(profile, scenario), seed) };
  const press: Action = scenario === 'terraform' ? { type: 'surge' } : { type: 'drill' };
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
    const act = game.mission.act;
    if (actAt[act] === undefined) actAt[act] = t;
    if (terminusAt === undefined && game.mission.flags.includes('terminus')) {
      terminusAt = t;
      break;
    }
  }
  return { actAt, terminusAt, final: game };
}
