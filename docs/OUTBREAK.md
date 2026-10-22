# The outbreak: a second first-tier horror for DEEP CONTRACT

**Status:** built, 2026-10-22 (all eight pieces; see docs/ROADMAP.md item 7). Requested by the user on 2026-10-22: "An additional horror could be zombies/pandemic. Some kind of novel disease taking over workers and turning them against the company."

It is a zombie and pandemic homage, with original names. It is a `HorrorDef` beside the organism. It runs in any scenario and knows the scenario only through `StorySignals`, the scenario's lexicon and `HorrorHooks` (CLAUDE.md requirement 6).

## Premise

A novel pathogen moves through the contract's workforce. The Combine's designation for it is **Strain KA-11**, and the crews call it **the Pallor**, after the grey skin of the late stage.

- **Act I:** nothing. The contract is upbeat corporate, the same as with any other horror.
- **Act II:** something is going around. Sick days rise, and a cough moves through the bunks. A memo from Wellness reminds staff to wash their hands. Every tell has a mundane explanation (a seasonal flu, recycled air, overwork), and **everyone who falls ill gets better**.
- **Act III, the discovery:** the illness is traced to {deepPlace}. The cultures are not a flu. HQ asks, faster than light-lag allows, for **samples**. The Combine's Bioproducts division will pay a great deal for a live strain. From here the sick stop getting better: they go quiet and pale, and they stop coming to shifts.
- **Act IV, turning:** the turned come back. They are the company's own workers, organised, and they work **against the company**: they sabotage equipment, take back held ground, and lock {refuge} from the inside. The crew start to turn, by name.
- **Act V, the terminus:** what to do with the samples.

The horror is the workforce itself. The organism's horror is something you brought aboard; the outbreak's horror is the people you put to work.

## The model (pure, under `src/mission/outbreak/`)

The horror keeps its own **workforce**: the contract staff around the named crew, held as shares of the whole, so the outbreak is the same size of problem in every scenario and needs no scenario state. Its phases follow the act the story has reached (a horror's tick sees the mission, not the signals).

| Field | Meaning |
|---|---|
| `exposed` | Share infected but not yet showing (incubating). Hidden unless screening is bought. |
| `sick` | Share showing symptoms: off shift. |
| `turned` | Share turned (act IV onward). |
| `recovered` | Share immune; only possible before the discovery, and later with treatment. |
| `quarantine` | The dial, 0–10 tenths of the workforce kept isolated. |
| `screening`, `wards` | Bought levels (see levers). |
| `samples`, `cultures` | Samples held for Bioproducts, and culture tanks producing them. |
| `turnedCrew` | Named crew who have turned. They count as lost on the crew panel, through the same crew-loss path the organism's incidents use. |

**Spread** is a small SIR-style model stepped with `dt`, using randomness only from `m.rng`:

- **Infection:** the healthy catch it in proportion to the infectious share (exposed plus sick). Quarantine cuts contact.
- **Incubation:** exposed become sick after a while.
- **Before the discovery,** the sick recover, and that is what makes it a flu.
- **After it,** the sick turn instead, unless they are on a ward bed.
- **The scenario feels it in two places only:**
  - `productionMultiplier`: output falls with the share off shift (sick, turned, quarantined) and rises with Bioproducts funding (samples, square-root diminishing returns, like specimens).
  - `pressure`: `1 + k × turned`. The turned retake held ground in security, salvage and so on.
- **Sabotage:** turned workers cause incidents at a rate proportional to `turned`, through `hooks.loseEquipment`. This is the same hook the organism's loose contacts use, so every scenario already supports it.

## The player's levers

These appear as the contract goes on, in a **SICK BAY** tab. It is named and styled as a routine wellness panel, so it gives nothing away in Act II.

1. **Act II: sick days.** The tab shows staff off sick and a **Wellness programme** (bought levels that shorten illness). Nothing about it is sinister.
2. **Act III: the quarantine dial.** More isolation slows the spread and costs output, and the flow readout calls out which way the dial is costing. It is the counterpart of the torch dial, the burn dial and the beach dial.
   - **Screening** reveals the exposed (shown as a separate figure) and makes quarantine target them, so each tenth of quarantine works better.
   - **Wards** hold the sick, who do not turn while in a bed.
3. **Act III: Bioproducts (the temptation).** Culture tanks grow samples, which pay a funding multiplier. Cultures also make the strain more infectious. It is the same bargain the organism's specimens offer: more money, more danger.
4. **Act IV: lockdown.** A one-off action that seals a section. It costs a lot of output for a short time and resets the turned's progress on held ground. The counterpart of the organism's vents.

**Automation:** the Infection Control Officer, a one-off hire in the SICK BAY after the discovery, takes the quarantine dial and holds it as tight as wards and screening justify, and opens it when nothing is going round. It is the same pattern as the other dial autopilots. (A hire rather than a Store upgrade, because Store upgrades belong to scenarios and a horror may not add to them.)

## Endings (Act V)

They use the same three keys as the organism, so prestige and `availableEndings` need no changes.

- **deliver: Ship the samples.** Bioproducts gets its strain. Seniority, as with the company ending. The crew who have turned are "retained for study".
- **scuttle: Burn the cultures.** Everything on the contract is sterilised: tanks, wards and the infected. Conscience.
- **broadcast:** the late-cycle third ending, with the same conditions. Publish the Combine's own Wellness memos alongside the strain's sequence.

## Which horror a contract gets

Today every contract except overland runs the organism. The outbreak adds a draw:

- **Unlock:** `OUTBREAK_UNLOCK_CONTRACTS = 6`, after salvage (4) and the hunter (5). Before that, every contract stays on the organism, so a new player's first horror is always the one the game was built around.
- **The draw:** once it is unlocked, each new contract (start, renewal or reassignment) draws its horror from the contract seed, organism or outbreak, 50/50. The same horror can come up at most twice in a row.
  - It is **not shown or chosen** on the assignment screen. Knowing in advance would spoil the slow-burn turn (requirement 5). Act II tells must fit either horror.
- **Overland stays quiet** (it has one ending and no horror).
- **Debug jumps:** `?debug=outbreak`, `ob-act2`, `ob-act3` and `ob-act4` (dev builds only).
- **Records:** each contract record now names its horror (save v9; older records are the organism, or quiet for overland).

This is a rule in `src/core/prestige.ts` (`horrorFor(profile, scenario, seed)`), not in any scenario.

## Decoupling

- **The outbreak knows a scenario only through:**
  - `signals.progress` and `signals.deepAccess`, which time the acts, as for the organism;
  - the lexicon: `{deepPlace}`, `{refuge}`, `{crewNoun}` and so on;
  - `hooks.loseEquipment`.
- **A scenario knows it only through** `horrorProductionMultiplier` and `horrorPressure`.
- **Sanctioned pairing (built):** `pairings.security`, the colony at Calder's Landing that went dark before the detachment arrived. The missing colonists are the first turned. This is the outbreak's counterpart of the organism's nursery pairing.
- `tests/mission/kinds.test.ts` already runs every horror against the stub scenario and checks lexicon coverage, so the outbreak joins those tests.

## UI, guide and telemetry

- **SICK BAY** tab with a `visible()` predicate from Act II and an `attention()` predicate when the turned are rising.
- **Status figures:** OFF SICK from Act II and TURNED from Act IV, beside the organism's CONTACTS in the status area. (The flow readout and monitor belong to the scenario, and a scenario may not know the horror, so the outbreak's figures sit with the horror's own.) The quarantine row shows what the dial costs in output.
- **Guide steps** (`src/data/guide.ts`): sick days; then the quarantine dial and wards once the discovery lands; then lockdown. The rules page gets an OUTBREAK section in Act III or later.
- **Telemetry:**
  - `contract_started` already carries `horror`.
  - New `crew_turned` event: crew (id), turned (count), minutes.
  - New `lockdown_used` event: lockdowns, minutes.
  - **Dashboard:** "Act timing by horror", which splits the existing act-reached tile by `horror`, so the outbreak's pacing can be compared with the organism's.

## Pacing

Same targets as every contract: Act II at 40–75 minutes, Act III at 2–3 hours, Act IV within 4 hours, terminus at 4–6 hours.

- `npm run simulate` gains an `outbreak` horror option.
- `tests/sim/pacing.test.ts` covers each scenario with the outbreak.
- The bot's policy: hold quarantine at the level wards and screening justify, never cultivate past what wards can hold, and use lockdown when the turned hold more than one section.

## Save

- A new `HorrorId`, `'outbreak'`, with its own fields on new missions only.
- Existing saves keep their horror, so no fields change on a saved mission. `GAME_VERSION` is bumped anyway, with a migration that does nothing, so a save from a newer build cannot be loaded by an older one mid-contract.

## Build order (each piece TDD, committed and pushed)

1. Spread model and fields, `OUTBREAK` registered, the stub-scenario and lexicon tests.
2. Story: Act II tells (each with a mundane explanation), Act III discovery, Act IV turning, archive files and endings.
3. Levers: quarantine, screening, wards, cultures and lockdown, plus the Infection Control Officer.
4. SICK BAY UI, monitor rows, flow callouts, guide steps and rules.
5. The horror rule (`horrorFor`), its unlock, and debug jumps.
6. The security pairing (Calder's Landing).
7. Pacing bot, `npm run simulate`, and pacing tests per scenario.
8. Telemetry events and the dashboard tile.
