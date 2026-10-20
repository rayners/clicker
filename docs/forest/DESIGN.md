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
| 1. Shared engine and multi-page build | done: `src/shared/` (format, rng, save system, store, log, story engine, lexicon, pixels, flow, monitor, log view, sprite kit, dom). `tests/architecture.test.ts` enforces the boundaries. |
| 2. Company simulation | done |
| 3. Ledger UI | done |
| 4. Requisitions, Quartermaster, Act I | done |
| 5. Acts II–IV, turning, the Ashen Key | done. **Captains** (named veterans) are not built yet; see below. |
| 6. Reckoning, charter renewal, pacing bot | done (`npm run simulate:forest`, `tests/forest/pacing.test.ts`) |
| 7. PWA, CFG, e2e | done: own manifest and icons (`npm run icons`), the shared service worker registered from both pages (verified offline), CFG with export/import/new charter, e2e on desktop and iPhone emulation. A real-device pass by the user is still to do. |

### As built (where it differs from the plan above)

- **The delve is charted, not derived.**
  - Parties returning from a region chart the way toward the next region, and only that far, so the frontier has to be worked.
  - Scouts chart faster; dead hands chart nothing.
  - An always-visible **map strip** shows progress toward the next region (user feedback: "not quite seeing what leads to deeper delves").
- **The Armoury:** strength scales by equipment (×1.5 per level, costing ×2 per level), not by headcount. Hire costs grow 15% per hand while danger grows about 5× per region, so headcount alone stalled every bot run at the Barrows.
- **Quartermaster:** standing regions send a party each tick while rested hands allow, **deepest first**. Otherwise older regions starve the frontier.
- **Blight with teeth:**
  - Above 40%, rested hands *turn*: they leave the roster, and each turned hand makes every region 3% more dangerous.
  - The chapel eases only 0.006% per second per level, and deep regions carry heavy Blight, so penance and Mystics matter.
- **The Ashen Key:**
  - Fragments come only from the Undercity (20% per returning party) and the Heartwood (35%).
  - Holding fragments raises Blight.
  - The first fragment opens Act III. Three open Act IV: the wood wakes and danger rises 1% a minute.
  - The Terminus comes at seven fragments, or 75 minutes after the wood wakes.
- **Endings:** sell (Renown, +25% haul each), return (Grace: Blight ÷(1+0.2g) and healing ×(1+0.25g)), and burn (both; needs 3 charters and Grace 3).
- **Pacing (bot, 3 seeds):**
  - Hollows ~6m.
  - Barrows / Act II ~55m.
  - Thornmaze ~1h25m.
  - Undercity ~2h20m–2h58m.
  - Act III ~2h37m–3h11m.
  - Act IV ~3h–3h36m.
  - Terminus ~3h40m–4h15m.
  - The Heartwood is usually not reached before the reckoning; it's optional, a place for later charters.
- **Units and timing:** one relic sells for one thaler, and a game day is 24 minutes.

### Next / backlog

- **Captains:** named veterans who lead parties, carry their own corruption, and can turn (the crew analogue).
- **Archive:** readable documents: the charter, the Synod writ, old ledger pages, the Collegium's letters.
- **Sound:** quill scratch, a bell, the vault's note.
- **Mechanical teeth for Act IV beats:** the audit burning hands, assaults on the palisade.
- **A real-device pass** on iPhone Safari, in the browser and installed.
