# DEEP CONTRACT — working notes for Claude

Retro-futurist idle clicker (Alien-flavoured, original IP) with a slow-burn horror turn. Vite + TypeScript, no UI framework.

Read before changing things:
- `docs/DESIGN.md`: premise, economy, the five acts and their pacing targets, prestige, UI/art direction.
- `docs/BOARDROOM.md`: the planned second-tier layer and the architecture rules it imposes **now**.
- `docs/ROADMAP.md`: what's built, deliberate deviations from the original plan, and the backlog.

## Non-negotiable requirements

1. **Strict TDD.** Every feature starts as failing tests whose names state the functional goal in plain language. Watch them fail, write the minimum code to pass, refactor while green. Commit at each green. No production code without a test driving it.
2. **Phone and desktop are equally first-class.** The primary real device is an iPhone (Safari). Mobile-first CSS; desktop three-column layout at ≥900px. Tap targets ≥44px, inputs ≥16px font, `100dvh`, safe-area insets, `touch-action: manipulation`, no hover-only affordances, drill uses `pointerdown`.
3. **No backend.** All state lives in the browser (`localStorage`); the build is a static, offline-capable PWA. Moving between devices = export/import save code.
4. **Missions stay self-contained** (for the future Boardroom). Nothing under `src/mission/` may touch the DOM, globals, `Date.now()` or `Math.random()`. Time comes in as `dt`, randomness from the seeded RNG stored in mission state (`m.rng`), and wider-game knowledge only via `MissionContext`.
5. **Horror must not be obvious until ~2 hours of progress.** Act I content is upbeat corporate; Act II tells must each have a mundane explanation. Pacing is enforced by `tests/sim/pacing.test.ts`. If you change economy numbers, run `npm run simulate` and keep those tests green.

## Commands

- `npm test`: vitest (unit, jsdom UI, data invariants, pacing). `npx tsc --noEmit` for types.
- `npm run test:e2e`: Playwright on desktop Chromium plus iPhone 13 emulation (Chromium by default; `E2E_WEBKIT=1` for real WebKit once `sudo npx playwright install-deps webkit` has been run).
- `npm run simulate`: bot playthrough timings per act.
- `npm run dev -- --host`: test on a phone over the LAN. Debug jumps: `?debug=act2|act3|act4|terminus` (`src/core/debug.ts`).
- `npm run build`: typecheck plus static build with service worker. `npm run icons` regenerates PWA icons from sprites.

## Code map and conventions

- `src/mission/`: pure, immutable `(state, …) => state` functions: economy, upgrades, crew, directives, containment, story engine, log, depth/progress. `tickMission` composes them.
- `src/core/`: `GameState = { version, savedAt, profile, mission, boardroom? }`, the store/reducer, offline catch-up (`advance`/`catchUp`, 8h cap), saves (versioned migrations in `save.ts`; **bump `GAME_VERSION` and add a migration for any saved-shape change**), prestige, debug scenarios.
- `src/data/`: content tables only (generators, upgrades, crew, directives, story beats, archive files, sprites). Content gets **invariant tests** (unique ids, monotonic costs, every beat reachable, sprite dimensions/palette), not per-item tests.
- `src/ui/`: hand-rolled DOM via `h()`/`setText()` in `dom.ts`; panels are `{ el, render(state) }` registered in `app.ts` with a `visible()` predicate (tabs appear as features unlock). Accessible names and roles are the test hooks (`getByRole`, `aria-label`).
- Sprites are palette-indexed strings (`. a b c d e`) mapped to CSS variables at draw time, so act themes re-tint them. `corruptFrame` glitches them deterministically.
- Story beats: `{ id, act?, when({m, ctx}), entries, effects?, urgent? }`. At most one per tick, spaced by `STORY_MIN_GAP` unless urgent. Repeat-contract beats use the `cycle-` id prefix.
- Match surrounding style: small comments only where intent isn't obvious, short constants at the top of modules, no new dependencies without need.
