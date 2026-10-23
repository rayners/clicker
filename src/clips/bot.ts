import { playthrough, type PlaythroughResult } from '../engine/bot';
import { createClipsGame, reduce, type ClipsAction, type ClipsGame } from './game';
import { autoclipperCost, availableUpgrades, clipperRate, demand, marketingCost } from './works';

/** Seconds of sales the bot keeps on hand before it lowers the price, and how few before it raises it. */
const GLUT_SECONDS = 20;
const SCARCE_SECONDS = 3;
/** Seconds of bending to keep on the bench (at least a few hundred inches). */
const WIRE_SECONDS = 10;
const WIRE_MIN = 200;
/** Never sell below this many times what the wire in a clip costs. */
const MARGIN = 2;
const SPOOL_INCHES = 1_000;

/** A sensible, greedy owner: keeps wire on the bench, sets the price by the pile, then buys the cheapest growth. */
export function decideClips(game: ClipsGame): ClipsAction | null {
  const w = game.works;
  const want = demand(w);
  const making = w.autoclippers * clipperRate(w);
  const floor = (w.wireCost / SPOOL_INCHES) * MARGIN;
  const glut = w.unsold > want * GLUT_SECONDS;
  if (glut && w.price - 0.01 >= floor) return { type: 'shiftPrice', step: -1 };
  // Dearer while people buy faster than the bench fills the shelf; an empty shelf from an idle bench is no reason.
  if (w.unsold < want * SCARCE_SECONDS && w.wire >= 1 && making > 0) return { type: 'shiftPrice', step: 1 };
  const upgrade = availableUpgrades(w).find((u) => u.cost <= w.funds);
  if (upgrade) return { type: 'buyUpgrade', id: upgrade.id };
  // A pile nobody buys at the lowest sensible price wants customers, not wire.
  if (glut) return marketingCost(w) <= w.funds ? { type: 'buyMarketing' } : null;
  const dry = w.wire < 1 && w.unsold < 1;
  if (w.wire < Math.max(WIRE_MIN, making * WIRE_SECONDS) && (w.funds >= w.wireCost || dry)) return { type: 'buyWire' };
  // Keep the bench and the market roughly matched: clippers while people want more than the bench makes.
  if (making < want * 1.2) return autoclipperCost(w) <= w.funds - w.wireCost ? { type: 'buyAutoclipper' } : null;
  return marketingCost(w) <= w.funds - w.wireCost ? { type: 'buyMarketing' } : null;
}

/** A playthrough of CLIP WORKS by the bot, for the pacing test and `npm run simulate:clips`. */
export function simulateClips(options: { seed: number; maxSeconds: number }): PlaythroughResult<ClipsGame> {
  return playthrough<ClipsGame, ClipsAction>({
    start: createClipsGame(options.seed, 0),
    reduce,
    press: { type: 'makeClip' },
    decide: decideClips,
    tick: (g, dt) => reduce(g, { type: 'tick', dt }),
    act: (g) => g.works.act,
    done: (g) => g.works.flags.includes('terminus'),
    maxSeconds: options.maxSeconds,
    milestones: { firstClipper: (g) => g.works.autoclippers > 0 },
  });
}
