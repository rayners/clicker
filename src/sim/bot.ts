import { createGame, createProfile, tickGame, type GameState } from '../core/game';
import { missionConfigFor } from '../core/prestige';
import { reduce, type Action } from '../core/store';
import { CREW } from '../data/crew';
import { GENERATORS } from '../data/generators';
import { generatorCost, generatorRate, oreRate, refineryCapacity, refineryCost } from '../mission/economy';
import { availableUpgrades } from '../mission/upgrades';
import { crewStatus, isCrewUnlocked, maxAwake, awakeCount } from '../mission/crew';
import { containmentLevelCost, isSpecialProjectsUnlocked, reinforceCost, rigCost, ventCost } from '../mission/containment';
import { createMission } from '../mission/state';

export interface SimOptions {
  seed: number;
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

/** A sensible, greedy player. Not optimal: idle-ish after the first stretch, checks in periodically. */
function decide(game: GameState): Action | null {
  const m = game.mission;

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

  const upgrade = availableUpgrades(m).find((u) => u.cost <= m.credits);
  if (upgrade) return { type: 'buyUpgrade', id: upgrade.id };

  if (isSpecialProjectsUnlocked(m)) {
    if (m.specimens >= 4 + m.containmentLevel * 4 && m.credits >= containmentLevelCost(m)) return { type: 'buyContainmentLevel' };
    const containable = m.specimens < 10 * (1 + m.containmentLevel);
    if (containable && m.credits >= rigCost(m) && rigCost(m) < m.credits * 0.5) return { type: 'buyRig' };
  }

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

export function simulateRun(options: SimOptions): SimResult {
  const { seed, maxSeconds, seniority = 0, activeClicks = 4, activeSeconds = 20 * 60, decisionInterval = 5 } = options;
  let game = createGame(seed, 0);
  if (seniority > 0) {
    const profile = { ...createProfile(), seniority, contractsCompleted: 1, endingsSeen: ['deliver'] };
    game = { ...game, profile, mission: createMission(missionConfigFor(profile), seed) };
  }
  const actAt: Record<number, number> = { 1: 0 };
  let terminusAt: number | undefined;

  for (let t = 1; t <= maxSeconds; t++) {
    const clicks = t <= activeSeconds ? activeClicks : t % 10 === 0 ? 1 : 0;
    for (let c = 0; c < clicks; c++) game = reduce(game, { type: 'drill' });
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
