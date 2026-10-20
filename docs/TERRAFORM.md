# Terraforming contracts, and scenarios × horrors

**Status: built** (2026-10-19). See *As built* at the end for where the implementation differs from this plan.

A second first-tier mission **scenario** alongside extraction. It was proposed after the first phone playtest (2026-10-19), where the user liked managing and balancing input against output ("reminds me of the paperclip game in a good way").

## Decisions (user, 2026-10-19)

- **Unlock:** it is meant to be an unlock, but for now it is **available from the start** so it can be tried. `TERRAFORM_UNLOCK_CONTRACTS = 0` in `src/core/prestige.ts`; raise it later.
- **Horror is not tied to a scenario.** The user likes the "nursery" idea, but wants to be able to swap horrors around later, so no horror may be hard-coupled to a mission scenario. See *Architecture* below.
- **Power allocation uses ±10% buttons**, not sliders.

## Two independent axes

| Axis | What it owns | Today |
|---|---|---|
| **Scenario** | Economy, buildings, upgrades, directives, Act I corporate content, the diegetic progress measure, flow-readout and monitor descriptors, vocabulary (lexicon) | `extraction`, `terraform` |
| **Horror** | Acts II–V story beats, horror mechanics and their state, restricted archive files, terminus endings, effect on production | `organism` (the void organism, Special Order 0-77) |

A contract is any `scenario × horror` pair (`MissionConfig.scenario`, `MissionConfig.horror`). Shared mission *core* (credits, crew, log, story engine, directive engine, flags, act, rng) belongs to neither.

### The contract between them (no imports either way)

- **Signals** (scenario → horror), computed by the composer each tick:
  - `progress`: a number on the **shared story scale**. Extraction uses shaft depth in metres, so 1,000 starts Act II and 3,200 the cavity. Other scenarios map their own progress onto the same scale and are tuned with their own pacing bot.
  - `deepAccess`: the scenario owns its deepest kind of equipment, which is what lets the horror's discovery beat fire.
- **Lexicon** (scenario → horror text): every scenario supplies the same named phrases (`{scout}`, `{deepWork}`, `{voidBreach}`, `{actTwoEntry}`, `{recoveryRig}`, `{deliverLabel}`, …). Horror beats and archive files are written with `{placeholders}`. A new horror can add keys, and a scenario must then supply them; a test checks every scenario covers every key the horrors use.
- **Hooks** (horror → scenario), passed as arguments, never imported:
  - `loseEquipment(m, roll)`, so incidents can destroy buildings;
  - the horror's `productionMultiplier(m)`, which core applies on top of `config.productionMultiplier`. Specimens funding the Combine is how this shows up today.
- **Pairings** (optional, explicit): a horror may ship extra beats keyed by scenario id, used only for that pair. The nursery reveal lives here (`organism × terraform`). If a pairing is missing, the horror still works, with generic text. A pairing may read that scenario's public queries; that coupling is deliberate and confined to the pairing file.
- **Decoupling tests:**
  - the organism horror runs on a minimal stub scenario;
  - both real scenarios run under a `quiet` horror that has no beats or mechanics;
  - mission state stays JSON;
  - two missions of different scenarios tick side by side without sharing state.

### Mission state shape

Mission state is flat, with discriminants: `MissionState = MissionCore & ScenarioFields & HorrorFields`.
- `ScenarioFields` is `{ scenario: 'extraction', ore, generators, … } | { scenario: 'terraform', reactors, processors, allocation, … }`.
- `HorrorFields` is `{ horror: 'organism', specimens, integrity, contacts, … } | { horror: 'quiet' }`.
- Scenario code is typed against `MissionCore & ExtractionFields` and similar. Horror code is typed against `MissionCore & OrganismFields`, so the type checker enforces that a horror can't read ore.
- Save **v3** adds `scenario: 'extraction'` and `horror: 'organism'` to existing saves.

### Layout

```
src/mission/            core: state (composer + core types), log, story engine, crew, directive engine,
                        tick (composer), registry, lexicon interpolation, modifiers
src/mission/extraction/ economy, upgrades, depth, scenario definition
src/mission/terraform/  economy, upgrades, spec revisions, colonists, scenario definition
src/mission/organism/   containment/infestation, horror definition
src/mission/quiet/      the no-op horror (tests, and later a "calm contract")
src/data/<axis>/        content tables for each scenario/horror; shared crew roster stays in src/data/crew.ts
src/ui/scenarios/       per-scenario UI: panels, flow + monitor descriptors, status stats, the manual action button
```

The crew roster is shared core (identities, dossiers, lines). **What each crew member boosts is defined by the scenario** (`crewBoosts`), because a pilot boosts mass drivers in one scenario and orbital mirrors in another. The medic's fatigue relief is a core crew trait.

## Premise (terraform scenario)

- WARDEN runs **Atmospheric Processing Station Ostrava-9** on **KA-T-88 "Merrow"**, a cold, airless rock. Kessler-Amari has sold colony berths, and 4,000 colonists are in transit in cryo.
- Time is compressed: corporate messages are dated in planetary years.
- **Nursery** (organism pairing): the habitability spec keeps being revised for mundane-sounding reasons. In the late revisions it drifts toward **304 K and 96% humidity, oxygen-poor**: the void's conditions. The Combine is building a nursery. The spec revisions themselves belong to the terraform scenario (corporate keeps moving the goalposts). Only the pairing beats point out what the late revisions match.

## Terraform economy (the balancing game)

- **Power:** reactors (5 tiers, cost ×1.15) produce MW.
- **Three processing lines:** ATMOSPHERE, HEAT and WATER, each with 3 processor tiers. Every unit of throughput draws 1 MW.
- **Allocation:**
  - The player splits power between the lines with ±10% buttons; the shares sum to at most 100%.
  - A line's throughput is `min(processor capacity, allocated MW)`. Each line is therefore **power-limited** or **processor-limited**, and the UI says which.
- **Spec:** corporate target shares for the three lines. **Spec match** is the overlap between the current throughput mix and the spec (Σ min(share, target)), from 0 to 100%.
- **Income:** credits per second = total throughput × spec match × colonist multiplier. Imbalance costs money immediately, which is the Paperclips tension.
- **Terraforming progress:** cumulative balanced throughput. The shared story scale is `progress = SCALE · log10(1 + balanced)^EXP`, tuned by the pacing bot. It is shown diegetically as pressure (kPa), mean temperature (K) and hydrosphere (%).
- **Manual action:** `[ FIRE PROCESSOR SURGE ]` processes a burst that is perfectly on spec. **Auto-surge** upgrades are the counterpart of autocycle.
- **Auto-balance** (a key automation upgrade): WARDEN sets the allocation continuously to maximise income. The flavour text promises "within corporate spec".
- **Spec revisions:** at progress milestones, corporate memos change the target shares. The player rebalances, or auto-balance does it silently.
- **Colonist waves:** at progress milestones a wave thaws and income gains +25% for that wave.
- **Flow readout:** `POWER ▸ PROCESS ▸ INCOME`, with a spec-match meter. The limiting thing is highlighted: power, processors or balance.

## How it unlocks

The assignment is chosen when a contract starts:
- on a brand-new game;
- at contract renewal (the terminus);
- from **CFG → REQUEST REASSIGNMENT**, which abandons the current contract with no rewards.

The horror is not shown or chosen; it is a surprise. `organism` is the only option for now.

## Build order (each step test-first, commit at each green)

1. Discriminants and save v3, then the module split plus registries, signals, lexicon and hooks. This is a pure refactor plus decoupling tests; the existing behaviour and pacing must not change.
2. Terraform economy: power, allocation, lines, spec match, income, progress, surge, upgrades, auto-balance, spec revisions, colonists.
3. Terraform content: Act I, directives, lexicon, crew boosts, archive.
4. Terraform UI: flow/monitor descriptors, allocation controls, systems, stats, the surge button.
5. Assignment choice at new game, terminus and CFG. Debug jumps.
6. Terraform pacing bot and tuning, then the organism × terraform pairing (nursery).
7. iPhone e2e journey for terraform.

## As built (differences from the plan above)

- **Five processors per line**, at roughly 30× cost steps, not three or four. The bigger ~100× gaps stalled play (and the bot) between tiers.
- **Power is the brake**, as the refinery is for extraction:
  - reactors get 20% dearer per unit (processors 15%);
  - each reactor costs about the same per MW as a processor costs per unit/s;
  - reactor upgrades are ×1.5, ×1.5 and ×2.
- **Allocation:** `+` takes a 10% step from idle power, otherwise from the largest other line, so a single tap always works on a phone. `−` returns the step to idle.
- **Auto-balance** (`WARDEN LOAD BALANCER`): runs every line on spec as far as the weakest line allows, then spills spare power into lines that have spare processors. Each spilled unit still earns that line's spec weight. The manual buttons disappear.
- **Planet readings** are cosmetic and shown under each line: pressure 0→101.3 kPa, temperature 61→304 K, hydrosphere 0→96%. The end values are the void's.
- **Spec revisions** happen at story progress 600, 1,500, 2,400 and 3,600. **Colonist waves** happen at 800, 1,600, 2,600, 3,800, 5,200 and 7,000, each adding +25% income.
- **Deep access** (needed for the horror's discovery) means owning a Deep Aquifer Tap, tier 4 of the water line.
- **Endings** belong to the horror (`src/data/organism/endings.ts`) and are worded through the lexicon: CERTIFY THE COLONY / STERILISE MERROW on terraform, DELIVER THE CARGO / SCUTTLE THE SHIP on extraction.
- **Assignment:** saves are v4. `GameState.assigning` is `false | 'start' | 'renewal' | 'reassign'`, and only `'reassign'` (from CFG) can be cancelled. Nothing ticks while it is set.
- **Pacing:** the terraform bot (`npm run simulate terraform`) hits Act II at 1h08m, Act III at 2h29m, Act IV at 2h52m and the terminus at 4h07m. Extraction is unchanged (52m / 2h25m / 3h04m / 4h19m). Both are enforced in `tests/sim/pacing.test.ts`.

## The colony (added 2026-10-19, after the user asked what colonists actually did)

Before this change, colonists were only a passive +25% income per wave. The user chose two changes: thawing as a player decision gated by a livable planet (option 1), and the horror reaching the colonists (option 3).

- **Climate** (`m.climate`: kPa, K, %) drifts toward a target with a time constant of about 2 minutes.
  - The target is `dead world + (human ideal − dead world) × development × (line share ÷ human share)`, where development is `√(progress / 2500)`, capped at 1.
  - With nothing running, the mix counts as human.
  - The human ideal is 101.3 kPa, 288 K and 60% water.
- **Habitability** is the worst reading's closeness to that ideal (0–1).
- **Waves** are certified *ready* at progress milestones. Thawing is the player's action: `THAW WAVE n`, enabled only at that wave's habitability bar (45% → 75%). WARDEN never thaws anyone.
- **Colonists** add +25% income per thawed wave, scaled by productivity (zero at 30% habitability, full at 60%). Below 40% they die, at a rate proportional to the shortfall, and the ledger reports mortality "within corporate specification".
- **The tension:**
  - The late spec revisions demand heat and water shares no human can live with, so following spec for income starves the colony.
  - WARDEN's load balancer follows spec, and the player can **take control from WARDEN** and give it back.
  - In a bot run that follows spec, the colony grows through two waves, then habitability collapses to about 25% and roughly 700 die.
- **Horror (organism pairing, narrative only):** the dead leave no bodies, figures stand in the warm shallows matching the count, and the census finds more life signs than colonists.
- **Terminus:** a scenario may name what is at stake (`ScenarioDef.stakes`). Terraform's version reads "THE SURFACE: N COLONISTS ALIVE. M DEAD SINCE THAW. THEY CHOSE NONE OF THIS; YOU WOKE THEM."
- **Saves:** existing terraform saves get a dead-world climate and no colonists. New contracts get them from `createMission`; older saves get them from the v5 migration in `src/core/save.ts`.
