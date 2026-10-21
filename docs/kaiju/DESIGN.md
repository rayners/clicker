# FATHOM (working title) — design

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
- **The Breach:** coastal cities are **held ground** (the shared engine `src/shared/ground.ts`). Kaiju attacks push cities back. Walls hold a city cheaply until a bigger category comes. **Bulwarks** are expensive and need **paired pilots**, who must be compatible (a "link" rating, the drift homage). The dial is **walls against Bulwarks**, and pilots against fatigue.

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

Play **the kaiju**, using the shared hunt engine (`src/shared/hunt.ts`). Several coastal cities, each running its own defence through its bot, are the prey. You pick where to surface. This is the same pattern as the Killer's Cut, the wood and the creature.

## Architecture

- It follows Elderdark and LATE FEES. `src/fathom/` holds the pure simulation (no DOM, clock or `Math.random()`), `src/fathom-data/` the content, and `src/fathom-ui/` the shell. It has its own page, save key, manifest and picker door.
- The architecture test gains a `fathom` area that may import only `src/shared/`.
- The final name is to be decided with the user before the page and save key are fixed. FATHOM is a placeholder.

## Open questions (for the user, before building)

1. **The name.** Candidates: FATHOM, DEEP WATER, BREACHWATER, CRUSH DEPTH.
2. **One continuous outfit across all five zones, or a run per zone?** The design assumes one continuous run per season.
