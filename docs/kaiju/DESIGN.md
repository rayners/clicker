# DOWN THERE — design

Named by the user on 2026-10-21 ("something like Down There"). The code, the save key (`fathom.save`) and the telemetry `game` property keep the working title FATHOM, so nothing saved or charted changes.

The fourth game in the repo, beside DEEP CONTRACT (sci-fi), CHARTER OF THE ELDERDARK (fantasy) and LATE FEES (slashers). It is a monster-movie idle and management game. It was requested on 2026-10-21.

The influences are *Pacific Rim* and the Godzilla films at the top end, and the deep-water films on the way down: *Jaws*, *Deep Blue Sea*, *The Meg*, *The Abyss* and *Underwater*. As with the other games, these are homages: names, places and creatures are our own.

*Tagline:* **The deeper you look, the bigger it gets.**

## Decisions (user, 2026-10-21)

- **Depth is the progression.** The run starts on the coast with sharks, squid and octopus, goes deeper into bigger things, and ends with kaiju coming up out of a breach in the trench and mechs built to fight them.
- **It is its own game**, the fourth door on the picker. The ocean is its spine. DEEP CONTRACT may later get one *Underwater*-style scenario of its own (a mining station on an ocean moon), but the monster game is the main home for the deep.
- **Build order:** after LATE FEES's Candy Corn Day tape, before DEEP CONTRACT's salvage.

## 1. The frame

**You** run **Harrow Point Marine Safety**, a small contractor that keeps a resort town's beaches open. It has a lifeguard tower, two boats and a shark net. Over the run the outfit becomes a research station, then a deep-sea operation, and finally the front line of a coastal defence corps.

## 2. Depth zones (the progression)

Each zone opens as the outfit reaches deeper. Like Elderdark's regions, a zone keeps paying, and keeps biting, after the next one opens.

| Act | Zone | Depth | What lives there | What you run | Homage |
|---|---|---|---|---|---|
| I | **The Shallows** | 0–50 m | sharks, jellyfish swarms | beach patrols, nets, spotter towers, the tourist season | *Jaws* |
| I–II | **The Shelf** | 50–200 m | giant squid, octopus, things that take nets | trawlers, sonar buoys, the first research boat | |
| II | **Open Water** | 200–1,000 m | a megalodon-class shark, and things the lab made smarter | a research station with pens, and specimen contracts | *The Meg*, *Deep Blue Sea* |
| III | **The Trench** | 1,000–10,000 m | abyssal things, and the source | a pressure station on the trench wall, with hull integrity, crush depth and slow evacuation | *The Abyss*, *Underwater* |
| IV | **The Breach** | below the trench floor | **kaiju**, one category at a time | coastal defence: walls, cities as held ground, and **Bulwarks** (piloted mechs) | *Pacific Rim*, Godzilla |
| V | **Closing the Breach** | the way down | | the ending choice | |

## 3. Economy and balancing (per zone, each adding a lever)

- **The Shallows:** the tourist season is the income. Closing beaches is safe but costs the money. Nets and patrols cost upkeep. This is the *Jaws* mayor's dilemma: **open beaches against attacks**.
- **The Shelf:** fishing licences and salvage. Sonar coverage and trawler wear. Squid and octopus wreck gear rather than people, so the dial is **coverage against upkeep**.
- **Open Water:** the research station sells specimens and data to the parent company. Pens hold specimens, and smarter specimens pay more and escape more. The dial is **research yield against containment**, a cousin of DEEP CONTRACT's containment that is deliberately more visible.
- **The Trench:** a pressure station. Going deeper pays more, and hull integrity falls with depth and time. Repair crews and pressure hulls are the brake. The dial is **depth against integrity**, and a breach floods modules.
- **The Breach:** coastal cities are **held ground** (the shared engine `src/engine/ground.ts`). Kaiju attacks push cities back. Walls hold a city cheaply until a bigger category comes. **Bulwarks** are expensive and need **paired pilots**, who must be compatible (a "link" rating, the drift homage). The dial is **walls against Bulwarks**, and pilots against fatigue.

Every lever is shown on a flow readout (catch ▸ process ▸ income, then later defence ▸ damage ▸ income), the same as the other games.

## 4. Acts and story

The horror is **visible early but small**. The arc is scale, not reveal.

- **Act I: The Season.** Shark sightings, a closed beach, a town council that wants it open.
- **Act II: Something Bigger.** Gear lost to squid. A shark too big for the nets. The company's lab has been "enhancing" specimens.
- **Act III: The Trench.** The station finds the source. It is not a cave.
- **Act IV: Category I…** The first kaiju makes landfall. Each one after is a category bigger.
- **Act V: Closing the Breach.** The endings are close it (lose the research), study it (the company's choice), or go through it (rare, later runs).

Pacing targets: Act II around 45–60m, Act III around 2–2.5h, Act IV around 3h, and the ending around 4–5h. They are tested with a bot like the other games.

## 5. Prestige

Each run is the next **season**. What carries over is **Reputation** (contracts pay more) and **Field Notes** (cheaper defences, earlier sightings). Kaiju categories escalate across seasons.

## 6. Look

- **Early acts:** a sonar and depth-gauge interface. Deep teal and cyan on black, a sweeping sonar ring, and depth readouts. It is a cousin of DEEP CONTRACT's green terminal, but underwater.
- **The kaiju acts:** a shift toward a tokusatsu-poster style, with red and yellow warning palettes, bold display type and alert klaxons (sound off by default).
- **Pixel art:** a lifeguard tower, a fin, a squid, a station, a Bulwark, and a kaiju silhouette per category.
- **Phone first**, like everything else: one-tap dials, and 44px targets.

## 7. Later: play as the horror

Play **the kaiju**, using the shared hunt engine (`src/engine/hunt.ts`). Several coastal cities, each running its own defence through its bot, are the prey. You pick where to surface. This is the same pattern as the Killer's Cut, the wood and the creature.

## Architecture

- It follows Elderdark and LATE FEES. `src/fathom/` holds the pure simulation (no DOM, clock or `Math.random()`), `src/fathom-data/` the content, and `src/fathom-ui/` the shell. It has its own page, save key, manifest and picker door.
- The architecture test gains a `fathom` area that may import only `src/engine/`.
- **The name** is DOWN THERE. The page lives at `/down-there/` and has its picker door.

## Build order (each step test-first)

1. **The Shallows** (`src/fathom/`): the outfit, the tourist season, opening and closing beaches, nets, patrols and sharks. This is the playable core and the first act.
2. **The Shelf and Open Water:** trawlers and sonar, squid and octopus, the research station, pens and containment.
3. **The Trench:** the pressure station, hull integrity and crush depth.
4. **The Breach:** coastal cities on held ground, kaiju by category, walls and Bulwarks with paired pilots.
5. **Story, acts, endings and seasons** (prestige), with saves and migrations.
6. **The shell:** the sonar look, the page, its manifest and the picker door. This waits for the name.
7. **Pacing bot, telemetry and dashboard tiles, e2e.**

## Status

- **Built (simulation, 2026-10-21):** steps 1–5 and the pacing bot.
  - **Code:** `src/fathom/` (`shallows`, `shelf`, `open-water`, `trench`, `breach`, `story`, `season`, `game`, `store`, `save`, `bot`) and `src/fathom-data/`.
  - **Pacing (bot, seed 7):** act 2 at 1h04, the source at 2h11, the first landfall at about 2h51, the season's end at about 4h06.
  - **Opening depths (story scale):** the Shelf at 100 m, Open Water at 500 m, the Trench at 2,000 m. Act 2 is at 1,000 m. Act 3 is at 3,200 m, once the station sits at notch 8 (the source).
  - **Zones feed each other:** escaped specimens add pressure on the beach until they swim off.
  - **Deviation:** walls and Bulwarks hold the coast like garrisons, and spare force retakes fallen cities. Pilots are paired two per Bulwark.
  - **The link (built 2026-10-21):** every pilot draws a temperament (0–1) from the season's seed when hired. The station pairs the closest temperaments first, and a pair's link is 1 − 2 × the gap between them (never below 30%). A Bulwark holds its 50,000 times its pair's link, and the best pairs take the cockpits. The corps tires while most pairs are crewed (with every pair in a cockpit, empty to exhausted in 30 minutes) and rests while pairs sit in reserve (exhausted to fresh in 10 minutes with nobody crewed); exhaustion halves what the Bulwarks hold. More pilots buy both better pairings and rotation, which is the pilots-against-fatigue dial. Save v2 gives older pilots one shared temperament, so they link perfectly.
- **Built (screen, 2026-10-21):** a sonar console, now at `/down-there/`.
  - **Code:** `src/fathom-ui/`, with `sonar.css` (cyan on deep teal, switching to a red and yellow alarm palette in act 4), `down-there/index.html`, `src/fathom-main.ts`, `public/down-there/` (manifest and fin icon).
  - **Telemetry:** `zone_reached`, `act_reached`, `landfall`, `season_completed`.
  - **Not yet on the picker:** it gets a door once it has a name.

## Open questions (for the user, before building)

1. **The name** (done): DOWN THERE.
2. **One continuous outfit across all five zones, or a run per zone?** The design assumes one continuous run per season.
