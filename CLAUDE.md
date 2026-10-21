# DEEP CONTRACT, CHARTER OF THE ELDERDARK and LATE FEES — working notes for Claude

Three games in one repo, sharing an engine (`src/shared/`). Vite + TypeScript, no UI framework. DEEP CONTRACT is an intentional homage to the *Alien* films (names stay our own). The root page (`index.html`, `src/picker/`) is a game picker that only links to the games and imports nothing but `src/shared/`.
- **DEEP CONTRACT** (`/contract/`, `contract/index.html`, `src/main.ts`): retro-futurist idle clicker (Alien-flavoured, original IP) with a slow-burn horror turn.
- **CHARTER OF THE ELDERDARK** (`/forest/`, `src/forest-main.ts`): dark-fantasy company management in a corrupting forest (Symbaroum-flavoured, original IP). Design and status are in `docs/forest/DESIGN.md`. Code lives in `src/forest/` (pure simulation, same rules as missions), `src/forest-data/` and `src/forest-ui/` (ledger UI, `ledger.css`). It has its own save key (`elderdark.save`).
- **LATE FEES** (`/late-fees/`, `src/late-fees-main.ts`): modern-day slasher homages on a video store shelf (VHS look). Venues × killers, the counterpart of scenario × horror: `src/late-fees/` (pure simulation; venues `camp/`, `clinic/` and `insurer/`, killers `drowned/`, `burned/` and `design/`, the shared film arc in `story.ts`, sequels in `sequels.ts`), `src/late-fees-data/`, `src/late-fees-ui/` (`vhs.css`). Its save key is `latefees.save`. Design and status are in `docs/late-fees/DESIGN.md`.
- **Boundaries** (`tests/architecture.test.ts`): `src/shared/` imports nothing from either game, no game imports another (LATE FEES included), and the picker imports only shared code.
- **One service worker** at the site root serves every page; each page registers it, and each game ships its own manifest from `public/contract/`, `public/forest/` or `public/late-fees/` so it installs as its own app.

Read before changing things:
- `docs/DESIGN.md`: premise, economy, the five acts and their pacing targets, prestige, UI/art direction.
- `docs/BOARDROOM.md`: the planned second-tier layer and the architecture rules it imposes **now**.
- `docs/TERRAFORM.md`: the terraforming scenario and the **scenario × horror** architecture (built).
- `docs/ROADMAP.md`: what's built, deliberate deviations from the original plan, and the backlog.
- `docs/late-fees/DESIGN.md`: the third game, LATE FEES (modern-day slasher homages, VHS look, venues × killers, sequels). All three tapes, the six crossovers and the Killer's Cut (play as the killer, on the shared hunt engine `src/shared/hunt.ts`) are built.
- `docs/HORROR-TIER.md`: the planned play-as-the-horror tier in every game (a shared hunt engine: first-tier runs defended by their bots, the player as the horror). Approved; the engine, LATE FEES's Killer's Cut and Elderdark's wood are built, and DEEP CONTRACT's creature is next.
- `docs/MISSIONS.md`: the approved new missions (security detachment, haulage, salvage, the Keep), the shared held-ground engine, and the build order.
- `docs/TELEMETRY.md`: anonymous PostHog analytics (published site only, opt-out, events derived from state diffs). Add an event there when a new milestone matters for pacing.

## Non-negotiable requirements

1. **Strict TDD.** Every feature starts as failing tests whose names state the functional goal in plain language. Watch them fail, write the minimum code to pass, refactor while green. Commit at each green. No production code without a test driving it.
2. **Phone and desktop are equally first-class.** The primary real device is an iPhone (Safari). Mobile-first CSS; desktop three-column layout at ≥900px. Tap targets ≥44px, inputs ≥16px font, `100dvh`, safe-area insets, `touch-action: manipulation`, no hover-only affordances, drill uses `pointerdown`.
3. **No backend.** All state lives in the browser (`localStorage`); the build is a static, offline-capable PWA. Moving between devices = export/import save code. The only outbound traffic is optional, fire-and-forget telemetry; the game must never depend on it.
4. **Missions stay self-contained** (for the future Boardroom). Nothing under `src/mission/` may touch the DOM, globals, `Date.now()` or `Math.random()`. Time comes in as `dt`, randomness from the seeded RNG stored in mission state (`m.rng`), and wider-game knowledge only via `MissionContext`.
6. **Horrors are not coupled to scenarios** (user requirement). A horror (`src/mission/organism/`) knows a scenario only through `StorySignals`, the scenario's lexicon (`{placeholders}` in its text) and `HorrorHooks`. A scenario knows the horror only through `horrorProductionMultiplier` and `horrorPressure` (how hard it pushes back on held ground). The one sanctioned exception is a horror's `pairings[scenarioId]` file (e.g. `src/data/organism/nursery.ts`). `tests/mission/kinds.test.ts` enforces this (stub scenario, quiet horror, lexicon coverage).
5. **Horror must not be obvious until ~2 hours of progress.** Act I content is upbeat corporate; Act II tells must each have a mundane explanation. Pacing is enforced by `tests/sim/pacing.test.ts`. If you change economy numbers, run `npm run simulate` and keep those tests green.

## Commands

- `npm test`: vitest (unit, jsdom UI, data invariants, pacing). `npx tsc --noEmit` for types.
- `npm run test:e2e`: Playwright on desktop Chromium plus iPhone 13 emulation (Chromium by default; `E2E_WEBKIT=1` for real WebKit once `sudo npx playwright install-deps webkit` has been run).
- `npm run simulate [overland|extraction|terraform|security|haulage]`: bot playthrough timings per act, for every scenario by default.
- `npm run dev -- --host`: test on a phone over the LAN. Debug jumps: `/contract/?debug=act2|act3|act4|terminus|terraform|tf-act2|security|sec-act2|haulage|haul-act2|overland` (`src/core/debug.ts`). Debug jumps only work in dev builds.
- If the dev server suddenly serves unstyled pages after a CSS edit, its watcher caught the file mid-write: `touch src/styles/*.css`. Prefer the Edit tool over scripts that truncate and rewrite CSS.
- `npm run simulate:late [camp|clinic|insurer]`: the same for LATE FEES. `npm run simulate:forest [keep] [hours]` for Elderdark (forest by default). Elderdark debug jumps: `/forest/?debug=keep|keep-deep` (`src/forest/debug.ts`).
- `npm run build`: typecheck plus static build (all four pages) with service worker. `npm run icons` regenerates PWA icons from sprites.

## Code map and conventions

- `src/mission/`: pure, immutable `(state, …) => state` functions.
  - Core, shared by every contract: `state.ts` (`MissionCore`, discriminated `MissionState`, `composeMission`/`createMission`), crew, the directive engine (goals are named metrics the scenario answers), the story engine, log, lexicon, `kinds.ts` (`ScenarioDef`/`HorrorDef`), `registry.ts`, `tick.ts` (`tickWith` composes scenario → crew → horror → directives → story).
  - Scenarios: `extraction/` (ore, generators, refinery, depth), `terraform/` (reactors, three processing lines, ±10% power allocation, spec match, colonist waves) `security/` (troopers, ammunition fabricators, assault/line split, sentry guns, colony sectors on the shared held-ground engine `src/shared/ground.ts`) and `haulage/` (engines, tow cars, the burn dial, fuel at stations, delivery windows, freight strain, an autopilot). Haulage runs two hauls from profiles (`haulage/profiles.ts`): the long haul in space, and `overland`, the short first contract on the road to the space elevator (quiet horror, one ending).
  - Horrors: `organism/` (specimens, containment, infestation) `quiet/` (none; proves the decoupling) and `creature/` (driven by the player in the Special Order 0-77 hunt, `src/core/creature.ts`).
  - Typing: scenario code takes `ExtractionMission`/`TerraformMission`, horror code `OrganismMission`; state transitions are generic `<M extends …>(m: M): M`. Tests read fields off a broad `MissionState` with `tests/helpers.ts` (`ext`, `tf`).
- `src/core/`: `GameState = { version, savedAt, profile, mission, boardroom? }`, the store/reducer, offline catch-up (`advance`/`catchUp`, 8h cap), saves (versioned migrations in `save.ts`; **bump `GAME_VERSION` and add a migration for any saved-shape change**), prestige, debug scenarios.
- `src/data/`: content tables only, grouped by axis: `extraction/`, `terraform/`, `organism/` (beats, archive, endings, nursery pairing), plus shared `crew.ts`, `core-story.ts` and `sprites.ts`. Content gets **invariant tests** (unique ids, monotonic costs, every beat reachable, sprite dimensions/palette), not per-item tests.
- `src/ui/`: hand-rolled DOM via `h()`/`setText()` in `dom.ts`; panels are `{ el, render(state) }` registered in `app.ts` with a `visible()` predicate (tabs appear as features unlock) and an optional `attention()` (tab marker). Accessible names and roles are the test hooks (`getByRole`, `aria-label`).
  - Each scenario supplies a `ScenarioUi` (`src/ui/scenarios/`): flow-readout spec, monitor rows, stats, the big action button, systems and upgrades panels, and optional controls (terraform's allocation). The shell mounts only the running scenario's elements into slots.
  - `alerts.ts` is the top strip (active directive progress, tired crew); `assignment.ts` is the contract choice (new game, renewal, CFG reassignment).
- The **production flow readout** (`src/ui/flow.ts`) is the game's headline: whichever stage is limiting gets highlighted, and any change in rate gets a call-out. The **operations monitor** (`src/ui/monitor.ts`) shows automation working. Keep new economy features visible there instead of only in panels.
- Sprites are palette-indexed strings (`. a b c d e`) mapped to CSS variables at draw time, so act themes re-tint them. `corruptFrame` glitches them deterministically.
- Story beats: `{ id, act?, when({m, ctx, signals}), entries, effects?, urgent? }`. Entry text may use lexicon `{placeholders}`; horror-specific effects are `{ kind: 'action', action }` (handed to the horror). The engine itself is `src/shared/story.ts`. At most one per tick, spaced by `STORY_MIN_GAP` unless urgent. Repeat-contract beats use the `cycle-` id prefix.
- Match surrounding style: small comments only where intent isn't obvious, short constants at the top of modules, no new dependencies without need.
