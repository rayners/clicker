# CHARTER OF THE ELDERDARK — design

A sister game to DEEP CONTRACT: an idle/management game in which you run a treasure-hunting company on the edge of a primeval forest. It lives in the same repo as a second page (`/forest/`) with its own save, its own installable app and its own content, and shares engine code with DEEP CONTRACT. It was requested on 2026-10-19 and is modelled on the *world concept* of Symbaroum.

**Original IP.** As with DEEP CONTRACT's Alien inspiration, it borrows the feel and none of the names or lore. The feel:
- a dark, untamed forest full of monsters;
- corruption that marks anyone who takes from it;
- relics of a fallen empire beneath the roots;
- a young kingdom pushing in, with rival orders who want the relics for their own reasons.

## Decisions (user, 2026-10-19)

- **Codebase:** same repo, shared core. It is a second Vite page with a separate save key and PWA manifest.
- **Look:** ledger and woodcut. Candlelit parchment-dark palette, iron-gall ink, rubrication red, blackletter or serif headings, woodcut-style pixel art. Text-first, like DEEP CONTRACT.
- **Tone:** dark from the start and deepening. The forest is openly lethal from minute one. The slow reveal is about corruption, what the relics really are, and what the company is becoming.
- **Prestige:** charter renewal, like DEEP CONTRACT. A run builds to a deep expedition and a choice of endings, and persistent standing carries into the next charter.
- **Core loop:** the user asked for it to be built around sending parties into the forest for relics and treasure. The balancing levers they named are recruiting, healing and rest, corruption management, and party composition.

## World (original)

- **The Elderdark:** a forest older than any kingdom. It doesn't so much hide monsters as grow them. Taking from it leaves **Blight**, a creeping corruption that first shows as blightmarks (grey veining, cold hands, dreams of roots) and ends with the bearer belonging to the wood.
- **Aurest:** a young queendom of refugees who crossed the mountains a generation ago, fleeing a blighted homeland. They don't talk about why it was blighted.
- **Thistlegate:** the palisaded frontier town at the forest's edge where the company keeps its hall, its ledger and its debts.
- **Ysmarch:** the fallen empire whose cities lie swallowed beneath the roots. Its relics fetch fortunes.
- **The Wold-kin:** ageless forest folk who keep an old Pact. They warn once, then kill.
- **The Lantern Synod:** the queendom's church of the dawn. It cleanses Blight for a tithe, and its inquisitors burn those it can't cleanse.
- **The Collegium:** scholars who buy relics, any relic, at any price, and ask that the company keep certain finds unsorted.
- **The company:** the Company of the Ashen Key, holding a royal charter to delve. The player is its **Factor**, who keeps the ledger. The ledger *is* the UI. Entries are written in a clerk's hand, and later in other hands.

## Core loop

| DEEP CONTRACT | Elderdark |
|---|---|
| Drill (click) | **Forage the Eaves** (click): picks up relic shards at the forest's edge |
| Ore | **Relics**, recovered by parties and held in the vault |
| Refinery throughput | **Appraisal**: Collegium buyers turn relics into silver at a limited rate. Unsold relics sit in the vault and **raise Blight**. |
| Credits | **Silver** (thalers) |
| Generators | **Hired hands** per class. More hands means more parties in the field. |
| Crew | **Captains**: named veterans who lead parties and carry their own corruption |
| Depth | **Delve**: how far into the wood the company has reached (story progress) |

### Balancing (the levers)

1. **Recruiting:**
   - Hire Blades, Menders, Scouts and Mystics. Each hire costs more than the last.
   - Every hand draws **wages** every second. Wages against income is the first balance: an over-hired company bleeds silver.
   - At zero silver, hands desert.
2. **Party composition:**
   - Each region has a **standing order**, a composition template set with ±1 buttons per class (the same one-tap pattern as terraform's allocation).
   - **Strength** comes mostly from Blades, then Mystics, then Scouts, then Menders, and is set against the region's **danger**.
   - **Menders** reduce wounds and deaths.
   - **Scouts** shorten the trip and increase the haul.
   - **Mystics** reduce Blight taken and increase relic finds, but carry Blight themselves.
   - Composition decides survival, haul and corruption. The UI shows the projected outcome before you dispatch.
3. **Healing and rest:** returning hands come back **wounded** or **weary** and can't be sent out until they recover. The Hospice (menders at home) speeds recovery. Pushing parties back out too fast multiplies casualties.
4. **Corruption (Blight):**
   - A company-wide **Blight** meter rises from expeditions (more in deeper regions) and from unsold relics in the vault.
   - It falls through **penance** at the Synod chapel, which costs silver and an upgradable cleansing rate.
   - High Blight causes hands to **turn**: they are lost, and later appear in the forest as things that ambush parties.
   - Selling relics fast lowers Blight but floods the market (appraisal throughput is the cap).
   - Keeping certain relics as **artefacts** grants bonuses and raises Blight permanently.

### Automation

- **Quartermaster** (upgrade line): standing orders dispatch themselves whenever enough rested hands are available, at increasing frequency and across more regions. This is the counterpart of autocycle and the load balancer, and it should *feel* like the company running itself.
- An **operations board** (the monitor) lists parties in the field, each with a travel bar, destination and expected return.

### Flow readout

`GATHER ▸ APPRAISE ▸ COFFERS` (relics per minute, appraisal per minute, net silver per second after wages). Whatever is holding the company back is highlighted: thin hauls, a backed-up appraisal, or wages outrunning income. A **Blight** meter sits beneath it.

## Regions (the delve)

These unlock with Delve progress. Each has a danger, a duration, a relic yield, harm and Blight.

1. **The Eaves:** forest edge, wolves and deadfall.
2. **Briar Hollows:** thorn-choked dells, bandit camps, the first ruins.
3. **The Drowned Barrows:** flooded grave-mounds of Ysmarch.
4. **The Thornmaze:** a living labyrinth; the Wold-kin's border.
5. **Ysmarch Undercity:** the swallowed capital. *Deep access* for the story.
6. **The Heartwood:** the last region, only reachable late.

## Acts (progress-gated)

The pacing targets mirror DEEP CONTRACT (about 1h / 2.5h / 3h / 4.5h) and are enforced by a pacing bot.

| Act | Tone | Content |
|---|---|---|
| I · Charter | Grim but prosperous | The town is hungry for relics. Parties come back short-handed and it's "the price of the trade". The Synod's tithe, Collegium contracts, wages and ale. |
| II · Marks | Unease | Veterans show blightmarks. Relics hum in the vault at night. A Collegium buyer asks that a particular find stay unsorted. Hands return who were reported dead. The ledger has an entry in a hand you don't recognise. |
| III · The Key | Revelation | The Undercity yields a fragment of the **Ashen Key**: the company's namesake was never metaphorical. The Collegium is reassembling the thing that blighted Aurest's homeland. Old ledgers show the Factor has kept this book before. |
| IV · The Wood Wakes | Horror | Turned hands lead the forest's things against Thistlegate's palisade. The Wold-kin give their one warning. Inquisitors audit the company's roster. |
| V · Reckoning | Choice | Endings, below. |

**Endings (charter renewal):**
- **Sell the Key to the Collegium:** gain **Renown**, permanent income bonuses. The cycle continues somewhere else.
- **Return the fragments to the Wold-kin:** gain **Grace**, lower Blight gain and better healing. Few survive the walk.
- **Burn the Ledger** (hidden, later charters): gain both. The Factor stops pretending not to remember.

## Architecture

- **Shared engine** (moved out of DEEP CONTRACT, keeping its tests): format, seeded RNG, the generic save engine (key, version, ordered migrations, corruption backup, export/import), the store pattern, the story engine, log and lexicon (over a minimal `StoryHost` interface), and UI pieces (`h()`, flow readout, operations monitor, log view, sprite renderer, settings shell, sound).
- **Elderdark code:**
  - `src/forest/` holds the pure company simulation: no DOM, clock or `Math.random()`, the same rules as missions.
  - `src/forest-data/` holds content tables.
  - `src/forest-ui/` holds the ledger UI.
  - `forest/index.html` is a second Vite entry, with its own manifest and service worker scope.
- **Independence:** DEEP CONTRACT and Elderdark share engine code only. Neither imports the other's game code, and a test checks that.
- **Same non-negotiables** as DEEP CONTRACT: strict TDD, phone and desktop equally first-class, no backend.

## Build order (each step test-first)

1. Shared engine extraction (behaviour-neutral; all DEEP CONTRACT tests stay green), then a multi-page Vite build with an empty Elderdark shell.
2. Company simulation:
   - silver, wages and desertion;
   - hiring by class;
   - regions and standing orders (composition);
   - dispatch, travel and seeded resolution (haul, wounds, deaths, Blight);
   - healing;
   - appraisal throughput;
   - the vault's Blight and penance;
   - forage (click).
3. Ledger UI:
   - flow readout and Blight meter;
   - standing orders with ±1 composition and projected outcome;
   - roster and recruiting;
   - operations board;
   - ledger (log);
   - hall upgrades.
4. Upgrades and buildings (Hospice, Chapel, Appraisal House, Barracks), the Quartermaster automation line, and the Act I ledger entries.
5. Captains (named veterans with corruption), Acts II–IV, turned hands, the archive.
6. Endings, charter renewal, Renown and Grace, a pacing bot and tuning.
7. PWA for the second app, iPhone e2e, and a real-device pass.

## Status (2026-10-19)

| Step | Status |
|---|---|
| 1. Shared engine extraction and a multi-page build | done: `src/shared/` (format, rng, save system, store, log, pixels, flow, monitor, log view, sprite kit, dom). DEEP CONTRACT binds them. `tests/architecture.test.ts` enforces the boundaries. |
| 2. Company simulation | done: `src/forest/company.ts` |
| 3. Ledger UI | done: `src/forest-ui/`, at `/forest/` |
| 4. Upgrades, Quartermaster automation, Act I ledger entries | next |
| 5. Captains, Acts II–IV, turned hands, archive | |
| 6. Endings, renewal, pacing bot and tuning | |
| 7. PWA for the second app, CFG (settings, export/import, reset), real-device pass | e2e on desktop and iPhone emulation done; PWA and CFG still to do |

As-built notes:
- **Units:** one relic sells for one thaler. Wages are about 0.05–0.1 thalers per second per hand.
- **Calendar:** a game day is 24 minutes (one "bell" per minute).
- **Displayed income** counts the vault as selling down over a minute, so COFFERS shows a steady figure rather than a momentary one.
- **Numbers** are first guesses, and the Eaves yield has been raised once by hand. They need the pacing bot (step 6) before they can be trusted.
