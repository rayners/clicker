import { describe, it, expect } from 'vitest';
import {
  autoclipperCost,
  buyAutoclipper,
  buyMarketing,
  buyUpgrade,
  buyWire,
  createWorks,
  demand,
  makeClip,
  marketingCost,
  shiftPrice,
  tickWorks,
  type Works,
} from '../../src/clips/works';
import { UPGRADES } from '../../src/clips/content';

const works = (patch: Partial<Works> = {}): Works => ({ ...createWorks(1), ...patch });

describe('the clip works', () => {
  it('opens with a spool of wire, a little money, and clips at five cents', () => {
    const w = createWorks(1);
    expect(w.wire).toBe(1000);
    expect(w.funds).toBe(0);
    expect(w.price).toBeCloseTo(0.05);
    expect(w.act).toBe(1);
  });

  it('makes a clip by hand from an inch of wire, and cannot without wire', () => {
    const w = makeClip(works());
    expect(w.unsold).toBe(1);
    expect(w.made).toBe(1);
    expect(w.wire).toBe(999);
    expect(makeClip(works({ wire: 0 }))).toEqual(works({ wire: 0 }));
  });

  it('sells clips over time at the going price, faster when they are cheaper', () => {
    const cheap = tickWorks(works({ unsold: 100, price: 0.03 }), 10);
    const dear = tickWorks(works({ unsold: 100, price: 0.1 }), 10);
    expect(cheap.funds).toBeGreaterThan(0);
    expect(100 - cheap.unsold).toBeGreaterThan(100 - dear.unsold);
    expect(demand(works({ price: 0.03 }))).toBeGreaterThan(demand(works({ price: 0.1 })));
  });

  it('never sells clips it has not made', () => {
    const w = tickWorks(works({ unsold: 2, price: 0.01 }), 60);
    expect(w.unsold).toBe(0);
    expect(w.funds).toBeCloseTo(0.02);
  });

  it('moves the price a cent a tap, never below a cent', () => {
    expect(shiftPrice(works(), 1).price).toBeCloseTo(0.06);
    expect(shiftPrice(works({ price: 0.01 }), -1).price).toBeCloseTo(0.01);
  });

  it('buys a spool of wire at the going wire price', () => {
    const w = buyWire(works({ funds: 100, wire: 0 }));
    expect(w.wire).toBe(1000);
    expect(w.funds).toBeCloseTo(100 - works().wireCost);
    expect(buyWire(works({ funds: 1 }))).toEqual(works({ funds: 1 }));
  });

  it('lets the wire price drift, deterministically from the seed', () => {
    const a = tickWorks(works(), 120);
    const b = tickWorks(works(), 120);
    expect(a.wireCost).toBe(b.wireCost);
    expect(a.wireCost).not.toBe(works().wireCost);
  });

  it('buys autoclippers that make a clip a second each while there is wire, each dearer than the last', () => {
    const w = buyAutoclipper(works({ funds: 100 }));
    expect(w.autoclippers).toBe(1);
    expect(autoclipperCost(w)).toBeGreaterThan(autoclipperCost(works()));
    const later = tickWorks({ ...w, price: 10 }, 10);
    expect(later.made).toBe(10);
    expect(tickWorks(works({ autoclippers: 5, wire: 3, price: 10 }), 10).made).toBe(3);
  });

  it('raises demand with marketing, each level dearer', () => {
    const w = buyMarketing(works({ funds: 1000 }));
    expect(w.marketing).toBe(1);
    expect(demand(w)).toBeGreaterThan(demand(works()));
    expect(marketingCost(w)).toBeGreaterThan(marketingCost(works()));
  });

  it('starts a works with more customers for the good will earned by earlier ones', () => {
    expect(demand(createWorks(1, 2))).toBeCloseTo(demand(createWorks(1)) * 1.5);
  });

  it('buys an upgrade once, when it can afford it', () => {
    const u = UPGRADES[0]!;
    const w = buyUpgrade(works({ funds: u.cost }), u.id);
    expect(w.upgrades).toEqual([u.id]);
    expect(buyUpgrade(w, u.id)).toBe(w);
    expect(buyUpgrade(works(), u.id)).toEqual(works());
  });

  it('keeps buying wire on its own once the wire buyer is installed and the spool runs out', () => {
    const w = tickWorks(works({ wire: 0, funds: 100, upgrades: ['wire-buyer'] }), 1);
    expect(w.wire).toBeGreaterThan(0);
  });

  it('tells its story as it grows: a new act at two thousand clips', () => {
    let w = works({ made: 2_000 });
    for (let i = 0; i < 120; i++) w = tickWorks(w, 1);
    expect(w.act).toBe(2);
    expect(w.log.length).toBeGreaterThan(createWorks(1).log.length);
  });
});
