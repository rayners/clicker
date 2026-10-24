/**
 * The shape of a game definition: the JSON a data game is written in. Every condition and formula is a string the
 * engine compiles (see `data/expr`).
 * @module
 */

/** Something the game counts: wire, clips, funds. */
export interface ResourceDef {
  label: string;
  unit?: string;
  /** How it reads on screen: `count` (default) or `money`. */
  format?: 'count' | 'money';
  start?: number;
  /** A lifetime counter of another resource: everything ever added to it. */
  lifetime?: string;
}

/** What a change to a stat does: multiply it by `times` for each unit, or add `plus` per unit to a factor of one. */
export interface EffectDef {
  /** The stat it changes: `<item>.rate`, `market.demand`, `supply.lot`. */
  target: string;
  times?: number;
  plus?: number;
}

/** A purchase that can be made again and again, each dearer than the last: an autoclipper, a level of marketing. */
export interface ItemDef {
  id: string;
  label: string;
  text: string;
  /** Its price in a resource, growing by `growth` with each one owned. */
  cost: { resource: string; base: number; growth: number };
  /** Per second for each one owned, at its rate: takes `from` and makes `to` (either may be left out). */
  converts?: Record<string, number>;
  rate?: number;
  /** Changes it makes to stats for each one owned. */
  effects?: EffectDef[];
  /** When it appears (an expression; default always). */
  shown?: string;
}

/** A one-off purchase. */
export interface UpgradeDef {
  id: string;
  label: string;
  text: string;
  cost: { resource: string; amount: number };
  shown?: string;
  effects?: EffectDef[];
  /** A mechanic it hands to an automation (e.g. `supply`). */
  automate?: string;
}

/** A story beat: fires once, when its condition holds. */
export interface BeatDef {
  id: string;
  when: string;
  text: string;
  kind?: string;
  /** Moves the story to this act. */
  act?: number;
  /** Fires without waiting for the gap after the previous beat. */
  urgent?: boolean;
  /** The run has reached its end: the endings are offered. */
  ends?: boolean;
}

/** How a run can end, and what it carries into the next. */
export interface EndingDef {
  id: string;
  title: string;
  text: string;
  /** Currencies kept across runs, and how much this ending grants. */
  grants?: Record<string, number>;
}

/** A walkthrough step. */
export interface GuideDef {
  id: string;
  title: string;
  text: string;
  /** What it points at: `press`, a stepper (`market.price`), or an item or upgrade id. */
  target?: string;
  show?: string;
  done: string;
}

/** Selling a resource at a price the player steps, to demand that answers price. */
export interface MarketDef {
  sells: string;
  for: string;
  price: { start: number; step: number; min: number };
  /** People per second at the starting price; `elasticity` says how sharply demand answers price. */
  demand: { base: number; elasticity: number };
}

/** Buying a resource in lots at a price that drifts. */
export interface SupplyDef {
  buys: string;
  with: string;
  lot: number;
  price: { start: number; drift: number; every: number; min: number; max: number };
  /** With nothing on hand, nothing to sell and a lot out of reach, sell what the money covers (no softlocks). */
  neverStuck?: boolean;
}

/** A whole game. */
export interface GameDefinition {
  id: string;
  version: number;
  title: string;
  description?: string;
  /** Currencies kept across runs (good will, legend), granted by endings. */
  carried?: Record<string, { label: string; effects?: EffectDef[] }>;
  resources: Record<string, ResourceDef>;
  /** The big button: what it says, and what one press converts. */
  press: { label: string; converts: Record<string, number> };
  items?: ItemDef[];
  upgrades?: UpgradeDef[];
  mechanics?: { market?: MarketDef; supply?: SupplyDef };
  story?: { gap?: number; opening?: string; beats: BeatDef[] };
  endings?: EndingDef[];
  guide?: GuideDef[];
}
