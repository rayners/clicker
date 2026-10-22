import { createGame, tickGame, type GameState } from '../core/game';
import { reduce, type Action } from '../core/store';
import { charterable, charterCost, divisionCost, floorCost, freeSlot, MAX_SLOTS } from '../core/boardroom';
import { DIVISIONS } from '../data/boardroom/divisions';

/** Seconds of Board time per simulated step: the Board decides at each step, as a player checking in would. */
const STEP = 5;
/** The order a sensible Board funds its divisions in. */
const DIVISION_ORDER = ['coo', 'legal', 'personnel', 'logistics', 'specialProjects', 'bioproducts'] as const;

/** A sensible Board: keeps every office busy, buys floors and divisions it can comfortably afford, delivers. */
function decideBoard(g: GameState): Action | null {
  const b = g.boardroom!;
  const kinds = charterable(g);
  if (freeSlot(b) !== null && b.frozenFor <= 0) {
    const kind = kinds.includes('extraction') ? 'extraction' : kinds[0]!;
    if (b.value >= charterCost(b, kind)) return { type: 'commission', scenario: kind, seed: (b.elapsed * 7919 + b.contracts.length) | 0 };
  }
  if (b.slots < MAX_SLOTS && b.value >= floorCost(b) * 1.5) return { type: 'buyFloor' };
  for (const id of DIVISION_ORDER) {
    const d = DIVISIONS.find((x) => x.id === id)!;
    const owned = b.divisions[id] ?? 0;
    if (owned < d.max && b.value >= divisionCost(d, owned) * 2) return { type: 'buyDivision', id };
  }
  return null;
}

export function simulateBoard(options: { seed: number; maxSeconds: number; trace?(g: GameState, t: number): void }) {
  const base = createGame(options.seed, 0);
  let game: GameState = reduce({ ...base, profile: { ...base.profile, contractsCompleted: 10 } }, { type: 'enterBoardroom', seed: options.seed });
  const actAt: Record<number, number> = { 1: 0 };
  let termAt: number | undefined;
  for (let t = STEP; t <= options.maxSeconds; t += STEP) {
    for (let i = 0; i < 10; i++) {
      const action = decideBoard(game);
      if (!action) break;
      const next = reduce(game, action);
      if (next === game) break;
      game = next;
    }
    game = tickGame(game, STEP);
    options.trace?.(game, t);
    const act = game.boardroom!.act;
    if (actAt[act] === undefined) actAt[act] = t;
    if (game.boardroom!.flags.includes('term-end')) {
      termAt = t;
      break;
    }
  }
  return { actAt, termAt, final: game };
}
