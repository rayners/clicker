# Roadmap and status

The original plan had 8 implementation steps, each done test-first.

| # | Step | Status |
|---|---|---|
| 1 | Scaffold: Vite + TS, vitest + jsdom, Playwright (desktop + iPhone), fonts, git | done |
| 2 | Core: format, seeded RNG, profile/mission split, economy, `tickMission`, saves + migrations + corruption fallback, offline catch-up, mission isolation test | done |
| 3 | UI shell: mobile-first layout, status, drill, log, tabs, lifecycle saves, first e2e journey | done |
| 4 | Sprites + CRT theme; generator/upgrade tables; crew; directives | done |
| 5 | Story engine + Acts I–II | done |
| 6 | Specimens/containment + Acts III–IV, theme shifts, sprite corruption, archive | done |
| 7 | Prestige: endings, persistent currencies, repeat-contract story | done |
| 8 | PWA, settings (sound, reduced motion, export/import, hard reset), pacing simulator + balance | done |

## After the first phone playtest (2026-10-19)

Feedback: not much feeling of progression; ore/s should be the primary stat but looked secondary; purchases seemed to do nothing until credits grew; no feeling of automation. The user liked the input/output balancing ("reminds me of the paperclip game in a good way").

| Change | Status |
|---|---|
| Production flow readout (extract ▸ refine ▸ income) with refinery-load meter and highlighted bottleneck | done |
| `+X ORE/S` call-outs when a purchase or crew change moves the rate | done |
| Operations monitor with per-system work-cycle bars | done |
| Autocycle upgrade line (WARDEN presses the drill); drill ticks show real yield | done |
| Terraforming as a second scenario (user: unlock later, available from the start for now; ±10% buttons) | done, see `docs/TERRAFORM.md` |
| Horror decoupled from scenario (user: avoid hard coupling, horrors should be swappable) | done: `ScenarioDef` × `HorrorDef`, signals, lexicon, hooks, pairings |
| Contract assignment screen (new game, renewal, CFG reassignment) | done |
| Directive tab highlight, top progress strip, tired-crew indicator (second round of feedback) | done |

## Sister game: CHARTER OF THE ELDERDARK

Requested 2026-10-19. Tracked in `docs/forest/DESIGN.md`. A playable first slice is built (company simulation and ledger UI at `/forest/`).

## Deviations from the original plan (deliberate)

- **Folder layout:** mission logic lives in `src/mission/` (not `src/systems/`) to keep a mission self-contained for the Boardroom. Story beats are in `src/data/story.ts` (one file, grouped by act), not one file per act.
- **No generic Layer interface yet** (see `docs/BOARDROOM.md`). It was in the plan but has no consumer, so TDD argued against it.
- **Crew have no supplies or morale.** Fatigue plus thaw cost provide the tension instead.
- **Crew roster does not change between contracts.** Instead, the identical manifest is a horror beat.
- **Light-lag** is narrative flavour on corporate messages (and its absence is the Act III tell), not a mechanic. There is no "comms relay" upgrade.
- **Debug mode** is URL scenario jumps only (`/contract/?debug=act2|act3|act4|terminus`).
- **iPhone e2e** runs on Chromium with iPhone 13 emulation, because the host lacks WebKit system libraries (`sudo npx playwright install-deps webkit`, then `E2E_WEBKIT=1`).

## Build queue (user, 2026-10-21)

In order. Each item has its design written down first, so nothing lives only in a conversation.

1. **(Done 2026-10-21.) LATE FEES: the Candy Corn Day tape.** A Grayhaven State Hospital venue and the killer Patient 10-30, with their crossovers, sequels and Killer's Cut entry. Design: `docs/late-fees/DESIGN.md` §3.
2. **(Built 2026-10-21.) A fourth game: DOWN THERE**, the deep-water monster game (working title FATHOM in code). Sharks, squid and octopus on the coast; deeper water and bigger things; then kaiju from a breach in the trench, and mechs to fight them. Design: `docs/kaiju/DESIGN.md`.
3. **(Done 2026-10-21.) DEEP CONTRACT: salvage**, the last of the four approved missions (`docs/MISSIONS.md` §5).

4. **The kaiju game's remainder** (`docs/kaiju/DESIGN.md`):
   - (done 2026-10-21) the name, DOWN THERE, and its picker door at `/down-there/`;
   - (done 2026-10-21) pilots' link rating and fatigue;
   - its play-as-the-horror tier, the Source, on the shared hunt engine (`docs/HORROR-TIER.md`): built 2026-10-21.
5. **Then the backlog below**, in order: (done 2026-10-21) the Keep's sappers and haulage's tiring crew watches, then the hunter and dragon horror tiers and Legend.

6. **(Done 2026-10-22) One scenario per game at the start; the rest unlock.** Debug jumps stay as the testing route. The ladders:
   - **DEEP CONTRACT** (contracts finished):
     - overland at the start;
     - extraction and the long haul at 1 (overland's ending is the promotion to it);
     - terraforming at 2, security at 3, salvage at 4;
     - the creature at 3, the hunter at 5, the Boardroom at 10 (unchanged).
   - **Elderdark** (charters finished): the forest at the start, the Keep at 1, the wood at 2, the dragon at 4.
   - **LATE FEES** (films finished): the camp at the start, the clinic at 1, the insurer at 2, the asylum at 3, crossovers at 4, the Killer's Cut at 2.
   - **DOWN THERE** (seasons finished): one season to start; the Source at 2.
   - Locked content shows what unlocks it, rather than vanishing.
6b. **(User, 2026-10-22) A walkthrough for every scenario.** "The scenarios need some kind of tutorial or walkthrough to introduce the levers for each game, rules for the scenario, etc. It isn't necessarily obvious how everything fits together."
   - **A shared guide engine** (`src/shared/guide.ts`, pure): ordered steps, each with a trigger on game state (first seen, first time X is possible, a bottleneck first hit) and text pointing at the lever to use. Each step is done when the player does the thing or dismisses it.
   - **On screen:** a short boxed tip that points at the control it talks about. One tip at a time, never blocking play, with "Skip guide" in the configuration and a "How this contract works" page (the rules) that can be opened any time.
   - **Coverage:** every scenario in every game (DEEP CONTRACT's six contracts, Elderdark's forest and Keep, LATE FEES's four tapes, DOWN THERE's zones) and each play-as-the-horror tier.
   - **State and telemetry:** seen steps are saved per game; telemetry gets `guide_step` and `guide_skipped`.
7. **(User, 2026-10-22) A second first-tier horror: the outbreak.** A novel disease spreading through the workforce and turning them against the company (zombie/pandemic homage, original IP).
   - It needs a design doc first (`docs/OUTBREAK.md`). It stays decoupled from scenarios through signals, lexicon and hooks.
   - It also needs a rule for which horror a contract gets.
8. **(User, 2026-10-22: "go ahead with the boardroom layer when it comes up") The Boardroom** (`docs/BOARDROOM.md`).

## Backlog / ideas

- **Play as the horror, in every game (user, 2026-10-20).** It reverses the roles as an unlockable higher tier, the way LATE FEES unlocks playing the killer.
  - DEEP CONTRACT: the creature (the organism, a xenomorph homage) or a hunter (a Predator homage).
  - Elderdark: a dragon, hungry forest spirits, the wood itself.
  - LATE FEES: the killers (`docs/late-fees/DESIGN.md` §7).
  - Designed together in `docs/HORROR-TIER.md` (2026-10-20): a shared hunt engine where first-tier runs play themselves, defended by their bots, and the player is the horror.
  - **Built:** the Killer's Cut, the wood, the creature, DOWN THERE's Source, the hunter, the dragon and Legend (prestige across hunts). Unlocking a new horror with Legend waits until the tiers are gated.

- **New missions (approved 2026-10-20):** security detachment, haulage and salvage for DEEP CONTRACT, and the Keep for Elderdark, with a shared held-ground engine. The design and build order are in `docs/MISSIONS.md`.
  - **Built:** held ground, the security detachment, the Keep, haulage and salvage. Nothing is left from the missions plan.

- (Done 2026-10-22, from the user's iPhone playtest of salvage) **Phone layout fixes:**
  - On a phone, the sector and compartment columns show only the rows that matter (slipping ones, the last held, the push and the next), with counts of the rest.
  - The status area is capped (half the screen, or 42% on short Safari screens), so the tab below always has room. The chrome tightens on short upright screens.
  - The desktop layout needs 500px of height, and a phone held sideways gets a two-column layout (status | tab) in all four games.
  - New e2e checks cover salvage upright and sideways, plus a sideways check for every game.
- **Real-device pass on iPhone Safari**, both in-browser and installed to the home screen (offline, audio unlock, safe areas, storage persistence).
- (Done 2026-10-21) Debug extras for DEEP CONTRACT, dev builds only: `?speed=N` (1–100× clock), `?grant=N` (credits on load) and `?flags` (an overlay with the act, flags and latest beats). The act jumps now switch to an extraction contract first.
- Run WebKit e2e once host dependencies are installed.
- (Done 2026-10-21) **More late-cycle story** (`src/data/core-story.ts`, every scenario and horror):
  - **Echoes:** four of them, from the 2nd to the 5th contract, each needing one more past contract and coming earlier on the story scale (600 down to 100).
  - **New layers:** WARDEN's previous instances from the 4th contract, and a crew that dreams of it from the 6th.
  - **The true-ending thread:** after the first broadcast of 0-77, every contract has WARDEN routing its own orders and filing counter-directive 0-78.
  - A first contract meets none of it.
  - **Still open:** the counter-directive could change play (crew safety outranking specimens), not just the story.
- (Done 2026-10-22) **Sinister directives in Acts III–IV.**
  - Directives take an optional `minAct`.
  - Extraction has KA-009 to KA-012. Terraforming, security, haulage and salvage have three each, two in act 3 and one in act 4: ordinary goals with worse and worse briefs.
  - A data test holds every contract that can turn to having them.
  - **Found on the way:** the organism's act 4 now starts at any breach, not only while contacts are aboard. Otherwise a rich bot that vented at once never saw act 4 (haulage, seed 7).
- (Done 2026-10-22, DEEP CONTRACT) **Sound polish**, only with sound turned on:
  - A held hum per act (60 Hz steady → beating → lower and rougher → a pulsing 41 Hz sawtooth), silent in the horror tiers.
  - Teletype clicks timed to each log line's print animation (6 per line, at most 4 lines at once), with the memo chime or anomaly drone closing the burst.
  - **To do:** listen on the iPhone and tune the levels. The other games have no sound yet.
- (Done 2026-10-22) **A first-load boot sequence** for DEEP CONTRACT: WARDEN's BIOS lines type out on a brand-new player's first visit only (no save yet). Any tap or key skips it, it leaves by itself after about 4.4 s, and it prints at once with reduced motion. The e2e helper `skipBoot` steps past it.
- **Raise `TERRAFORM_UNLOCK_CONTRACTS`** (currently 0 so it can be play-tested) once the user is happy with it.
- **A second horror.** The architecture is ready: add `src/mission/<horror>/`, a `HorrorDef`, lexicon keys each scenario must supply, and optional pairings. Choosing a horror per contract (random or cycled from the profile) is still to be designed.
- (Done 2026-10-22) Terraform polish: while WARDEN balances, the three allocation lines fold into a one-line power split (e.g. `ATMO 40% · HEAT 30% · WATER 30%`). Taking control back restores the steps. (Every scenario now has its own vessel, target and action sprites.)
- (Done 2026-10-22, extraction) **More flow feedback:** every generator and the refinery show what one more would add to income. It reads "+0 CR/S · REFINERY FULL" (or "NEEDS MORE ORE") in red when the other end of the line would swallow it. **Still open:** the same for the other scenarios' buy buttons.
- The **Boardroom** layer (`docs/BOARDROOM.md`).

## Balance notes

Re-run `npm run simulate` after any economy change. The current first-contract timings (all seeds, with autocycle) are: Act II 52m, Act III 2h25m, Act IV 3h04m, Terminus 4h19m. A repeat contract with Seniority 3 is faster.

Levers, roughly in order of impact:
- generator `baseRate`
- the depth curve constants in `src/mission/progress.ts`
- Special Projects costs and strain in `src/mission/containment.ts`
- the Terminus rules in `src/data/story.ts`
