/**
 * A game made of data: compiles a `GameDefinition` into a pure simulation (create, reduce, tick) with its stats,
 * story, upgrades and endings. Every condition is checked when the definition loads.
 * @module
 */
import { appendLog } from '../log';
import { randomInt } from '../rng';
import { newStory, runBeats, type Beat, type StoryHost } from '../story';
import { compile, ExprError, type Expr, type ExprScope } from './expr';
import type { EffectDef, GameDefinition, ItemDef, UpgradeDef } from './definition';

/** A mistake in a definition, with the path to it (`upgrades[0].shown: …`). */
export class DefinitionError extends Error {}

/** One run of a data game. Plain data, so it saves as it is. */
export interface DataRun extends StoryHost<string> {
  seed: number;
  rng: number;
  amounts: Record<string, number>;
  owned: Record<string, number>;
  upgrades: string[];
  /** Currencies carried from earlier runs. */
  carried: Record<string, number>;
  /** The market's price, the supply's price, and seconds until the supply price moves. */
  price: number;
  supplyPrice: number;
  supplyDrift: number;
}

/** What the player (or the clock) can do to a run. */
export type DataAction =
  | { type: 'press' }
  | { type: 'buy'; id: string }
  | { type: 'upgrade'; id: string }
  | { type: 'price'; step: 1 | -1 }
  | { type: 'supply' }
  | { type: 'tick'; dt: number };

/** Most lots a supply automation buys in one go. */
const MAX_AUTO_LOTS = 100;
const DEFAULT_STORY_GAP = 30;

/** A compiled game: everything the engine needs to run, show and play a definition. */
export interface DataGame {
  definition: GameDefinition;
  create(seed: number, carried?: Record<string, number>): DataRun;
  reduce(run: DataRun, action: DataAction): DataRun;
  tick(run: DataRun, dt: number): DataRun;
  /** A stat after every effect on it: `<item>.rate`, `market.demand`, `supply.lot`. */
  stat(run: DataRun, target: string): number;
  /** An item's price now. */
  price(run: DataRun, id: string): number;
  /** People per second the market would sell to now. */
  demand(run: DataRun): number;
  availableUpgrades(run: DataRun): UpgradeDef[];
  itemShown(run: DataRun, id: string): boolean;
  /** Ends a run that has reached its end, granting the ending's currencies to the next. */
  complete(run: DataRun, ending: string, seed: number): DataRun;
  evaluate(run: DataRun, source: string): number | boolean;
  /** Compiles a condition against this game's names (for the screen and the guide). */
  condition(source: string, where: string): Expr;
  /** Whether a compiled condition holds for a run. */
  holds(condition: Expr, run: DataRun): boolean;
}

/** Compiles a definition, checking every name in every condition. */
export function compileGame(def: GameDefinition): DataGame {
  const items = def.items ?? [];
  const upgrades = def.upgrades ?? [];
  const market = def.mechanics?.market;
  const supply = def.mechanics?.supply;
  const carriedDefs = def.carried ?? {};
  const resourceIds = Object.keys(def.resources);
  const lifetimes = Object.entries(def.resources).filter(([, r]) => r.lifetime).map(([id, r]) => ({ id, of: r.lifetime! }));

  const names = new Set<string>(['elapsed', 'act', ...resourceIds, ...Object.keys(carriedDefs)]);
  for (const item of items) {
    names.add(item.id);
    names.add(`${item.id}.rate`);
  }
  if (market) ['market.price', 'market.demand', 'demand'].forEach((n) => names.add(n));
  if (supply) ['supply.price', 'supply.lot'].forEach((n) => names.add(n));
  const functions = ['has', 'owned'];
  const condition = (source: string, where: string): Expr => {
    try {
      return compile(source, { names, functions });
    } catch (e) {
      if (e instanceof ExprError) throw new DefinitionError(`${where}: ${e.message}`);
      throw e;
    }
  };
  const always: Expr = { source: 'true', names: [], evaluate: () => true };
  const itemShown = items.map((item, i) => (item.shown ? condition(item.shown, `items[${i}].shown`) : always));
  const upgradeShown = upgrades.map((u, i) => (u.shown ? condition(u.shown, `upgrades[${i}].shown`) : always));
  for (const [id, r] of Object.entries(def.resources)) if (r.lifetime && !(r.lifetime in def.resources)) throw new DefinitionError(`resources.${id}.lifetime: unknown resource "${r.lifetime}"`);

  /** Every effect, with how many units of it apply now. */
  const effectsOn = (run: DataRun, target: string): { effect: EffectDef; units: number }[] => [
    ...items.flatMap((item) => (item.effects ?? []).filter((e) => e.target === target).map((effect) => ({ effect, units: run.owned[item.id] ?? 0 }))),
    ...upgrades.flatMap((u) => (u.effects ?? []).filter((e) => e.target === target).map((effect) => ({ effect, units: run.upgrades.includes(u.id) ? 1 : 0 }))),
    ...Object.entries(carriedDefs).flatMap(([id, c]) => (c.effects ?? []).filter((e) => e.target === target).map((effect) => ({ effect, units: run.carried[id] ?? 0 }))),
  ];
  const base = (target: string): number => {
    const item = items.find((i) => `${i.id}.rate` === target);
    if (item) return item.rate ?? 1;
    if (target === 'supply.lot') return supply?.lot ?? 0;
    return 1;
  };
  const stat = (run: DataRun, target: string): number => {
    let times = 1;
    let plus = 1;
    for (const { effect, units } of effectsOn(run, target)) {
      if (effect.times !== undefined) times *= effect.times ** units;
      if (effect.plus !== undefined) plus += effect.plus * units;
    }
    return base(target) * times * plus;
  };
  const demand = (run: DataRun): number => (market ? market.demand.base * stat(run, 'market.demand') * (market.price.start / run.price) ** market.demand.elasticity : 0);

  const scope = (run: DataRun): ExprScope => ({
    value: (name) => {
      if (name === 'elapsed') return run.elapsed;
      if (name === 'act') return run.act;
      if (name in run.amounts) return run.amounts[name]!;
      if (name in carriedDefs) return run.carried[name] ?? 0;
      if (name === 'market.price') return run.price;
      if (name === 'demand') return demand(run);
      if (name === 'supply.price') return run.supplyPrice;
      if (items.some((i) => i.id === name)) return run.owned[name] ?? 0;
      return stat(run, name);
    },
    call: (fn, args) => (fn === 'has' ? run.upgrades.includes(String(args[0])) : (run.owned[String(args[0])] ?? 0)),
  });
  const holds = (e: Expr, run: DataRun) => Boolean(e.evaluate(scope(run)));

  /** Adds to resources, counting lifetime totals of whatever grows. */
  const add = (amounts: Record<string, number>, change: Record<string, number>): Record<string, number> => {
    const next = { ...amounts };
    for (const [id, n] of Object.entries(change)) {
      next[id] = (next[id] ?? 0) + n;
      if (n > 0) for (const l of lifetimes) if (l.of === id) next[l.id] = (next[l.id] ?? 0) + n;
    }
    return next;
  };
  /** How many times a conversion can run on what is on hand (up to `times`). */
  const affordable = (amounts: Record<string, number>, converts: Record<string, number>, times: number) =>
    Object.entries(converts).reduce((n, [id, k]) => (k < 0 ? Math.min(n, (amounts[id] ?? 0) / -k) : n), times);
  const scaled = (converts: Record<string, number>, n: number) => Object.fromEntries(Object.entries(converts).map(([id, k]) => [id, k * n]));

  const price = (run: DataRun, id: string): number => {
    const item = items.find((i) => i.id === id);
    return item ? item.cost.base * item.cost.growth ** (run.owned[id] ?? 0) : Infinity;
  };

  const buySupply = (run: DataRun): DataRun => {
    if (!supply) return run;
    const funds = run.amounts[supply.with] ?? 0;
    const lot = stat(run, 'supply.lot');
    if (funds >= run.supplyPrice) return { ...run, amounts: add(run.amounts, { [supply.with]: -run.supplyPrice, [supply.buys]: lot }) };
    // Never stuck: with nothing on hand and nothing to sell, the money buys what it covers.
    const nothingToSell = !market || (run.amounts[market.sells] ?? 0) < 1;
    if (!supply.neverStuck || (run.amounts[supply.buys] ?? 0) >= 1 || !nothingToSell || funds <= 0) return run;
    return { ...run, amounts: add(run.amounts, { [supply.with]: -funds, [supply.buys]: Math.floor((funds / run.supplyPrice) * lot) }) };
  };
  const automated = (run: DataRun, mechanic: string) => upgrades.some((u) => u.automate === mechanic && run.upgrades.includes(u.id));

  const beats: Beat<DataRun, string>[] = (def.story?.beats ?? []).map((b, i) => {
    const when = condition(b.when, `story.beats[${i}].when`);
    return {
      id: b.id,
      act: b.act,
      urgent: b.urgent,
      when: (run) => holds(when, run),
      entries: [{ kind: b.kind ?? 'note', text: b.text }],
      effects: [...(b.act ? [{ kind: 'setAct' as const, act: b.act }] : []), ...(b.ends ? [{ kind: 'setFlag' as const, flag: 'terminus' }] : [])],
    };
  });

  const create = (seed: number, carried: Record<string, number> = {}): DataRun => {
    const run: DataRun = {
      ...newStory<string>(),
      seed,
      rng: seed,
      amounts: Object.fromEntries(resourceIds.map((id) => [id, def.resources[id]!.start ?? 0])),
      owned: {},
      upgrades: [],
      carried,
      price: market?.price.start ?? 0,
      supplyPrice: supply?.price.start ?? 0,
      supplyDrift: supply?.price.every ?? 0,
    };
    return def.story?.opening ? appendLog<string, DataRun>(run, 'note', def.story.opening) : run;
  };

  const tick = (run: DataRun, dt: number): DataRun => {
    let amounts = run.amounts;
    // Producers first, as far as their inputs go.
    for (const item of items as ItemDef[]) {
      if (!item.converts || !(run.owned[item.id] ?? 0)) continue;
      const n = affordable(amounts, item.converts, (run.owned[item.id] ?? 0) * stat(run, `${item.id}.rate`) * dt);
      if (n > 0) amounts = add(amounts, scaled(item.converts, n));
    }
    let next: DataRun = { ...run, amounts, elapsed: run.elapsed + dt };
    if (market) {
      const sold = Math.min(next.amounts[market.sells] ?? 0, demand(next) * dt);
      if (sold > 0) next = { ...next, amounts: add(next.amounts, { [market.sells]: -sold, [market.for]: sold * next.price }) };
    }
    if (supply) {
      if (automated(next, 'supply')) {
        // Keep a second's use on hand, as far as the money goes.
        const use = items.reduce((sum, i) => sum + Math.max(0, -(i.converts?.[supply.buys] ?? 0)) * (next.owned[i.id] ?? 0) * stat(next, `${i.id}.rate`), 0);
        for (let i = 0; i < MAX_AUTO_LOTS && (next.amounts[supply.buys] ?? 0) < Math.max(1, use); i++) {
          const bought = buySupply(next);
          if (bought === next) break;
          next = bought;
        }
      }
      let { supplyPrice, supplyDrift, rng } = next;
      supplyDrift -= dt;
      while (supplyDrift <= 0) {
        const [step, r] = randomInt(rng, -supply.price.drift, supply.price.drift);
        rng = r;
        supplyPrice = Math.min(supply.price.max, Math.max(supply.price.min, supplyPrice + step));
        supplyDrift += supply.price.every;
      }
      next = { ...next, supplyPrice, supplyDrift, rng };
    }
    return runBeats<string, DataRun, DataRun>(next, beats, next, { minGap: def.story?.gap ?? DEFAULT_STORY_GAP });
  };

  const reduce = (run: DataRun, action: DataAction): DataRun => {
    switch (action.type) {
      case 'press': {
        if (affordable(run.amounts, def.press.converts, 1) < 1) return run;
        return { ...run, amounts: add(run.amounts, def.press.converts) };
      }
      case 'buy': {
        const i = items.findIndex((x) => x.id === action.id);
        const item = items[i];
        if (!item || !holds(itemShown[i]!, run)) return run;
        const cost = price(run, item.id);
        if ((run.amounts[item.cost.resource] ?? 0) < cost) return run;
        return { ...run, amounts: add(run.amounts, { [item.cost.resource]: -cost }), owned: { ...run.owned, [item.id]: (run.owned[item.id] ?? 0) + 1 } };
      }
      case 'upgrade': {
        const i = upgrades.findIndex((x) => x.id === action.id);
        const u = upgrades[i];
        if (!u || run.upgrades.includes(u.id) || !holds(upgradeShown[i]!, run) || (run.amounts[u.cost.resource] ?? 0) < u.cost.amount) return run;
        return { ...run, amounts: add(run.amounts, { [u.cost.resource]: -u.cost.amount }), upgrades: [...run.upgrades, u.id] };
      }
      case 'price':
        if (!market) return run;
        return { ...run, price: Math.max(market.price.min, Math.round((run.price + action.step * market.price.step) * 1e6) / 1e6) };
      case 'supply':
        return buySupply(run);
      case 'tick':
        return action.dt > 0 ? tick(run, action.dt) : run;
    }
  };

  return {
    definition: def,
    create,
    reduce,
    tick,
    stat,
    price,
    demand,
    availableUpgrades: (run) => upgrades.filter((u, i) => !run.upgrades.includes(u.id) && holds(upgradeShown[i]!, run)),
    itemShown: (run, id) => {
      const i = items.findIndex((x) => x.id === id);
      return i >= 0 && holds(itemShown[i]!, run);
    },
    complete(run, ending, seed) {
      const e = def.endings?.find((x) => x.id === ending);
      if (!e || !run.flags.includes('terminus')) return run;
      const carried = { ...run.carried };
      for (const [id, n] of Object.entries(e.grants ?? {})) carried[id] = (carried[id] ?? 0) + n;
      return create(seed, carried);
    },
    evaluate: (run, source) => condition(source, 'expression').evaluate(scope(run)),
    condition,
    holds,
  };
}
