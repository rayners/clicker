# DEEP CONTRACT — design

## Vision

A browser idle/clicker game in the spirit of the *Alien* universe: retro-futurist terminals, an all-powerful mega-corporation, no FTL, cryo-sleep, years-long hauls. For roughly the first two hours of *progress* (not wall-clock) it reads as a cheerful corporate mining sim. Then it becomes horror. The UI is primarily text (a CRT terminal) with pixel-art accents.

Original IP: Alien-flavoured, with no direct names, quotes or logos from the films.

## Premise

- You are **WARDEN**, the operations intelligence of the **MSV Calloway Reach**, a deep-space ore refinery-hauler owned by the **Kessler-Amari Combine** ("Building Better Futures, Further Out").
- A crew of 7 sleeps in cryo. You wake them as needed.
- The job is to strip-mine the moonlet **LV-0919 "Tethys Minor"** and haul the ore home, 11 years away. Corporate messages arrive with light-lag (`[TX 2Y 11M AGO]`).
- The truth: a prior Combine probe (KA-SP-3) found an organism in a warm void 3,200 m down. The contract is commercial cover. WARDEN's sealed **Special Order 0-77** says the organism's recovery supersedes everything and crew survival is not a mission parameter. The science officer, Dr. Kane, was swapped in by Special Projects two days before departure.

## Scenarios and horrors

A contract is a **scenario** (the economy and corporate story) paired with a **horror** (Acts II–V). Today there are two scenarios, extraction (described below) and terraforming (`docs/TERRAFORM.md`), and one horror, the organism (also described below). Horrors are written once against story signals and each scenario's lexicon, so they can be swapped.

## Core loop and systems (extraction)

- **Drill (click):** ore per press (`EXECUTE DRILL CYCLE`). Click upgrades plus *telemetry assist* (adds a share of automated output). Each press shows its real yield.
- **Autocycle:** an early upgrade line (`WARDEN AUTOCYCLE`, then `PARALLEL SCHEDULER`, `PREDICTIVE STRIKE`, `OPERATOR NOT REQUIRED`) where WARDEN fires the drill itself, visibly pressing the button. Auto cycles get drill-head multipliers but **not** the telemetry share; letting them compound with it made pacing about 25% too fast. The upgrade names foreshadow WARDEN taking over control.
- **Refinery:** converts ore to credits up to its throughput, which is a deliberate bottleneck with its own upgrade line. Credits buy everything.
- **Generators:** 8 tiers (drone, auger, crawler, mass driver, seismic array, deep-core bore, subsurface habitat, abyssal shaft). Cost ×1.15 per unit; each tier is less cost-efficient than the last. A tier is revealed once the previous one is owned.
- **Upgrades:** handcrafted click, refinery and global multipliers, plus MK II/III/IV ×2 per generator at 10/25/50 owned.
- **Crew:** 7 named crew with dossiers and portraits. Waking costs credits. While awake and not exhausted they give a boost. Fatigue builds over 20 min awake and recovers over 5 min in cryo. Life support allows 3 awake at once. The medic halves fatigue. States: cryo / awake / exhausted / lost.
- **Corporate directives:** a sequence of timed HQ goals (extract X, earn Y, own N of a generator) with credit rewards. They are issued with light-lag flavour, with a cooldown between them. Their briefs grow quietly sinister ("do not survey the southern fissure", "do not discuss with crew").
- **Special Projects (Act III+):** recovery rigs pull specimens from the void. Held specimens give a funding multiplier (1 + 0.5·√specimens) but strain containment integrity. You can reinforce containment or buy cryo-lock levels. At 0% integrity there is a breach: about 30% of held specimens escape as **contacts**.
- **Infestation (Act IV):** contacts cause seeded incidents: lost equipment, lost crew (awake crew are taken first), and containment damage. **Venting** decks kills about 60% of contacts but may kill crew who are awake.
- **Offline progress:** capped at 8h and simulated in 1s steps. A "LOW-POWER INTERVAL" summary is logged after any absence of 60s or more.

## Acts and pacing (progress-gated)

Progress is **shaft depth** (`depth = 0.0432 · log10(1+lifetimeOre)^5.48` m), plus specific purchases and story flags. Targets are for a reasonable first-contract player and are enforced by `tests/sim/pacing.test.ts` using the bot in `src/sim/bot.ts`.

| Act | Target | Trigger | Tone and content |
|---|---|---|---|
| I · Contract | 0 to ~55m | start | Upbeat corporate. Boot sequence, welcome memo, wellness reminders, shareholder bulletin, crew banter on waking. Green phosphor. No `anomaly` log entries on a first contract (tested). |
| II · Routine | ~55m to 2.5h | depth ≥ 1,000 m | Dismissible tells: 3 s telemetry loss, a "LOG DISCONTINUITY 3.000 S", a cryo pod occupant vocalising, a periodic 0.2 Hz "sensor artefact" cavity at 3,200 m, HQ asking for unprocessed core, "8 LIFE SIGNS", then "CORRECTION: 7", a drone returning with residue, a medical flag cleared by a *remote* credential seconds ago. |
| III · Discovery | ~2.5h to 3.1h | depth ≥ 3,200 m and a bore owned | Cavity breach (304 K, 96% humidity, 0.2 Hz). Special Projects messages arrive with **zero light-lag**. Specimen recovery opens. Pods request thaw from inside. Rhythmic tapping matches the void signal. Palette turns sickly yellow-green. The masthead tears and sprites glitch intermittently. |
| IV · Infestation | ~3.1h to 4.4h | first breach (forced at ≥20 specimens, or by depth with ≥1 specimen) | Amber emergency palette, red alert pulse, motion tracker, contacts stat, crew going missing, "w a r d e n" on the intercom. Special Order 0-77 unseals in the ARCHIVE. HQ calls crew attrition "acceptable". |
| V · Terminus | ~4.4h | all crew lost, 300 specimens recovered, or 75 min after the first breach | The return window opens and the TERMINUS panel offers the endings. |

Each Act II tell must have a mundane reading for first-time players and be recognisable to returning ones.

## Prestige: "Contract Renewal"

Choosing an ending resets the mission and updates the persistent profile:
- **Deliver the cargo:** +Seniority = 1 + ⌊specimens/5⌋. Each point is +25% production on future contracts. Counts as a *delivery*.
- **Scuttle the ship:** +Conscience = 1 + surviving crew. Each point gives +1 life-support slot (capped at the full crew) and makes incidents rarer.
- **Broadcast 0-77** (hidden, needs ≥3 contracts and ≥3 conscience): transmits the archive on all frequencies and delivers anyway. Grants both currencies.
- A new contract means a new ship name (cycling list) and the **same seven crew names**, which WARDEN notices ("PROBABILITY OF COINCIDENCE: 0.0000%"). Repeat contracts surface memory fragments ("YOU HAVE DONE THIS BEFORE"), plus a commendation or a "reconditioned core" message depending on past endings.
- Every contract appends a record (ship, ending, ore, specimens, crew survived, duration) to `profile.history`, shown in the ARCHIVE.
- Intended to stay open-ended. Later cycles should add new story layers, and a true-ending thread can let WARDEN subvert the Combine (see the roadmap).

## UI and art direction

- **CRT terminal, a 1979 corporate-mainframe feel.** VT323 for terminal text; Michroma (Eurostile-like) for Kessler-Amari branding. Both are self-hosted via `@fontsource`. Phosphor glow, scanlines, vignette, faint flicker. All motion is disabled by `prefers-reduced-motion` or by the in-game setting.
- **Palette by act** (CSS variables on `.shell[data-act]`): green (I–II), then sickly yellow-green (III), then amber (IV–V). A red alert pulse while contacts are aboard.
- **Production flow is the headline** (from the first phone playtest: "ore/s should be the primary stat"). Ideally this is the input/output balancing of *Universal Paperclips*.
  - `EXTRACT ▸ REFINE ▸ INCOME` sits in large type under the masthead, with a refinery-load meter.
  - The **limiting stage is highlighted**, and when the refinery is full it is inverted, with a note such as "367 ORE/S BACKING UP". This tells the player what to buy next.
  - Any purchase or crew change that moves ore/s gets a floating `+X ORE/S` call-out (red for losses).
  - Ore, credits and depth are secondary stats beneath.
- **Operations monitor** (top of OPS): every running automated system (autocycle and each owned generator) with count, looping work-cycle bar and output. It exists so automation is visible rather than inferred from a growing credit number.
- **Layout:**
  - Phone: masthead, the flow readout and a 3-column secondary stat row, the active panel, a pinned drill bay, and a bottom tab bar with short labels.
  - Desktop (≥900px): status | log + drill | tabbed side panel.
  - Tabs appear only when their feature unlocks: OPS, SYSTEMS, UPGRADES, CREW, DIRECTIVES, SPECIAL PROJECTS, ARCHIVE, TERMINUS.
- Tabs with something running behind them carry a lit marker; DIRECTIVES while one is active, CREW when crew are tiring. CREW blinks when someone is exhausted.
- The **alerts strip** at the top shows the active directive (id, progress bar, countdown) and tired or exhausted crew. Tapping an item opens its panel.
- **Comms log:** a print-wipe animation per entry. Kinds `sys`, `corp`, `crew` and `anomaly` are styled differently (anomaly entries tear).
- **Pixel accents in code:** ship (masthead), animated drill bit (in the button), moonlet (desktop status), 12×12 crew portraits, and the motion-tracker canvas. Lost crew portraits render heavily corrupted. PWA icons are generated from the moonlet sprite.
- **Sound** (off by default): WebAudio click, teletype, corporate chime, anomaly drone, tracker ping. Unlocked on the first gesture for iOS.
- Settings live behind a **CFG** button that is always present in the masthead: sound, reduce motion, export/copy/download/import save, and a two-tap hard reset.

## Platform and state

- Mobile-first, with iPhone Safari as the real-device target. Saves on a 10s autosave, on `visibilitychange`→hidden and on `pagehide`. Requests `navigator.storage.persist()`.
- Single `GameState` JSON in `localStorage` (`deep-contract.save`). A versioned schema with ordered migrations (currently v2). A corrupt save is backed up to `deep-contract.corrupt` and the game starts fresh.
- Installable PWA (`vite-plugin-pwa`, auto-updating service worker). Works offline. Home-screen install also avoids Safari's 7-day storage eviction.
- Plain JS `number` is enough; prestige keeps values well below 1e300.
