import { describe, it, expect } from 'vitest';
import { compile, ExprError, type ExprScope } from '../../src/engine/data/expr';

const names = new Set(['made', 'funds', 'wire', 'price', 'autoclipper.rate', 'autoclippers']);
const scope = (values: Record<string, number>, bought: string[] = []): ExprScope => ({
  value: (name) => values[name] ?? 0,
  call: (fn, args) => {
    if (fn === 'has') return bought.includes(String(args[0]));
    throw new Error(`no ${fn}`);
  },
});
const opts = { names, functions: ['has'] };

describe('expressions in a game definition', () => {
  it('compares and combines with plain words or symbols', () => {
    const e = compile("made >= 2000 and has('jingle')", opts);
    expect(e.evaluate(scope({ made: 2500 }, ['jingle']))).toBe(true);
    expect(e.evaluate(scope({ made: 2500 }))).toBe(false);
    expect(compile('made < 10 || not (funds > 5)', opts).evaluate(scope({ made: 20, funds: 1 }))).toBe(true);
  });

  it('does arithmetic with the usual precedence, and the common functions', () => {
    expect(compile('autoclippers * autoclipper.rate + 1', opts).evaluate(scope({ autoclippers: 3, 'autoclipper.rate': 1.5 }))).toBe(5.5);
    expect(compile('floor(funds / 3) + max(1, wire) - min(2, 7) % 3', opts).evaluate(scope({ funds: 10, wire: 4 }))).toBe(5);
    expect(compile('-price * 2', opts).evaluate(scope({ price: 0.05 }))).toBeCloseTo(-0.1);
  });

  it('says which names an expression reads, so the game knows what it depends on', () => {
    expect(compile('made >= 10 and funds > price', opts).names).toEqual(['made', 'funds', 'price']);
  });

  it('refuses a name the game does not define, saying where', () => {
    expect(() => compile('mde >= 10', opts)).toThrow(ExprError);
    expect(() => compile('mde >= 10', opts)).toThrow(/unknown name "mde" at column 1/);
  });

  it('refuses a function the game does not offer, and anything beyond plain expressions', () => {
    expect(() => compile("eval('1')", opts)).toThrow(/unknown function "eval"/);
    expect(() => compile('made[0]', opts)).toThrow(ExprError);
    expect(() => compile('this.made', opts)).toThrow(ExprError);
    expect(() => compile('[1, 2]', opts)).toThrow(ExprError);
    expect(() => compile('made = 3', opts)).toThrow(ExprError);
  });

  it('reports a syntax error with its column', () => {
    expect(() => compile('made >= ', opts)).toThrow(ExprError);
    expect(() => compile('(made', opts)).toThrow(/column/);
  });
});
