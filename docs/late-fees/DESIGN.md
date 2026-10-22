# LATE FEES — design

The third game in the repo, beside DEEP CONTRACT (sci-fi) and CHARTER OF THE ELDERDARK (fantasy). It is a modern-day idle and management game built on homages to the slasher classics. It was requested on 2026-10-20.

*Tagline:* **Every tape comes back. So does everything on it.**

## Decisions (user, 2026-10-20)

- **Role: you run the place.** You are the camp director, the sleep clinic's administrator, or the insurer's claims manager, keeping the business open while people die. **Playing as the horror is an unlockable higher tier**, the counterpart to DEEP CONTRACT's planned Boardroom promotion (section 7).
- **Structure: one game, three scenarios.** You choose a tape per run. Money, the franchise and prestige are shared.
- **Look: VHS and video store.** A rental shelf as the menu, tracking lines, a VCR's on-screen display, neon on black, a red REC dot.
- **Prestige: sequels.** Each run is the next film: *Part II*, *Part III*, *The Final Chapter* (it never is). The horror always comes back stronger. You carry over franchise money and what you learned.
- **The horror is obvious.** There is no slow burn. The opening kill comes in the first minutes. The story arc is body count, the survivors working it out, and the final confrontation.
- **Homage, not copies.** Titles are parodies and names are our own.

## 1. The frame: Late Fees Video

The game opens on the shelf of **Late Fees Video**, a strip-mall rental store, around 1988. Each scenario is a tape. Picking one starts a run, with the VCR's on-screen display (PLAY ▶, the tape counter as the run clock, TRACKING) over the game. Finishing a run puts the sequel on the shelf, with a new spine and *PART II* in the title.

## 2. Architecture: venues × killers

As in DEEP CONTRACT (scenario × horror), a run is a **venue** (where you work and what the business is) paired with a **killer** (what hunts there).
- A killer knows a venue only through **signals** (story progress, how exposed people are) and the venue's **lexicon** (`{victims}`, `{refuge}`, `{place}`).
- A venue knows a killer only through **pressure** and a **death hook**.
- The three films are the default pairings. **Crossovers** (the dream stalker at the camp, Death's design at the clinic) unlock through sequels. That is very much in the spirit of the genre, and it keeps us honest about coupling.

Code layout, following Elderdark:
- `src/late-fees/` is the pure simulation, with the same rules as missions: no DOM, clock or `Math.random()`.
- `src/late-fees-data/` holds content.
- `src/late-fees-ui/` is the VHS shell.
- The page is `late-fees/index.html`, with save key `latefees.save`, its own manifest, and a third door on the picker.
- The architecture test gains a `late-fees` area that may import only `src/shared/`.

## 3. The three tapes

### FRIDAY THE 12TH: Camp Blackwater

**You:** the director of Camp Blackwater Lake, reopened by new owners twenty years after "the drowning".

- **Income:** enrolment. Campers pay per session, and more campers means more money.
- **Held ground** (the shared engine). The camp is a run of zones from the front gate out to the far shore: the mess hall, cabins 1–8, the archery range, the boathouse, the lake, the old campsite. A zone is **safe** while it is lit and supervised. Campers only fill safe zones, so held zones cap enrolment.
- **Counselors** are the force that supervises zones. They are hired and paid wages, and they wander off: the genre's rule.
- **Generators and floodlights** are the second economy: fuel bought against fuel burned. A dark zone can't be held.
- **Night falls on a cycle.** At night the killer's pressure climbs. Zones slip into the dark, campers in lost zones die, and every death costs **reputation**, which slows enrolment.
- **The balance:** more campers pay more but stretch supervision, light costs fuel, and nights get longer each act.
- **The killer** is **the Drowned Boy**, now a man in a welder's mask, who never runs and is always there.
- **Click:** BLOW THE WHISTLE. It calls a head count that pulls campers back into safe zones and briefly raises supervision.

### A NIGHTMARE ON SYCAMORE STREET: the Sycamore Street Sleep Clinic

**You:** administrator of a sleep-research clinic with a grant from a pharmaceutical company.

- **Income:** study data. Patients earn money for every hour they sleep, and deep (REM) sleep pays most.
- **The REM dial:** the share of patients allowed into deep sleep, in one-tap steps. Deep sleep pays more and is where **the Burned Man** walks. A patient who dies in a dream dies in the bed.
- **Keeping people awake** is the second economy:
  - **stimulants** (coffee, then pills, then an IV), which keep patients from dreaming;
  - **exhaustion**, which builds the longer a patient stays awake, until they microsleep, uncontrolled and unmonitored, the most dangerous state of all.
  - **Dream suppressant** is the rare drug that blocks dreaming safely. It's in short supply, and the grant-holder wants it rationed.
- **Lucid-dreaming training** lets patients fight back in the dream, which lowers pressure. It's expensive, and it works.
- **The balance:** sleep against wake against exhaustion. It is the most Paperclips-like tape, with a dial, a stockpile and a decay.
- **Click:** WAKE THEM UP. It shakes the patients nearest the danger out of REM.

### PENULTIMATE DESTINATION: Providence Mutual (built)

**You:** the claims manager at Providence Mutual Life, the morning after a teenager's premonition pulled forty people off **Flight 213** before it fell.

- **Income:** premiums. You sold every survivor a policy, a bold underwriting decision. More policies bring more premium and more exposure.
- **Death's design** works down **the list**, in the order the survivors would have died. Each survivor builds **omens** (a loose bolt, a dripping tap, a gust of wind). At full omens, an "accident" happens and you pay out.
- **Interventions** are the second economy:
  - **inspectors**, who break chains of omens;
  - **bodyguards**, who stand watch;
  - **risk analysts**, who show you who is next.
- Saving someone **skips** them: the design moves to the next name and comes back around later, angrier (pressure).
- **The balance:** premiums against payouts against the intervention budget, under fate pressure that rises with every cheat.
- **Click:** CHECK THE LIST. It reveals the next omen chain and breaks the weakest link.

### CANDY CORN DAY: Grayhaven State Hospital (built 2026-10-21)

A *Halloween* homage. The user's decisions: you run the hospital, and the date matters. The film is set on **National Candy Corn Day**, a real day (October 30th, the eve of Halloween), so everyone in town is in costume and escapees blend into the crowd.

*Tagline:* **The night he came home. A day early.**

**You:** the superintendent of Grayhaven State Hospital, a county asylum on the hill above Millbrook, on budget and short-staffed.

- **Income:** state funding per patient housed. More beds filled means more money, and more patients to watch.
- **Wards** run from the open wards up to the secure wing. Each ward has patients, **orderlies** (the force), and **agitation**, which rises over time and faster at night. A ward whose agitation tops out has an **incident**: a patient gets out.
- **Sedation** is the dial, in one-tap steps (the clinic's REM dial counterpart). Heavy sedation keeps agitation down, but the **state inspector's** rating falls, and a low rating cuts funding. Light sedation keeps the inspector happy and the wards restless.
- **Locks and doors** are the upkeep economy. Security doors and keycards slow escapes, and they need maintenance or they fail.
- **Escapes:** an escaped patient is loose in Millbrook. Search teams find them, slowly. Every patient still loose when Candy Corn Day comes is hidden in a town full of costumes.
- **The clock** counts down to Candy Corn Day. Act III begins on the day itself: the town fills with costumes, search teams find escapees far more slowly, and **the Patient** walks out.
- **Click:** WALK THE WARDS. It calms the most agitated ward for a moment.

**The killer: Patient 10-30** (his ward and bed number, and the date). A white mask, silent, who walks and never runs.
- His mechanic is **inevitability**. Pressure never resets: locks, orderlies and search teams only delay him. He always comes back for the one who got away, his chosen survivor, across sequels too.
- **Crossovers** follow the existing rules: Patient 10-30 at the camp, the clinic and Providence Mutual, and the Drowned Boy and the Burned Man at Grayhaven. He also joins the Killer's Cut (play as the killer).
- **Sequels:** *Part II*, *III: Season of the…*, *H-20 (Candy Corn Day)*, and so on.

**As built (2026-10-21)**
- **Code:** `src/late-fees/asylum/` and `src/late-fees/patient/`; content in `src/late-fees-data/asylum*.ts` and `patient.ts`; screen in `src/late-fees-ui/asylum.ts`.
- **The dial:** sedation stretches each member of staff further and also calms patients directly. The inspector's rating moves toward `1 − 0.7 × dose`, and funding scales with it. The pharmacy protocol sets the lowest dose that keeps every ward calm.
- **Doors are consumables:** a security door absorbs one incident (two or four with deadbolts and steel doors) and is then replaced. That is the upkeep economy, in place of a maintenance bill.
- **Escapes:** at full agitation a patient gets out unless a door holds. An escape can leave a body in Millbrook (scaled by the killer's pressure), and the town doesn't forgive the hill while anyone is still loose. Search teams find escapees at a quarter of the pace once Candy Corn Day arrives.
- **Candy Corn Day:** act 3. The countdown on screen runs with the story scale. After that, Patient 10-30 also claims townsfolk in costume.
- **Patient 10-30's pressure** is `1 + 0.25 per act`, whatever the time of day. He keeps walking even where nobody is asleep.
- **A per-diem (×1.8)** on every bed is the counterpart of the clinic's deep-sleep premium. It was tuned by the pacing bot.
- **Crossovers:** six. The insurer pairing is tuned −0.6, like the other killers there.
- **Telemetry:** `ward_opened` and `patient_escaped`.
- **Pacing (bot):** Act II 1h05, Act III 2h30, Act IV 2h55, credits 4h10.

## 4. Acts (all tapes)

The horror is obvious, so the arc is about escalation, not reveal.

| Act | Pacing | Beat |
|---|---|---|
| I · Opening Kill | 0–45m | Business opens. Someone dies in the first minutes. The owners say it's an accident. |
| II · Body Count | ~45m–2h | Deaths escalate. Town gossip, police who don't believe you, the business still open. |
| III · The Final Girl | ~2–3h | A survivor works out the rules: the lake, the dreams, the list. The tape's special mechanic unlocks (the final girl's plan). |
| IV · The Final Confrontation | ~3–4h | The killer comes for everyone. A big, visible fight for the people left. |
| V · Roll Credits | end | Endings: **Kill it (for now)**, the sequel hook and franchise money; **Sell the story**, the most money with the killer untouched; **Burn it down**, rare, ends the franchise line, and unlocks things. |

Pacing is tested with a bot, the same as the other two games.

## 5. Sequels (prestige)

- Every ending puts the next sequel on the shelf.
- The franchise carries **Box Office** (a permanent income multiplier) and **Lore** (survivors remember: cheaper defences, earlier warnings).
- The killer comes back stronger: each sequel adds base pressure.
- Sequel titles follow the genre's ladder: *Part II*, *Part III*, *The Final Chapter*, *A New Beginning*, *It Lives Again*, *Takes Manhattan*, *In Space*.
- Crossover tapes unlock after a few sequels.

## 6. Look: VHS and video store

- **Colour:** black ground with neon magenta and cyan, a warm white for text, and red for REC and deaths.
- **Texture:** scanline and tracking-noise overlays (disabled with reduce motion), and chromatic fringing on titles.
- **Type:** a VCR on-screen-display mono for the interface, and a neon or slasher display face for tape titles, self-hosted through fontsource like the other games.
- **Pixel art:** tape spines, a welder's mask, a striped sweater and glove, a plane silhouette.
- **Phone first:** the shelf is a horizontal row of spines on a phone and a full shelf on desktop. One-tap steps for every dial.

## 7. Later: play as the horror (unlock)

After enough sequels, the franchise "goes in a new direction": you play **the killer**. It is the Boardroom-style higher tier. You haunt several venues at once, each running headlessly as a first-tier run, picking who to stalk and when, building **Infamy**. This is designed for now and not built. As with DEEP CONTRACT's Boardroom, it imposes architecture rules today: runs are self-contained and serializable, and a run never reads the DOM, the clock or globals.

## As built (2026-10-20)

**Steps 1 and 2 are done.**
- **The page:** `/late-fees/` is a VHS shell with an on-screen display (tape counter, a REC light at night), the horror shelf, the setup menu, the PWA manifest and icon, the picker's third door, and telemetry (`film_started`, `act_reached`, `zone_opened`, `film_completed`).
- **Camp Blackwater with the Drowned Boy.**
  - Built on the shared held-ground engine, with the same proven economy shape as DEEP CONTRACT's security detachment: counselors are the force, lights are the brake, prep against watch is the split, watchtowers are the sentries, and the head counselor is the auto-split. Night falls every nine minutes, for three minutes.
  - Losing a zone kills its campers and costs reputation, which scales takings.
  - The killer takes a counselor about every two minutes of night, faster in acts 3 and 4.
- **The film's arc** (`src/late-fees/story.ts`) is shared by every killer:
  - the opening kill on the first night;
  - the body count at progress 1,000;
  - the final girl at 3,200 with the far shore open;
  - the confrontation 25 minutes later;
  - the credits 75 minutes after that. A red line under the stats counts down to them ("FINAL ACT · CREDITS IN …"), and once they roll it says to choose an ending in CREDITS. A playtest (2026-10-22) took the confrontation for the end and found the film still running.
- **Pacing (bot):** act 2 at 59m, the final girl at 2h27m, the confrontation at 2h52m, credits at 4h07m (`npm run simulate:late`, `tests/late-fees/pacing.test.ts`).
- **Sequels:** Box Office (+25% takings each), Lore (takes back some of the killer's sequel strength), and pressure +15% per part. *Burn it down* unlocks after three films.
**Step 3 is done: the Sycamore Street Sleep Clinic with the Burned Man.**
- **Beds earn grant money.** They use the mining tier ladder, and patient counts stay in the hundreds.
- **The deep-sleep dial.** Deep sleep earns 1.8× light sleep, but only for deep sleepers someone is watching.
  - Night staff tiers (cost growth 1.2) are the brake.
  - Unwatched deep sleepers die at 0.2% per second at pressure 1. Each death costs 3% reputation.
  - Sleep debt builds while the dial sits below 30% deep. Past 100%, patients nod off unwatched.
  - Dream suppressant allocations (×3 cost each) protect 6 patients each.
  - Lucid-dreaming training halves the death rate, three times over.
  - Automated monitoring sets the dial as deep as the watch allows, never below what patients need, and can be overruled.
- **The Burned Man's text** uses only placeholders the camp also supplies, so a crossover is already possible (a test checks this).
- **Pacing (bot):** act 2 at 1h05m, the final girl at 2h34m, the confrontation at 2h59m, credits at 4h14m.
- **The interface** now takes a per-venue UI (`src/late-fees-ui/venues.ts`, `clinic.ts`), the same pattern as DEEP CONTRACT's `ScenarioUi`.
- **Telemetry:** adds `bed_opened`.
**Step 4 is done: Providence Mutual with Death's design (*Penultimate Destination*, renamed by the user from "Final Departure").**
- **Policies earn premiums.** They use the mining tier ladder, scaled ×1.2 because prevention takes a steady cut.
- **The list:** Flight 213's 40 survivors, in seat order.
  - Omens build on the name at the top at 0.014 × premium^0.6, scaled by risk appetite² and by anger.
  - Prevention staff (cost growth 1.2) break omens.
  - If the omens fill: an accident, a death, and a claim (120 seconds of premium, plus a reputation hit).
  - If prevention holds the name for 120 seconds, the design skips them to the back of the list. Each skip makes it angrier by 15% × log2(1 + skips). The first version used 15% per skip, and it ran away.
- **The risk-appetite dial** trades premium (0.5× to 1.5×) against danger (its square). The actuarial mainframe sets it as high as prevention allows.
- **Death's design** adds accidents away from the list every 15 minutes or so. Its text works at the camp and the clinic too (a test checks this).
- **Pacing (bot):** act 2 at 1h09m, the final girl at 2h30m, the confrontation at 2h55m, credits at 4h10m, with about 27 dead and the list never emptied.
- **Telemetry:** adds `survivor_lost`.
- **All three tapes are now in stock.**

**Step 5 is done: crossovers.**
- **Six tapes**, each a killer in another killer's place:
  - *A Nightmare at Camp Blackwater*;
  - *Penultimate Summer*;
  - *Friday the 12th: Checked In*;
  - *Penultimate Dream*;
  - *Friday the 12th: Claims Pending*;
  - *Sycamore Street 4: The Adjuster*.
- They're on the shelf from the start while being play-tested (`CROSSOVER_UNLOCK_FILMS = 0`); they're meant to unlock after a few films.
- **Endings are split:** the killer says how it is stopped (`kill`), and the venue says how the business ends (`sell`, `burn`). Every pairing reads correctly, and a test checks all nine combinations for unfilled placeholders.
- **Sequels number per pairing.** Save v2 records each film's killer.
- **Per-crossover pressure tuning** (`CROSSOVER_PRESSURE` in `sequels.ts`) keeps every pairing on the same act targets. The Drowned Boy, whose night surge is always on at the clinic and the insurer, is tuned down. The design and the Burned Man at the camp are tuned up. A pacing test covers each crossover.
- **Next: play as the horror**, to be designed with the other games' horror tiers.

**Step 6 is done: the Killer's Cut (play as the horror; design in `docs/HORROR-TIER.md`).**
- **Side B of the shelf:** pick a killer, and it haunts the camp, the clinic and the insurer at once (original or crossover). Each place runs itself, defended by its pacing bot (`src/late-fees/defenders.ts`).
- **The shared hunt engine** (`src/shared/hunt.ts`) splits the killer's strength across places in ± steps.
  - The push becomes the place's killer pressure (minimum 0.1 when left alone).
  - Hunger is spent per step and fed by the dead.
  - Dread buys upgrades: more strength, harder push, patience, appetite, quiet.
  - Notoriety funds the defenders (+30% production per point), and going to ground lets it fade.
  - A place that rolls credits puts the killer down for 10 minutes and reopens as its next sequel.
- **Dread per body** is weighted by place (camp 1, clinic 1.5, insurer 8).
- **Only the side that is playing advances.** The cut steps 5 seconds at a time when catching up offline.
- **Save v3** adds `mode` and `cut`.
- **Telemetry:** adds `cut_started` and `cut_beaten`.
- **Balance (horror bot over a 5-hour hunt):** about 40 times the harvest of a killer who never pushes, about 13 upgrades, strength 3 → 7.

## Build order

1. **The page:** `/late-fees/`, the VHS shell, the tape shelf, save, PWA, the picker's third door and telemetry.
2. **Venues × killers architecture,** then **Camp Blackwater** with the Drowned Boy on held ground, sequels, and the pacing bot.
3. **The Sycamore Street Sleep Clinic** with the Burned Man.
4. **Providence Mutual** with Death's design.
5. **Crossovers.** (done)
6. **Play as the horror** (done: the Killer's Cut).
