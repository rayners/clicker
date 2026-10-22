# New missions (design, 2026-10-20)

Four new missions, approved by the user on 2026-10-20:

- **Elderdark:** the Keep.
- **DEEP CONTRACT:** security detachment (marines), haulage (space truckers), salvage.

Two decisions shape them:

- DEEP CONTRACT is an intentional homage to the *Alien* films. Marines, a towed refinery, a beacon and a sealed crate are all fair game, but names stay our own.
- Clearing ground is shared between the games. Marines taking a colony room by room and a company taking a castle floor by floor both run on the same engine.

Every mission must give the player a different **balancing problem** (the user's favourite part, "the paperclip game in a good way") and a visible cause and effect for every purchase. Missions are not reskins.

## 1. The shared engine: held ground (`src/shared/ground.ts`)

Pure functions, no game imports. A **site** is an ordered list of **sections**: rooms, decks, buildings or floors. Each section has a definition and a state.

```ts
interface SectionDef {
  id: string;
  name: string;
  /** Force needed to take it, and the force needed (in garrison) to keep it. */
  threat: number;
  /** Control lost per second while it is held by less than its threat in garrison. */
  reclaim: number;
}

interface SectionState {
  /** 0 = lost, 1 = secured. */
  control: number;
  /** Force stationed here (troopers, hands, sentry guns). */
  garrison: number;
}
```

- **Taking ground.** `assault(state, def, force, seconds)` raises control at a rate set by force over threat, and returns the attackers' exposure (the game turns that into wounds, deaths or ammunition spent). Elderdark applies it per expedition when a party returns; DEEP CONTRACT applies it continuously each tick.
- **Order.** Sections are ordered. The **frontier** is the first section not yet secured, and you can only assault the frontier. That is the room-by-room or floor-by-floor feel.
- **Holding ground.** `tickGround(states, defs, dt, pressure)`: a secured section stays secured only while its garrison covers its threat. Otherwise control drains at `reclaim × pressure`. A section that falls below a threshold is **lost**, and the frontier moves back to it.
- **Pressure** is the hook horrors use, so it is where the dread lives. `pressure = 1` is mundane: looters, rats, floodwater, the cold. A horror raises it. In DEEP CONTRACT it comes from a new `HorrorDef.pressure(m)`, read through `horrorPressure(m)` the same way `horrorProductionMultiplier` works. In Elderdark it comes from blight and the waking wood. No horror code knows what a section is.
- **Reporting.** `held(states)`, `frontier(states)`, and `upkeep(states)` (total garrison). The UI shows the site as a strip of sections: secured, contested, lost, or the frontier.

The core trade-off is identical in both games and is the point of sharing it: **every body holding ground is a body not taking more**. Push too far without garrisons and the rear rots away behind you.

## 2. DEEP CONTRACT: security detachment (`scenario: 'security'`)

**Premise.** The USCSS-style transport *Bellwether Ascent* carries a Combine Security Division detachment to the colony at **Calder's Landing** on LV-1201. The colony has "experienced a communications outage". WARDEN runs the ship, the cryo bay and the tactical uplink. The Combine pays a retainer for every colony sector restored to company control.

**Economy**
- **Income:** credits per secured sector per second (the colony back on the books), plus recovery bonuses for clearing each building the first time.
- **Troopers**, thawed from cryo:
  - **riflemen**, the force;
  - **smartgunners**, high force and heavy ammunition use;
  - **medics**, who cut casualties and fatigue;
  - **techs**, who weld doors (raising a section's hold) and run sentries.
  - The seven named crew stay as the officer cadre and keep their scenario boosts.
- **Ammunition** is the second economy. A fabricator makes it, and assaults and sentry guns burn it. Ammunition made against ammunition burned is the Paperclips-style dial; run dry and assaults stall and sentries go silent.
- **Automation:** **sentry guns** are garrison that never sleeps but eats ammunition. Then the **APC** (an assault force that doesn't tire) and the **dropship** (faster reinforcement, sorties).
- **Readiness:** troopers on the line tire, and rotating them back to cryo costs time. The medic's `fatigueRelief` applies, as it does in every scenario.

**Site.** The colony is a ladder of about 14 sections:
1. landing pad;
2. operations block;
3. hydroponics, then the mess, then the dormitories;
4. medlab;
5. the motor pool;
6. the processing annexe;
7. sub-levels, down to the atmosphere processor at the bottom.

**Signals.** `progress` is sectors secured, scaled to the shared story scale. `deepAccess` means the sub-levels are reachable.

**Story**
- **Act I** is pest control and paperwork. Looters, structural damage, and feral livestock from the hydroponics farm. The Combine adds cheerful memos about "property recovery".
- **Act II tells**, each with a mundane excuse:
  - meals left on the mess tables;
  - barricades welded shut *from the inside*;
  - the colony's tracking bracelets all reporting from one place;
  - a child's drawing taped to a hatch.
- With the **organism** horror, pressure climbs in the sub-levels first, and the motion tracker finally earns its place. With the **quiet** horror, the colony simply froze, and pressure stays mundane.

**Stakes** at the terminus: the troopers still alive, and any colonists recovered.

## 3. Elderdark: the Keep

**Premise.** **Morrowgate Keep** is a drowned castle at the heart of the wood. A charter can be written for the Keep instead of the forest. Thistlegate, the hands, wages, the hospice, the chapel, blight, turning and the Ashen Key all carry over.

**Site split (prerequisite).** Elderdark needs the same split DEEP CONTRACT made for terraforming: a `SiteDef` (forest or keep) that owns progression, plus company-wide systems that work on either site. The forest keeps regions and leagues charted. The Keep uses held ground. Renewing a charter offers a choice of site, as DEEP CONTRACT's contract assignment does. The Keep is available from the start for now, so it can be tried.

**Economy**
- **Floors replace leagues.** Parties assault the frontier floor on expedition. A floor is held only while hands are **garrisoned** there, and garrisoned hands draw wages and blight but never travel.
- **Lamp oil** is the second economy. It is bought in town, and every floor deeper costs more per trip. A party whose oil runs out mid-delve takes heavy losses. The dial is oil bought against oil burned, and depth against cost.
- **Relics** come from floors as they are cleared, and as a trickle from held floors (the castle's stores, its tombs).
- **Sappers** are a new hand for this site only. They clear traps and flooded stairs, which lowers a floor's threat on the first assault.

**Horror.** The Keep's old lord is still in residence. Blight raises pressure on held floors, and a floor garrisoned too long starts keeping its garrison. The hands turn faster there than in the forest. The Key fragments lie in the undercroft.

## 4. DEEP CONTRACT: haulage (`scenario: 'haulage'`)

**Premise.** The commercial tug *Halvorsen Gale* tows a refinery train home along a chain of stations. It is the most purely "slow burn" mission: nobody is here to fight anything.

**Economy**
- **Income:** deliveries at each station, with bonuses for beating the delivery window.
- **The burn dial:** thrust setting against fuel against cargo strain. Burning hot makes windows but drinks fuel and shakes cargo, and damaged cargo pays less. Fuel is bought at stations. Adding **tow cars** means more cargo and more pay, but more mass and slower acceleration.
- **Crew** sleep in rotating cryo shifts, and watches tire people faster here than in any other mission.
- **Automation:** an autopilot that holds the burn at a target, then drone loaders at stations, then a navigation computer that plans the windows.

**Signals.** `progress` is legs completed. `deepAccess` means the company has ordered a detour to answer a beacon, which is mandatory under the contract.

**Story**
- **Act I:** union grumbling and the share schedule.
- **Act II tells:**
  - a sealed container the Combine insists on;
  - the manifest's mass drifting by a few kilograms each leg;
  - frost on the inside of one car.
- With the organism horror, the cargo is the specimen.

## 5. DEEP CONTRACT: salvage (`scenario: 'salvage'`)

**Premise.** The Combine Salvage Division tug *Corvid Tithe* has claimed a derelict: the colony transport *Aurelian Gift*, lost thirty-one years ago with 2,400 colonists in cryo, found drifting with her running lights on. Strip her compartment by compartment, from the bow airlock aft to the sealed cargo hold and the drive core. Salvage rights are worth a fortune; the Combine's lawyers are already disputing the insurers'.

**Economy** (held ground again: compartments are sections, threat is structural load)
- **Cutters** (cutting crews, then rigs, drones, the tug's own lance) are the force. They all cut at the frontier compartment; there is no split.
- **Shoring** (bracing frames, then foam, then a spine truss) is the garrison. An opened compartment needs bracing equal to its load or it buckles back shut (held ground's drift). Shoring is posted from the airlock aft, and it costs more each time faster than cutters do, so it is the brake (as ammunition is for security).
- **Income:** cutting into a compartment for the first time pays its salvage as the torch goes in (so a faster cut earns more per second), and every opened compartment that stays open is stripped for a steady rate.
- **The torch dial** (notch 1–10, the safe line 5). Each notch cuts 20% faster or slower. Above the safe line the derelict's hull takes **stress**, a visible gauge; at or below it the stress bleeds off. Full stress is a **breach**: the frontier compartment vents, its progress is lost, and it is sealed for a minute before anyone can cut there again. Upgrades raise the safe line.
- **The button:** CUT, a second of torch on the frontier at the dial's notch.
- **Automation:** WARDEN's cutting pulse (automatic cuts), then the **hull governor**, which runs the torch at the highest notch the stress allows and backs off before a breach (and can be taken back), then stripping drones (strip rate multipliers).

**Signals.** `progress` is salvage recovered on the shared story curve. `deepAccess` comes once the sealed cargo hold is open.

**Story**
- **Act I:** salvage law, the lawyers' memos, the crew's share schedule, the bow still pressurised after thirty years.
- **Act II tells,** each with a dull explanation:
  - the cryo bay's pods are open and empty (an orderly evacuation, the log says, though there is no record of where to);
  - the galley's emergency rations eaten down to the last tin, thirty years ago or less (a long wait for rescue);
  - scratches on the inside of a cargo hold hatch (cargo shifting under thrust).
- **With the organism horror,** the hold is where the colonists went.

**Endings** (lexicon): deliver = tow the *Aurelian Gift* home with the hold sealed; scuttle = cut her drive core loose and let it burn.

**Missions it shares with:** held ground (`src/shared/ground.ts`), the sector column (`src/ui/site.ts`, generalised to take any run of sections), the organism horror's `pressure` hook.
## As built (2026-10-20)

**1. Held ground: done** (`src/shared/ground.ts`, `tests/shared/ground.test.ts`). It differs from the sketch in two ways, both found by the pacing bot:
- **Contested sectors.** A secured section has a `secured` flag. It stays held, and keeps paying, while it slips; it is lost only when control falls below `LOST_BELOW` (0.5). A full garrison wins contested ground back. Without this, an unguarded sector stopped paying the instant it dipped below 100%.
- **The frontier is left to the assault.** The section under assault does not also drift back. Otherwise drift and assault cancelled out exactly, and the marines stalled at the sub-levels.

**2. Security detachment: done.**
- **Code:** `src/mission/security/`, `src/data/security/`, `src/ui/scenarios/security.ts`, `src/ui/split.ts` (the assault/line split), `src/ui/site.ts` (the sector column).
- **Debug jumps:** `?debug=security` and `?debug=sec-act2`.
- **Pacing (bot):** Act II 59m, Act III 2h31m, Act IV 2h56m, terminus 4h11m.
- **Sentry guns are holding force,** not whole sectors. Each adds a fixed garrison that burns ammunition, and three requisitions multiply it. The first version gave each gun a whole sector, most dangerous first, and the bot took the colony in 90 minutes.
- **The economy mirrors terraforming's,** to keep pacing predictable. Troopers use the processor ladder and fabricators the reactor ladder. Threat triples per sector, and the retainer is 0.75 credits per second per point of threat held. WARDEN's tactical net (auto-split) is the load balancer's counterpart, and it can be overruled the same way.
- **The organism horror** raises `pressure` through the new `HorrorDef.pressure` hook: +1 once loose (act 4), and +0.5 per contact.

**3. The Keep: done** (2026-10-21).
- **Code:** `src/forest-data/keep.ts` (twelve floors, from the gatehouse to the undercroft), the Keep section of `src/forest/company.ts`, `src/forest-ui/keep.ts`, and `decideKeep` in `src/forest/bot.ts`.
- **The site split is lighter than sketched.** There is no `SiteDef` abstraction. A company has a `site` (`'forest' | 'keep'`), and a Keep company also carries `floors` (held ground), `posted` (blades per floor) and `oil`. The forest's regions and the Keep's single assault order (`KEEP`) share the dispatch, resolution and projection code: a floor is projected as if it were a region.
- **How it plays:**
  - A returning party pushes the frontier floor by `FACE_SECONDS` at its strength.
  - Taking a floor sets the delve (`charted`) to that floor's `leagues`, so the shared story and acts still work.
  - Posted blades garrison a floor. They draw wages, never travel, and turn twice as readily at high blight (the Keep keeps its garrison).
  - Pressure on short-handed floors is `1 + blight/40`, plus 1 once the wood wakes.
  - Held floors pay stores of about half a matched party's relic rate.
  - Lamp oil is bought in town. A party short of oil goes into the dark, with more wounds and deaths. The Quartermaster buys a full lamp before sending.
  - Fragments come from the drowned stair down, each one rarer than the last (×0.8).
- **Choosing a site:** at the reckoning, or by tearing up the charter in hand from the configuration (nothing is earned for it). The Keep is available from the start while it is play-tested.
- **Debug jumps:** `/forest/?debug=keep` and `?debug=keep-deep`.
- **Telemetry:** `floor_secured`, and `site` on every Elderdark event.
- **Saves:** Elderdark save v8.
- **Pacing (bot, seeds 1/7/42):** Act II 46m–1h, Act III 2h30–2h52, Act IV 2h52–3h57, terminus 4h07–5h12.
- **Not built yet:** sappers (a Keep-only hand that lowers a floor's threat on the first assault), and the old lord as a presence beyond the story beats.

**4. Haulage: done** (2026-10-21).
- **Code:** `src/mission/haulage/`, `src/data/haulage/`, `src/ui/scenarios/haulage.ts`, `src/ui/helm.ts` (the burn dial, tanks and autopilot), `src/ui/route.ts` (the next station, the leg, the window and the freight's condition) and `src/ui/haulage-systems.ts`.
- **How it plays:**
  - Speed is thrust over the train's mass, at the burn notch (1–10). Engines add thrust; cars add freight value and mass. Better cars carry a little more value for their weight (1 rising to 2.5).
  - Freight pays by the kilometre as it moves. A delivery inside its window adds 50% of the leg's earnings at the station.
  - Fuel burns with the square of the burn, so a hot burn costs more per leg. Past the strain line (6, raised by upgrades and Kane) the freight takes damage and pays less.
  - Fuel is bought at stations. Under way, a fuel tender costs three times as much. A dry train coasts at half the gentlest burn's speed, so it is never stranded.
  - Legs lengthen by 1.6× and windows by 1.3×.
- **Automation:** WARDEN's pulse timer fires the manoeuvring thrusters. Drone loaders refuel at every dock. The autopilot picks the notch that earns most per second (the window bonus, the fuel bill and the time all weighed), and the player can take it back.
- **Deviations from the sketch:**
  - Pay accrues continuously rather than as one payment per delivery. Lump deliveries left hour-long gaps with no income, and paid cars coupled just short of a station for the whole leg.
  - Haulage has its own progress curve (`PROGRESS_SCALE` 3.82, exponent 3.12) instead of extraction's, because freight revenue compounds differently.
  - Crew watches don't yet tire faster than in other missions.
- **The beacon:** the leg to THE BEACON (the ninth station) is the obliged detour. Past it the story has deep access.
- **Debug jumps:** `?debug=haulage` and `?debug=haul-act2`.
- **Telemetry:** `leg_completed` (station, legs, onTime, minutes).
- **Saves:** there is no saved-shape change for existing contracts, so no migration.
- **Pacing (bot, seed 7):** Act II 55m, Act III 2h43, Act IV 2h52, terminus 4h07. An 8-hour catch-up takes about 0.3 s.

**4b. The overland haul: done** (2026-10-21, user's idea: "land is a good lower/quicker level").
- **What it is:** a short contract (an hour or so) and the first one offered. A crawler rig hauls trailers along the lift road, from the mine through ten depots to Port Kessler Lift. Reaching the lift opens the terminus, and the one ending is the promotion to the long haul (+1 seniority).
- **How:** it runs on the haulage rules. `src/mission/haulage/profiles.ts` holds each haul's fleet, route, pay and fuel (`SPACE_HAUL`, `LAND_HAUL`), and `haulScenario` builds both scenario definitions. Overland data lives in `src/data/overland/`, and on-screen words in `src/ui/haul-words.ts` (throttle, gun the engine, fuel truck, hitch).
- **No horror:** it runs under the quiet horror, which now has one ending (deliver) worded by the scenario's lexicon. `availableEndings` offers only the endings a contract's horror has words for, so every other contract is unchanged.
- **Debug jump:** `?debug=overland`.
- **Pacing (bot):** terminus at 1h14, never leaving act 1.

## Build order

1. **Held ground** in `src/shared/ground.ts`, test-first, with no game attached.
2. **Security detachment**, built on held ground. DEEP CONTRACT already supports scenarios, so this proves the engine with the least refactoring. It adds the `HorrorDef.pressure` hook.
3. **Elderdark site split, then the Keep**, which reuses held ground in the other game. (Done.)
4. **Haulage.** (Done.)
5. **Salvage.** (Designed 2026-10-21; being built.)

Each mission ships with:
- its own pacing bot run inside `npm run simulate`, with the same act targets: Act II 45–60m, Act III 2–2.5h, Act IV around 3h, terminus 4–5h;
- telemetry events added where a milestone matters (`sector_secured` and `floor_secured` at least);
- a debug jump;
- a contract or charter choice;
- a save migration.
