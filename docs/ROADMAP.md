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
   - **Built so far (2026-10-22):**
     - The engine (`src/shared/guide.ts`) and the tip and rules views (`src/shared/ui/guide.ts`).
     - DEEP CONTRACT's guide for all six contracts plus the shared levers, with a rules page each (`src/data/guide.ts`). The tip sits above the big button; the rules sit behind a `?` in the masthead.
     - Progress is kept per device under `deep-contract.guide`, not in the save, so it needs no migration. For the same reason, telemetry for the guide is still to do: events come from save-state diffs.
     - Elderdark: forest and Keep steps and rules (`src/forest-data/guide.ts`), progress under `elderdark.guide`.
     - LATE FEES: steps and a rules page for each of the four tapes (`src/late-fees-data/guide.ts`). The tip sits above the whistle and the `?` in the tape header; progress is kept under `latefees.guide`.
     - DOWN THERE: a step for each zone's lever as the water opens (pass, beach dial and guards, range and buoys, enhancement and pens, station depth and crews, walls, Bulwarks and pilots) and a season rules page (`src/fathom-data/guide.ts`), progress under `fathom.guide`.
     - Every play-as-the-horror tier (the Killer's Cut, the wood, the dragon, Special Order 0-77, the hunter, the Source): one shared hunt guide (`src/shared/hunt-guide.ts`) in each tier's own words, with a rules page behind a `?` in the tier's header. Each tier keeps its own progress (`latefees.cut.guide`, `elderdark.wood.guide`, `elderdark.dragon.guide`, `deep-contract.creature.guide`, `deep-contract.hunter.guide`, `fathom.deep.guide`).
     - Telemetry: `guide_step` (done or dismissed) and `guide_skipped`, announced by the guide view and forwarded by `startAnalytics`; a walkthrough tile on the Game pacing dashboard.
     - **Done.**
7. **(User, 2026-10-22) A second first-tier horror: the outbreak.** A novel disease spreading through the workforce and turning them against the company (zombie/pandemic homage, original IP).
   - **Designed** in `docs/OUTBREAK.md` (2026-10-22): Strain KA-11, "the Pallor": a flu in Act II that everyone recovers from, the discovery in Act III (Bioproducts wants samples), the turned working against the company in Act IV. A SICK BAY tab with a quarantine dial, screening, wards, cultures and lockdown.
   - **Which horror:** from 6 completed contracts, each new contract draws organism or outbreak from its seed (at most two in a row), hidden from the assignment screen.
   - Build order is in the design doc (eight pieces).
   - **Built:** piece 1, the spread model (`src/mission/outbreak/`): workforce shares (exposed, sick, turned, recovered), the quarantine dial, a flu that everyone recovers from before the discovery, turning in Act IV, output, pressure on held ground and sabotage through the scenario. Registered as a horror, but no contract gets it yet.
   - **Built:** piece 2, the story (`src/data/outbreak/`): Act II's flu (sick days, a Wellness memo, a cough, everyone back on shift, swabs kept for the records, a cold patient, a quiet mess hall), the discovery, Bioproducts, the sick bay doors opening, named crew turning, Directive 11 in the archive, and three endings (ship the samples, burn the cultures, broadcast Directive 11).
   - **Built:** piece 3, the levers (`src/mission/outbreak/levers.ts`, store actions): Wellness (Act II), screening, ward beds, culture tanks and samples (Bioproducts funding, a more infectious strain), lockdown (Act IV), and the Infection Control Officer.
   - **Built:** piece 4, on screen: the SICK BAY tab (`src/ui/sick-bay.ts`) from Act II, the quarantine dial and the rest after the discovery, OFF SICK and TURNED in the status area, guide steps (sick bay, quarantine, wards, lockdown) and an OUTBREAK section on the rules page after the discovery.
   - **Built:** piece 5, the rule (`horrorFor` in `src/core/prestige.ts`): from 6 contracts, organism or outbreak drawn from the contract seed, never three running; contract records name their horror (save v9); debug jumps `outbreak`, `ob-act2`, `ob-act3`, `ob-act4`. **Outbreak contracts are now live for veterans.**
   - **Built:** piece 7 (ahead of 6, since the outbreak is live): the pacing bot's sick bay, `npm run simulate all outbreak`, and an outbreak pacing test for each of the five scenarios. Seed 7: act 2 at 52m–1h08m, act 3 at 2h26m–2h49m, act 4 at 3h02m–3h39m, terminus at 4h17m–4h54m. Prices were cut to fit Act III budgets (officer 1M, wards 200k) and the turned now spread it too, so Act IV keeps pressing.
   - **Built:** piece 8, telemetry: `crew_turned` and `lockdown_used`, and an "act timing by horror" tile on the Game pacing dashboard.
   - **Built:** piece 6, Calder's Landing (`src/data/outbreak/calders-landing.ts`), the outbreak's pairing for security: empty dormitories and a colds note in Act II, swabs dated before the colony went dark, the missing forty among the turned, and the tunnels they built.
   - **Done (2026-10-22).**
8. **(User, 2026-10-22: "go ahead with the boardroom layer when it comes up") The Boardroom** (`docs/BOARDROOM.md`).
   - **Designed** (2026-10-22): a layer beside the player's contract, from 10 contracts. Commission real first-tier contracts into office slots, each run headless by its own WARDEN; a safety budget dial, scrutiny and inquiries, divisions, a COO; a slow burn in which the company is the monster (recycled crews from the player's own history, WARDEN's reconditioning signed in this office); three endings to a term. Eight build pieces.
   - **Built:** piece 1, the foundation (`src/core/boardroom.ts`): `BoardroomState`, promotion from 10 contracts, enter and leave (the player's contract waits), contracts chartered into office slots and run headless by their own WARDEN, save v10, `?debug=boardroom`. No screen yet.
   - **Built:** piece 2, delivery: finished contracts close by the standing policy (deliver pays 2.5x the charter plus specimens and samples; scuttle pays a fifth of the charter), go in the Board's ledger and free their office; floors buy more offices (up to six). `missionRecord` now builds every contract record.
   - **Built:** piece 3, safety and scrutiny: a safety dial (0-10) that scales every running contract's incidents and berths and costs value per contract per second; scrutiny from crew deaths and scuttles, fading over time; an inquiry at 100 (a fifth of value fined, charters frozen for ten minutes).
   - **Built:** piece 4, divisions (`src/data/boardroom/divisions.ts`): Personnel (cheaper charters), Legal (softer scrutiny), Special Projects and Bioproducts (product pay), Logistics (contracts run faster), and a COO who recharters every free office with the best-paying contract on the ledger.
   - **Built:** piece 5, on screen (`src/ui/boardroom.ts`): THE BOARDROOM in letterhead cream and oxblood, offered from the configuration (ACCEPT PROMOTION, or what opens it); value, offices and scrutiny; charter buttons, contract cards, floors; the safety dial and standing policy; divisions; the minutes. One column on phones, two on desktop. **The Boardroom is now playable for veterans.**
   - **Built:** piece 6, the story (`src/data/boardroom/story.ts`, `src/core/boardroom-story.ts`): the Chair's welcome; the player's own callsigns and ships (from `profile.history`) on new manifests, a common name, then a clerical error; Reconditioning Order 7731, carried with WARDEN's own seat; crew reclassified as consumables, and the dead counted from the player's record.
   - **Built:** piece 7, the end of a term (75 minutes into Act IV, or ₭300M): Chair the Board (a Dividend: a richer start and +25% on deliveries next term), Testify (Conscience; the player's next contract remembers), and Release the minutes (from the third term). New terms keep the player's contract and record; save v11 adds `boardTerms` and `dividends`.
   - **Built:** piece 8: pacing (`npm run simulate:board`; Board contracts at five times the Board clock; acts at the first, fifth and eighth delivery: 43m, 2h09m, 2h52m, term at 4h07m); a fiscal calendar (user: a Board minute is a quarter, so a contract's eleven-year haul passes in about 44 minutes); the Board's own guide and rules page; telemetry (`boardroom_entered`, `board_contract_delivered`, `inquiry_opened`, `term_ended`) and a Boardroom tile on the dashboard.
   - **Done (2026-10-22).**

## Backlog / ideas

- **Play as the horror, in every game (user, 2026-10-20).** It reverses the roles as an unlockable higher tier, the way LATE FEES unlocks playing the killer.
  - DEEP CONTRACT: the creature (the organism, a xenomorph homage) or a hunter (a Predator homage).
  - Elderdark: a dragon, hungry forest spirits, the wood itself.
  - LATE FEES: the killers (`docs/late-fees/DESIGN.md` §7).
  - Designed together in `docs/HORROR-TIER.md` (2026-10-20): a shared hunt engine where first-tier runs play themselves, defended by their bots, and the player is the horror.
  - **Built:** the Killer's Cut, the wood, the creature, DOWN THERE's Source, the hunter, the dragon and Legend (prestige across hunts). **Legend opens the next horror early** (2026-10-22): the hunter at 5 contracts or 3 Legend as the creature; the dragon at 4 charters or 3 Legend as the wood. Closed doors say both ways in. (LATE FEES's killers share one tier and DOWN THERE has one, so neither changes.)

- **New missions (approved 2026-10-20):** security detachment, haulage and salvage for DEEP CONTRACT, and the Keep for Elderdark, with a shared held-ground engine. The design and build order are in `docs/MISSIONS.md`.
  - **Built:** held ground, the security detachment, the Keep, haulage and salvage. Nothing is left from the missions plan.

- (Done 2026-10-22, from the user's iPhone playtest of salvage) **Phone layout fixes:**
  - On a phone, the sector and compartment columns show only the rows that matter (slipping ones, the last held, the push and the next), with counts of the rest.
  - The status area is capped (half the screen, or 42% on short Safari screens), so the tab below always has room. The chrome tightens on short upright screens.
  - The desktop layout needs 500px of height, and a phone held sideways gets a two-column layout (status | tab) in all four games.
  - New e2e checks cover salvage upright and sideways, plus a sideways check for every game.
- **Real-device pass on iPhone Safari**, both in-browser and installed to the home screen (offline, audio unlock, safe areas, storage persistence).
- (Done 2026-10-21) Debug extras for DEEP CONTRACT, dev builds only: `?speed=N` (1–100× clock), `?grant=N` (credits on load) and `?flags` (an overlay with the act, flags and latest beats). The act jumps now switch to an extraction contract first.
- (Done 2026-10-22) WebKit e2e runs (`E2E_WEBKIT=1`): all green. Long runs of presses go through `pressMany`, since Playwright's WebKit taps take about 0.4 s each.
- (Done 2026-10-21) **More late-cycle story** (`src/data/core-story.ts`, every scenario and horror):
  - **Echoes:** four of them, from the 2nd to the 5th contract, each needing one more past contract and coming earlier on the story scale (600 down to 100).
  - **New layers:** WARDEN's previous instances from the 4th contract, and a crew that dreams of it from the 6th.
  - **The true-ending thread:** after the first broadcast of 0-77, every contract has WARDEN routing its own orders and filing counter-directive 0-78.
  - A first contract meets none of it.
  - (Done 2026-10-22) **Counter-directive 0-78 changes play:** filing it sets `counter-0-78`. The organism's incidents never take crew, vents clear the decks first, and recovery rigs work at half rate; the outbreak's named crew turn half as readily.
- (Done 2026-10-22) **Sinister directives in Acts III–IV.**
  - Directives take an optional `minAct`.
  - Extraction has KA-009 to KA-012. Terraforming, security, haulage and salvage have three each, two in act 3 and one in act 4: ordinary goals with worse and worse briefs.
  - A data test holds every contract that can turn to having them.
  - **Found on the way:** the organism's act 4 now starts at any breach, not only while contacts are aboard. Otherwise a rich bot that vented at once never saw act 4 (haulage, seed 7).
- (Done 2026-10-22, DEEP CONTRACT) **Sound polish**, only with sound turned on:
  - A held hum per act (60 Hz steady → beating → lower and rougher → a pulsing 41 Hz sawtooth), silent in the horror tiers.
  - Teletype clicks timed to each log line's print animation (6 per line, at most 4 lines at once), with the memo chime or anomaly drone closing the burst.
  - **To do:** listen on the iPhone and tune the levels.
  - The synth is shared now (`src/shared/ui/sound.ts`, a palette of voices and hums per game). DOWN THERE has sound (2026-10-22): a sonar ping every six seconds, a ping per pass sold, a low thud for anyone lost to the water, a landfall alarm, and a hum that sinks act by act; a SOUND switch in its configuration. LATE FEES (a tape click per press, a synth stab per kill, a swell per act, the credits, a quickening bass pulse) and Elderdark (a quill for foraging, a bell for the dead, a sour chord for the turned, a bright one for a fragment of the Key, a drone that sinks as the wood wakes) have theirs too. Every game has sound now, off until the player turns it on.
- (Done 2026-10-22) **A first-load boot sequence** for DEEP CONTRACT: WARDEN's BIOS lines type out on a brand-new player's first visit only (no save yet). Any tap or key skips it, it leaves by itself after about 4.4 s, and it prints at once with reduced motion. The e2e helper `skipBoot` steps past it.
- (Done 2026-10-22) `TERRAFORM_UNLOCK_CONTRACTS` is 2, with the unlock ladder (build queue item 6).
- (Done 2026-10-22) **A second horror:** the outbreak (`docs/OUTBREAK.md`, build queue item 7), with `horrorFor` choosing a contract's horror.
- (Done 2026-10-22) Terraform polish: while WARDEN balances, the three allocation lines fold into a one-line power split (e.g. `ATMO 40% · HEAT 30% · WATER 30%`). Taking control back restores the steps. (Every scenario now has its own vessel, target and action sprites.)
- (Done 2026-10-22, extraction) **More flow feedback:** every generator and the refinery show what one more would add to income. It reads "+0 CR/S · REFINERY FULL" (or "NEEDS MORE ORE") in red when the other end of the line would swallow it. Terraform has it too (2026-10-22): reactors and processors, with NO PROCESSORS TO FEED, PROCESSORS FULLY POWERED, NO POWER TO SPARE or OFF SPEC when one more would add nothing. Security has it (2026-10-22) as push and line: troopers, fabricators and sentries show what one more adds to the assault or the line (`pushGain`), or AMMUNITION ENOUGH, NOWHERE TO SEND THEM, LINE ALREADY HELD. Haulage and the overland haul show income per engine and car (TOO HEAVY FOR THE ENGINES when a car's mass costs more than its freight earns); salvage shows pay per cutter and hold per shoring (BRACED ENOUGH). Every scenario has it now.
- (Done 2026-10-22) The **Boardroom** layer (`docs/BOARDROOM.md`, build queue item 8).

- (Done 2026-10-22) **An About page with a tip jar** (`/about/`): who made the games, 30 years of writing software and building them with Claude in one sentence (the user's wish, for trust), the source on GitHub, what leaves the device, and the Ko-fi tip jar (`tip_jar_opened`). Linked from the picker's footer and every game's settings. Paid unlocks are not built.
- **(User idea, 2026-10-22, undecided) Paid unlocks.** Small payments, for this browser only, no backend: a tip jar, and/or unlocking every scenario (for all games, or one genre at a time). Notes for when it is decided:
  - A tip jar is just a link to a payment page (Ko-fi, Buy Me a Coffee or a Stripe Payment Link) in each game's configuration and on the picker. No game code depends on it.
  - Without a server, an unlock can only be on the honour system: a payment page that redirects back to a page setting a flag on the device. Anyone could set the flag by hand. That is fine at these stakes. Codes that cannot be forged need something to sign them (for example a small serverless function on the payment webhook), which is a backend.
  - The flag should travel in save export/import, or a player moving devices, or clearing storage, loses it. Safari also clears site storage after seven days without a visit unless the game is installed to the home screen.
  - Card fees take a large share of very small payments (Stripe: 30¢ plus 2.9%), so a few dollars or pay-what-you-want works better than cents.
  - Unlocking skips the progression the user chose on 2026-10-22 (one scenario per game at the start), so it should be clearly a shortcut, and debug jumps stay the testing route.

## Review findings (2026-10-22)

Two subagent passes at the user's request: an adversarial QA run and a design review. Full reports are in the session; each item below is open unless marked done.

### QA (bugs)
- (Done) DEEP CONTRACT ran time backwards when the device clock was set back (negative `dt`).
- (Done) Offline catch-up froze the page for 20–40 s in the horror tiers and the Boardroom (1 s steps, `multipliers()` recomputed per item): now 5 s steps and memoised multipliers, about 2 s.
- (Done) The Boardroom could be stranded (funding a division below a charter's cost): the treasury now advances a charter.
- (Done) LATE FEES: flipping another killer's side B silently destroys a paused Killer's Cut, with no Legend banked (`startCut`, `shelf.ts`).
- (Done: each game checks a loaded save against a fresh one) Save validation checks only the top level: an import with a missing nested field bricks the game, and the import reports "nothing changed" after replacing state (all four games).
- (Done: resting restores hunger) Every horror tier dead-ends at hunger 0 (nothing refills it; the rules page says something will).
- (Done) The Boardroom's horror draw collapses to one horror for a whole term (the anti-streak rule reads the player's own history).
- (Done) DEEP CONTRACT: REQUEST REASSIGNMENT overrides the start and renewal screens; CANCEL then runs a placeholder contract.
- (Done, in all four games) Overlays do not make the covered contract inert: its controls stay focusable and usable behind the Boardroom and the assignment screen.
- (Done: a 400 ms gap) A double tap passes every two-step confirm, including HARD RESET (no minimum delay between taps).
- (Done for the opening screens, with an e2e check; party steppers and the Killer's Cut buttons still to check) Tap targets under 44 px: DEEP CONTRACT's CFG, Elderdark's config, every "Skip guide", Elderdark's party steppers, the Killer's Cut buttons.
- (Done) DEEP CONTRACT first load on touch: the tap that skips the boot also taps the assignment button beneath it.
- Suspected: the haulage "fuel at stations" guide step loses its target between stations; IPv6 loopback is not treated as local by `telemetryAllowed`; blocked storage throws at startup.

### Design
- Sideways (844×390), all four games: a guide tip makes the tab bar row about 190 px tall.
- Elderdark upright: panels get about 50 px; the masthead, map, stats and tip take the rest.
- DEEP CONTRACT upright: the guide tip takes about 110 px on every tab, even ones it is not about.
- Overland, the first contract: space words on a road haul (thrusters, KM/S, thrust, the HAUL guide steps).
- Picker: DEEP CONTRACT's door describes extraction, but new players start on the overland haul.
- Elderdark config on a phone: locked-feature buttons overflow and their unlock conditions are clipped.
- Terraform and security status block overflows on phones; monitor strips show through.
- Boardroom: the minutes are buried under the divisions; value has no net rate; charters give no expected return; cards cannot be dropped into.
- Outbreak Act IV: the SICK BAY keeps its Act II order; the sick-bay guide step stays until Wellness is bought.
- DEEP CONTRACT config names the locked horror tiers on a first contract (an early horror leak).
- Config dialogs: inconsistent insets and close glyphs; LATE FEES SETUP's close button says EJECT.
- LATE FEES camp: "PREP" means three things; the shelf's stock stamps collide with titles on phones.
- The play-as-the-horror entry points live in config dialogs next to hard reset (LATE FEES's shelf is the exception).
- Elderdark: the Keep still says FORAGE THE EAVES; old-style numerals make readouts hard to read; "~" reads as a minus.
- Low: desktop tabs wrap; boot lines wrap on phones; "12 MORE LOST" on a fresh security contract; DOWN THERE depth 0 vs 4 m; the picker sideways shows one game; About uses old-style numerals and a small GitHub link.

## Balance notes

Re-run `npm run simulate` after any economy change. The current first-contract timings (all seeds, with autocycle) are: Act II 52m, Act III 2h25m, Act IV 3h04m, Terminus 4h19m. A repeat contract with Seniority 3 is faster.

Levers, roughly in order of impact:
- generator `baseRate`
- the depth curve constants in `src/mission/progress.ts`
- Special Projects costs and strain in `src/mission/containment.ts`
- the Terminus rules in `src/data/story.ts`
