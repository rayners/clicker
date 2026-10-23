/**
 * The game clock: live frames, and time away (on load, or a frame long after the last one) run in steps and capped.
 * @module
 */

/** Time away beyond this is not simulated: an idle game rewards coming back, not leaving forever. */
export const OFFLINE_CAP_SECONDS = 8 * 3600;
/** A frame longer than this is time away (the phone slept, the tab was hidden), not a live frame. */
export const LIVE_MAX_DT = 2;

/** How a game's time passes. */
export interface ClockSpec<G> {
  /** Advance the game by `dt` seconds. */
  tick(game: G, dt: number): G;
  /** The longest single tick, in seconds; may depend on the game (coarser while several runs go at once). */
  step: number | ((game: G) => number);
  /** After time away: add a note of what happened ("while you were away …"). */
  noteAway?(before: G, after: G, seconds: number): G;
  /** Time does not pass at all (e.g. waiting for the player to choose a contract). */
  paused?(game: G): boolean;
}

/** A game's clock: `advance` for every frame of the live loop, `catchUp` once on load. */
export function createClock<G extends { savedAt: number }>(spec: ClockSpec<G>): { advance(game: G, dt: number): G; catchUp(game: G, now: number): G } {
  const run = (game: G, seconds: number): G => {
    const step = typeof spec.step === 'number' ? spec.step : spec.step(game);
    let g = game;
    for (let left = seconds; left > 0; left -= step) g = spec.tick(g, Math.min(step, left));
    return g;
  };
  // A clock set back (or corrected by the network) gives a negative or NaN gap: time does not run in reverse.
  const advance = (game: G, dt: number): G => {
    if (!(dt > 0) || spec.paused?.(game)) return game;
    if (dt <= LIVE_MAX_DT) return run(game, dt);
    const seconds = Math.min(dt, OFFLINE_CAP_SECONDS);
    const after = run(game, seconds);
    return spec.noteAway ? spec.noteAway(game, after, seconds) : after;
  };
  return {
    advance,
    catchUp(game, now) {
      const gap = (now - game.savedAt) / 1000;
      return gap > 0 ? { ...advance(game, gap), savedAt: now } : game;
    },
  };
}
