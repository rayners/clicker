/**
 * The generic bot for games made of data: a sensible, greedy player that knows every purchase because the
 * definition lists them, for pacing tests and tuning without writing code.
 * @module
 */
import { playthrough, type PlaythroughResult } from '../bot';
import type { DataAction, DataGame, DataRun } from './game';

/** Seconds of sales to keep on the shelf before cutting the price, and how few before raising it. */
const GLUT_SECONDS = 20;
const SCARCE_SECONDS = 3;
/** Never sell below this many times what the supplied input in one unit costs. */
const MARGIN = 2;
/** Seconds of use to keep in supply, and a floor for it. */
const SUPPLY_SECONDS = 10;
const SUPPLY_MIN = 200;
/** Buy producers while they make less than this share of demand. */
const PRODUCTION_SHARE = 1.2;

/** `'45s'`, `'10m'`, `'4h'` in seconds. */
export function parseDuration(text: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*([smh])$/.exec(text.trim());
  if (!m) throw new Error(`not a duration: "${text}"`);
  return Number(m[1]) * { s: 1, m: 60, h: 3600 }[m[2] as 's' | 'm' | 'h'];
}

/** What the bot would do now, or null. */
export function decideData(game: DataGame, run: DataRun): DataAction | null {
  const def = game.definition;
  const market = def.mechanics?.market;
  const supply = def.mechanics?.supply;
  const items = def.items ?? [];
  const funds = (resource: string) => run.amounts[resource] ?? 0;
  const producers = items.filter((i) => market && (i.converts?.[market.sells] ?? 0) > 0);
  const making = producers.reduce((sum, i) => sum + (run.owned[i.id] ?? 0) * game.stat(run, `${i.id}.rate`) * i.converts![market!.sells]!, 0);
  const reserve = supply ? run.supplyPrice : 0;

  if (market) {
    const want = game.demand(run);
    const onHand = funds(market.sells);
    const floor = supply ? (run.supplyPrice / game.stat(run, 'supply.lot')) * MARGIN : market.price.min;
    const glut = onHand > want * GLUT_SECONDS;
    if (glut && run.price - market.price.step >= Math.max(floor, market.price.min)) return { type: 'price', step: -1 };
    if (onHand < want * SCARCE_SECONDS && making > 0 && (!supply || funds(supply.buys) >= 1)) return { type: 'price', step: 1 };
    const upgrade = game.availableUpgrades(run).find((u) => funds(u.cost.resource) >= u.cost.amount);
    if (upgrade) return { type: 'upgrade', id: upgrade.id };
    const boosters = items.filter((i) => (i.effects ?? []).some((e) => e.target === 'market.demand') && game.itemShown(run, i.id));
    const affordableBooster = boosters.find((i) => game.price(run, i.id) <= funds(i.cost.resource) - (glut ? 0 : reserve));
    // A pile nobody buys at the lowest sensible price wants customers, not more input.
    if (glut) return affordableBooster ? { type: 'buy', id: affordableBooster.id } : null;
    if (supply) {
      const use = items.reduce((sum, i) => sum + Math.max(0, -(i.converts?.[supply.buys] ?? 0)) * (run.owned[i.id] ?? 0) * game.stat(run, `${i.id}.rate`), 0);
      const dry = funds(supply.buys) < 1 && onHand < 1;
      if (funds(supply.buys) < Math.max(SUPPLY_MIN, use * SUPPLY_SECONDS) && (funds(supply.with) >= run.supplyPrice || dry)) return { type: 'supply' };
    }
    if (making < want * PRODUCTION_SHARE) {
      const cheapest = producers.filter((i) => game.itemShown(run, i.id)).sort((a, b) => game.price(run, a.id) - game.price(run, b.id))[0];
      return cheapest && game.price(run, cheapest.id) <= funds(cheapest.cost.resource) - reserve ? { type: 'buy', id: cheapest.id } : null;
    }
    return affordableBooster ? { type: 'buy', id: affordableBooster.id } : null;
  }

  // No market: buy whatever is affordable, cheapest first.
  const upgrade = game.availableUpgrades(run).find((u) => funds(u.cost.resource) >= u.cost.amount);
  if (upgrade) return { type: 'upgrade', id: upgrade.id };
  const item = items
    .filter((i) => game.itemShown(run, i.id) && game.price(run, i.id) <= funds(i.cost.resource))
    .sort((a, b) => game.price(run, a.id) - game.price(run, b.id))[0];
  return item ? { type: 'buy', id: item.id } : null;
}

/** A playthrough of a data game by the generic bot. */
export function playDataGame(game: DataGame, options: { seed: number; maxSeconds: number }): PlaythroughResult<DataRun> {
  return playthrough<DataRun, DataAction>({
    start: game.create(options.seed),
    reduce: game.reduce,
    press: { type: 'press' },
    decide: (run) => decideData(game, run),
    tick: game.tick,
    act: (run) => run.act,
    done: (run) => run.flags.includes('terminus'),
    maxSeconds: options.maxSeconds,
  });
}
