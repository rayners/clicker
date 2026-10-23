/**
 * Memoises a value derived from an immutable state, per state object: within one tick the same state is asked
 * many times, and each new state gets its own. Safe only because states are never mutated.
 */
export function memoByState<S extends object, R>(derive: (s: S) => R): (s: S) => R {
  const cache = new WeakMap<S, R>();
  return (s) => {
    if (cache.has(s)) return cache.get(s)!;
    const r = derive(s);
    cache.set(s, r);
    return r;
  };
}
