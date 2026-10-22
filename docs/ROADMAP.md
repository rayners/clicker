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

## Backlog / ideas

- **Play as the horror, in every game (user, 2026-10-20).** It reverses the roles as an unlockable higher tier, the way LATE FEES unlocks playing the killer.
  - DEEP CONTRACT: the creature (the organism, a xenomorph homage) or a hunter (a Predator homage).
  - Elderdark: a dragon, hungry forest spirits, the wood itself.
  - LATE FEES: the killers (`docs/late-fees/DESIGN.md` §7).
  - Designed together in `docs/HORROR-TIER.md` (2026-10-20): a shared hunt engine where first-tier runs play themselves, defended by their bots, and the player is the horror.
  - **Built:** the Killer's Cut, the wood, the creature, DOWN THERE's Source and the hunter. **Left:** the dragon and Legend.

- **New missions (approved 2026-10-20):** security detachment, haulage and salvage for DEEP CONTRACT, and the Keep for Elderdark, with a shared held-ground engine. The design and build order are in `docs/MISSIONS.md`.
  - **Built:** held ground, the security detachment, the Keep, haulage and salvage. Nothing is left from the missions plan.

- **Real-device pass on iPhone Safari**, both in-browser and installed to the home screen (offline, audio unlock, safe areas, storage persistence).
- Debug extras from the plan: a time-scale multiplier, grant resources, a story flag viewer.
- Run WebKit e2e once host dependencies are installed.
- More late-cycle story: tells starting earlier and multiplying on repeat contracts, new layers per cycle, and the true-ending thread where WARDEN subverts the Combine. The game stays playable afterwards.
- Sinister directives during Acts III–IV (the directive table currently ends at KA-008).
- Sound polish: an ambient hum per act, and a typewriter cadence tied to the print animation.
- An optional first-load boot sequence animation.
- **Raise `TERRAFORM_UNLOCK_CONTRACTS`** (currently 0 so it can be play-tested) once the user is happy with it.
- **A second horror.** The architecture is ready: add `src/mission/<horror>/`, a `HorrorDef`, lexicon keys each scenario must supply, and optional pairings. Choosing a horror per contract (random or cycled from the profile) is still to be designed.
- Terraform polish: collapse the allocation controls to a one-line summary once WARDEN auto-balances (it frees phone space). (Every scenario now has its own vessel, target and action sprites.)
- More flow feedback: show each purchase's effect on *income* (not just ore/s) on the buy buttons.
- The **Boardroom** layer (`docs/BOARDROOM.md`).

## Balance notes

Re-run `npm run simulate` after any economy change. The current first-contract timings (all seeds, with autocycle) are: Act II 52m, Act III 2h25m, Act IV 3h04m, Terminus 4h19m. A repeat contract with Seniority 3 is faster.

Levers, roughly in order of impact:
- generator `baseRate`
- the depth curve constants in `src/mission/progress.ts`
- Special Projects costs and strain in `src/mission/containment.ts`
- the Terminus rules in `src/data/story.ts`
