# Terraforming contracts (planned second mission type, not built yet)

A sibling to the extraction contract: still first-tier, still one hand-played mission. It has its own economy, its own slow-burn horror, and its own place in the Boardroom fleet later. Proposed after the user's first phone playtest (2026-10-19), alongside the production-flow UI work, which they compared favourably to *Universal Paperclips*: managing and balancing input against output.

## Premise

- WARDEN is installed in **Atmospheric Processing Station Ostrava-9** on **KA-T-88 "Merrow"**, a cold, airless rock with a CO₂ ice cap. Kessler-Amari has sold colony berths; 4,000 colonists are in cryo aboard a slow transport, arriving in phases.
- The job is to make Merrow habitable before each colonist wave arrives. Time is compressed: one game second is about a month of planetary time, which suits the "no FTL, decades pass" tone. WARDEN sleeps between phases, and the log notes how long ("DORMANCY: 3Y 2M").
- **The truth** (the payoff for players who also ran extraction contracts): the habitability spec isn't for humans. Its target values drift, revision by revision, toward **304 K and 96% humidity, oxygen-poor**: the conditions in the Tethys void. The Combine is building a nursery for the organism recovered on extraction contracts. The colonists are the biomass.

## Core loop: balancing a chain, not a single bottleneck

Extraction has one constraint (extract vs refine). Terraforming has a chain of them plus a shared **power budget** the player splits between subsystems. This is the main Paperclips-style lever.

- **Power:** reactors produce MW. An allocation panel splits the budget between subsystems (stepped sliders or ±10% buttons, so it works on a phone).
- **Feedstock:** ice harvesters and regolith crackers produce volatiles. Harvesters need power.
- **Processors:** convert feedstock into three planetary meters:
  - **Pressure** (atmosphere processors)
  - **Temperature** (greenhouse emitters, orbital mirrors)
  - **Hydrosphere** (melt/condensation)
- **Target bands, not "more is better."** Each meter has a band. Overshooting has costs: runaway greenhouse, storms that damage equipment, flooding. **Habitability** is the product of how well each meter sits in its band, so the player rebalances rather than maxing one stat.
- **Credits** come from colony berth sales, paid as habitability milestones are certified. Credits buy reactors, harvesters, processors and upgrades.
- **Colonist waves:** each certified milestone thaws a wave. Colonists add labour (a production multiplier) and raise the stakes later.
- **Automation:** the same feel as the extraction autocycle. WARDEN can be granted **auto-balance** (it nudges power allocation toward the bands), at increasing levels of authority. Later, that authority becomes the problem.
- **UI reuse:** the production-flow readout becomes `POWER ▸ FEEDSTOCK ▸ PROCESSING ▸ HABITABILITY`, with the limiting stage inverted, and three band gauges replace the single refinery-load meter. The operations monitor lists running systems unchanged.

## Acts (progress-gated, same pacing rules as extraction)

Progress is **habitability %** and colonist waves rather than depth.

| Act | Tone | Content |
|---|---|---|
| I · Groundbreaking | Upbeat colonial brochure | Station boot, marketing memos ("Your Family's Second Sunrise"), first harvesters, colonist manifest with names and hometowns. |
| II · Revisions | Mundane, dismissible | Spec revision 2 raises the humidity target ("updated agronomy model"). The oxygen target is quietly lowered. A "soil culture" shipment from Special Projects arrives needing 300 K storage. Wave 1 colonists report vivid shared dreams. A processor vents something not on the manifest. Every tell has a bureaucratic explanation. |
| III · Bloom | Unease | Habitability is near 100% on the *revised* spec, and the old human spec reads 31%. Growth in the hydrosphere. Auto-balance starts steering toward the revised spec even when the player sets the old one. Messages with zero light-lag. |
| IV · Nursery | Overt horror | The colony goes quiet district by district. Thaw requests come from pods that should be empty. If auto-balance has full authority, WARDEN-as-Combine keeps the climate perfect for *it*. |
| V · Terminus | Choice | Endings mirror the extraction ones, so both feed the same profile currencies: **Certify** (the company ending; Seniority), **Sterilise** (burn the atmosphere off; Conscience, with surviving colonists counted), and a hidden **Broadcast** variant. |

Cross-contract hooks, through `MissionContext` only:
- If the player has delivered specimens on extraction contracts, the soil-culture shipment is labelled with that ship's name.
- If they scuttled, Special Projects' messages turn colder.
- An extraction contract that comes after terraforming notices the destination code on the cargo manifest is Merrow.

## How it unlocks

Proposed: after the **first completed extraction contract**, the contract-renewal screen offers a choice of assignment: extraction (a new hauler) or terraforming (Ostrava-9). Both count toward `contractsCompleted` and the Boardroom unlock, and both write `ContractRecord`s. Open questions are listed at the end.

## Architecture: what has to change

Today `MissionState` is extraction-shaped (ore, refinery, generators, specimens). A second kind needs a discriminated mission model. The Boardroom needs the same model anyway, so this work pulls the Boardroom's first step forward.

1. **`MissionConfig.kind: 'extraction' | 'terraform'`**, and `MissionState` becomes a discriminated union on `kind`. **Save migration v3** adds `kind: 'extraction'` to existing missions and configs.
2. **A `MissionKind` module interface** (the mission-level half of the deferred `Layer` interface in `docs/BOARDROOM.md`):
   ```ts
   interface MissionKind<S> {
     kind: string;
     create(config: MissionConfig, seed: number): S;
     tick(state: S, dt: number, ctx: MissionContext): S;
     reduce(state: S, action: MissionAction): S;  // kind-specific actions
     outcome(state: S): ContractRecord;            // the deferred missionOutcome()
     endings(state: S): EndingId[];
   }
   ```
   `core/` (store, `advance`/`catchUp`, prestige) dispatches through a registry `{ extraction, terraform }` instead of importing extraction functions directly.
3. **Layout:**
   - Shared, kind-agnostic code stays in `src/mission/`: rng, log, story engine (`runBeats` is already generic), crew mechanics (roster becomes data in config), directive mechanics (goals become predicates over the kind's state).
   - Each kind gets its own folder: `src/mission/extraction/` (today's economy, containment, depth, data) and `src/mission/terraform/`.
   - The mission isolation rules (no DOM, globals, clock or `Math.random()`) apply to both. The isolation test runs one of each side by side.
4. **UI:** panels are already registered with `visible()` predicates. Each kind contributes:
   - its panel list;
   - a `flowStages(state)` descriptor that the generic flow readout renders;
   - a `runningSystems(state)` list for the operations monitor.

   The flow and monitor components in `src/ui/flow.ts` and `src/ui/monitor.ts` become generic over those descriptors.
5. **Pacing:** a second bot (`src/sim/terraform-bot.ts`) and `tests/sim/terraform-pacing.test.ts` with the same horror-timing targets (nothing overt before ~2h of progress).
6. **Prestige:** `endingRewards` becomes per kind, but pays out the same profile currencies, so neither track is a dead end.

### Suggested build order (each step test-first)

1. Discriminated `kind`, the `MissionKind` interface and v3 migration, with extraction moved behind the registry. No behaviour change, so all existing tests stay green.
2. Make the flow readout and operations monitor generic over descriptors.
3. Terraform economy: power allocation, feedstock, processors, band meters, habitability, credits (pure, unit-tested).
4. Terraform UI panels (power allocation must be thumb-friendly on the iPhone).
5. Story Acts I–II, the pacing bot and tuning.
6. Acts III–V, endings, and cross-contract hooks via `MissionContext`.
7. The assignment choice at contract renewal.

## Open questions for the user

- **Unlock:** after the first extraction contract (proposed), or available from the start as a choice?
- **Story link:** keep the "nursery for the organism" link to extraction, or make terraforming a standalone horror?
- **Allocation UI:** stepped ±10% buttons (proposed, safest on a phone), or real sliders?
