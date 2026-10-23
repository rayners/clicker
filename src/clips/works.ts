import { appendLog } from '../engine/log';
import { randomInt } from '../engine/rng';
import { runBeats, type StoryHost } from '../engine/story';
import { BEATS, UPGRADES, type NoteKind } from './content';

const START_WIRE = 1_000;
const SPOOL = 1_000;
const LONG_SPOOL = 1_500;
const START_WIRE_COST = 20;
const WIRE_COST_MIN = 12;
const WIRE_COST_MAX = 32;
/** Seconds between moves in the wire price. */
const WIRE_DRIFT_SECONDS = 10;
/** Clips a second people want at five cents, before marketing. */
const BASE_DEMAND = 2;
const BASE_PRICE = 0.05;
const MARKETING_GAIN = 1.1;
const AUTOCLIPPER_BASE = 5;
const AUTOCLIPPER_GROWTH = 1.1;
const MARKETING_BASE = 100;
const STORY_GAP = 30;
/** Extra demand per point of good will carried from earlier works. */
const GOODWILL_DEMAND = 0.25;

/** One clip works: the bench, the till, the wire, and the story so far. */
export interface Works extends StoryHost<NoteKind> {
  /** Lifetime clips made. */
  made: number;
  unsold: number;
  funds: number;
  /** Inches of wire on the bench. */
  wire: number;
  wireCost: number;
  /** Seconds until the wire price moves. */
  wireDrift: number;
  price: number;
  autoclippers: number;
  marketing: number;
  upgrades: string[];
  rng: number;
  /** Good will from earlier works, for more customers from the start. */
  goodwill: number;
}

export function createWorks(seed: number, goodwill = 0): Works {
  const w: Works = {
    made: 0,
    unsold: 0,
    funds: 0,
    wire: START_WIRE,
    wireCost: START_WIRE_COST,
    wireDrift: WIRE_DRIFT_SECONDS,
    price: BASE_PRICE,
    autoclippers: 0,
    marketing: 0,
    upgrades: [],
    rng: seed,
    goodwill,
    elapsed: 0,
    log: [],
    nextLogId: 0,
    act: 1,
    beats: {},
    lastBeatAt: null,
    flags: [],
  };
  return appendLog<NoteKind, Works>(w, 'note', 'CLIP WORKS. One bench, one spool of wire, and a hand-lettered sign: CLIPS 5¢.');
}

const has = (w: Works, id: string) => w.upgrades.includes(id);

/** Clips a second people will buy at the current price. */
export const demand = (w: Works): number => BASE_DEMAND * MARKETING_GAIN ** w.marketing * (has(w, 'jingle') ? 1.5 : 1) * (1 + GOODWILL_DEMAND * w.goodwill) * (BASE_PRICE / w.price);

/** Clips a second from each autoclipper. */
export const clipperRate = (w: Works): number => (has(w, 'sharper-dies') ? 1.5 : 1) * (has(w, 'megaclippers') ? 3 : 1);

export const autoclipperCost = (w: Works): number => AUTOCLIPPER_BASE * AUTOCLIPPER_GROWTH ** w.autoclippers;
export const marketingCost = (w: Works): number => MARKETING_BASE * 2 ** w.marketing;
const spool = (w: Works) => (has(w, 'longer-spools') ? LONG_SPOOL : SPOOL);

export function makeClip(w: Works): Works {
  if (w.wire < 1) return w;
  return { ...w, wire: w.wire - 1, unsold: w.unsold + 1, made: w.made + 1 };
}

export function shiftPrice(w: Works, step: 1 | -1): Works {
  return { ...w, price: Math.max(0.01, Math.round((w.price + step * 0.01) * 100) / 100) };
}

export function buyWire(w: Works): Works {
  if (w.funds < w.wireCost) return w;
  return { ...w, funds: w.funds - w.wireCost, wire: w.wire + spool(w) };
}

export function buyAutoclipper(w: Works): Works {
  const cost = autoclipperCost(w);
  return w.funds < cost ? w : { ...w, funds: w.funds - cost, autoclippers: w.autoclippers + 1 };
}

export function buyMarketing(w: Works): Works {
  const cost = marketingCost(w);
  return w.funds < cost ? w : { ...w, funds: w.funds - cost, marketing: w.marketing + 1 };
}

/** Upgrades on offer now: shown once enough clips are made, until bought. */
export const availableUpgrades = (w: Works) => UPGRADES.filter((u) => w.made >= u.after && !has(w, u.id));

export function buyUpgrade(w: Works, id: string): Works {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || has(w, id) || w.funds < u.cost) return w;
  return { ...w, funds: w.funds - u.cost, upgrades: [...w.upgrades, id] };
}

function driftWire(w: Works, dt: number): Works {
  let { wireCost, wireDrift, rng } = w;
  wireDrift -= dt;
  while (wireDrift <= 0) {
    const [step, next] = randomInt(rng, -2, 2);
    rng = next;
    wireCost = Math.min(WIRE_COST_MAX, Math.max(WIRE_COST_MIN, wireCost + step));
    wireDrift += WIRE_DRIFT_SECONDS;
  }
  return { ...w, wireCost, wireDrift, rng };
}

export function tickWorks(w: Works, dt: number): Works {
  const bent = Math.min(w.wire, w.autoclippers * clipperRate(w) * dt);
  let next: Works = { ...w, elapsed: w.elapsed + dt, wire: w.wire - bent, unsold: w.unsold + bent, made: w.made + bent };
  const sold = Math.min(next.unsold, demand(next) * dt);
  next = { ...next, unsold: next.unsold - sold, funds: next.funds + sold * next.price };
  if (next.wire < 1 && has(next, 'wire-buyer')) next = buyWire(next);
  next = driftWire(next, dt);
  return runBeats<NoteKind, Works, { w: Works }>(next, BEATS, { w: next }, { minGap: STORY_GAP });
}
