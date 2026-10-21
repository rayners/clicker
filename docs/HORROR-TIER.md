# Play as the horror (design approved 2026-10-20)

An unlockable higher tier in every game, requested by the user on 2026-10-20: reverse the roles and play the thing that hunts. It is the counterpart of DEEP CONTRACT's Boardroom, which the user pointed out is already a horror tier: the company is the monster. This doc covers the creature and killer tiers, how they share one engine, and what to build first. Nothing here is built yet.

| Game | First tier: you are… | Horror tier: you are… |
|---|---|---|
| DEEP CONTRACT | WARDEN, running a mission | **The creature** (the organism, a xenomorph homage) or **the hunter** (a Predator homage). The **Boardroom** (the company) stays its own planned tier. |
| CHARTER OF THE ELDERDARK | The Factor, running the company | **The wood**: hungry forest spirits, or **the dragon** under the Heartwood |
| LATE FEES | Whoever runs the place | **The killer**: the Drowned Boy, the Burned Man, or Death's design ("The Killer's Cut") |

## The core idea: the first tier plays itself, against you

Two things already exist in every game:

1. **A defender.** Each game has a pacing bot that plays the first tier sensibly: it buys, balances and reacts (`src/sim/bot.ts`, `src/forest/bot.ts`, `src/late-fees/bot.ts`).
2. **A pressure input.** Each first tier takes the horror's push as a number: `horrorPressure` in DEEP CONTRACT, the killer's `pressure` in LATE FEES, and danger and blight in Elderdark.

So in the horror tier, several first-tier runs (**prey**) play at once, each defended by its bot, and **the player decides where the horror pushes and how hard**. Deaths, terror and corruption in the prey become the horror's currency. The defenders adapt, buying the watch, the prevention and the armour, so the opponent is a real one and not a script. A prey run's story still plays out (acts, the final girl, the terminus), now as the thing that eventually turns on you.

This is also exactly what the Boardroom needs, since it runs many missions headlessly. The architecture rules already in place (pure, serializable, instance-able runs with no DOM, clock or globals) were written for it.

## The shared engine (`src/shared/hunt.ts`)

Game-agnostic, pure, test-first. A **hunt** holds several prey, plus the horror's own economy.

- **Prey** is an adapter each game supplies: a first-tier state, its defender policy, and three functions:
  - `step(prey, dt, push)`: advance the prey with the horror pushing at `push`;
  - `harvest(before, after)`: what the horror gained from that step (deaths, exposure, corruption);
  - `alarm(prey)`: how much the prey knows, 0..1 (its act, its final girl, its defences).
- **The push** is the main decision. The horror has a **strength**, and the player splits it across prey in one-tap steps, the same ± pattern every game already uses. Focusing kills faster but wakes that prey up. Spreading is slower and quieter.
- **Hunger** is spent to push and earned back from the harvest. Push harder than you can feed and the horror starves and must go **dormant**, the idle beat: dormancy lets alarm fade.
- **Notoriety** rises with every harvest, faster when focused. High notoriety brings **hunters**: the prey's defenders get budget and upgrades, and new prey arrive already alarmed. That is the brake, the same role the refinery, ammunition, light and night staff play in the first tiers.
- **Growth.** The harvest buys the horror's upgrades: more strength, new ways to push (the kill types), and slower notoriety.
- **The end of a hunt:** a prey run reaching its terminus is the prey fighting back. A burned house, a vented deck, a felled wood all cost the horror. Prestige is **Legend**: the next hunt starts stronger, and a new horror unlocks.

The engine knows nothing about lakes, decks or forests. Each game supplies its prey adapters, words and look, as the held-ground engine does today.

## Per game

### LATE FEES: The Killer's Cut

You pick a killer. The prey are tapes running at once: the camp, the clinic, the insurer, and the crossovers. Each runs its venue and defender bot, with your pressure in place of the killer's.
- **Kill types per killer:**
  - the Drowned Boy: night stalk, the lake, the cut power line;
  - the Burned Man: dream walk, the boiler room, the skipping rhyme that spreads fear between venues;
  - Death's design: omens, chains, and skipping a name to bank anger.
- **The opposition is the final girl.** A prey that reaches act 3 has worked out your rules, and its losses to you fall.
- **Legend** is the franchise: each finished hunt adds a sequel, from *Part II* to *Takes Manhattan*.
- **Why it goes first:** killers are already separate from venues, every venue reads the killer's pressure through one function, and every venue has a defender bot. Little new simulation code is needed, so it proves the shared engine fastest.

### DEEP CONTRACT: the creature, or the hunter

- **The creature.** The prey are missions: a refinery hauler, a terraforming station, a security detachment.
  - Push is the organism's pressure, through `HorrorDef.pressure` and the containment and infestation systems.
  - The harvest is **biomass**, from crew taken and specimens returned to you.
  - **Held ground, inverted.** On security prey, *you* hold the colony's sectors and the marines' bot pushes back. This is the cross-pollination the user asked for, run backwards.
  - The opposition is WARDEN itself: a defender that reaches the terminus vents, scuttles or blows the processor.
- **The hunter.** The prey are the same missions, under an honour code: trophies only from armed prey, and none from the unarmed. The push is selective, so notoriety works differently. The hunter is careful to be seen rarely.
- **The Boardroom** stays the company tier, with its own design in `docs/BOARDROOM.md`. It can reuse the hunt engine's multi-prey core: missions as prey, and the company as the thing that profits.

### CHARTER OF THE ELDERDARK: the wood, or the dragon

- **The wood (forest spirits).** The prey are companies under charter at Thistlegate.
  - Push raises a company's danger and blight.
  - The harvest is **sap**, from hands turned and parties lost.
  - Luring parties deeper (a company's charted delve) feeds you more but brings the Ashen Key closer to their hands.
  - The opposition is the Lantern Synod's penance and the Key itself.
- **The dragon.** The prey are the same companies.
  - The harvest is **hoard**, the relics the companies dig up, taken in raids.
  - Raiding a company's vault is the push; notoriety brings dragon-slayer charters.
  - Sleeping on the hoard is dormancy.

## UI

- The horror tier is a **second mode inside each game**, not a new page. It's reached from the game's own menu once unlocked: **FLIP THE TAPE** in LATE FEES, **SPECIAL ORDER 0-77: ACCEPTED** in DEEP CONTRACT, **LISTEN TO THE WOOD** in Elderdark.
- It has the same shell and look, re-tinted for the monster's side:
  - LATE FEES: the VHS plays the killer's-eye view, red-tinted with heavy tracking;
  - DEEP CONTRACT: the organism sees the ship as heat;
  - Elderdark: the ledger is written by the wood.
- **The main screen** has a strip per prey showing its act, alarm, defences and recent harvest, and the push split with ± steps. The flow readout becomes **push → harvest → notoriety**.
- **Saves:** the hunt lives in the game's existing save, beside the first-tier run, under `profile.hunt` or a new top-level field (with a migration).

## Pacing

- A hunt is meant to run 3–5 hours.
- A **horror bot** (the mirror of the defender bot) plays the horror side for pacing tests.
- Prey runs inside a hunt tick more coarsely (for example a 5-second step) to keep phones cool and offline catch-up affordable. A test checks that coarse stepping gives the same act timing within a margin.

## Unlocks

- The horror tier unlocks after finished first-tier runs, like the Boardroom (`BOARDROOM_UNLOCK_CONTRACTS = 10`). As with terraforming, security and crossovers, it will be **available from the start while being play-tested**.

## Status

- **Built:** the hunt engine (step 1), LATE FEES's Killer's Cut (step 2) and Elderdark's wood (step 3).
- **The wood as built:**
  - **Entry:** "Listen to the wood" in Elderdark's configuration.
  - **Prey:** three companies under charter, each run by its Factor's bot (`defendCompany` in `src/forest/bot.ts`).
  - **The push** is a new `Company.woodPush`, zero in ordinary charters. Each point adds 60% danger and 100% expedition blight.
  - **Sap** comes from hands lost: the dead plus the turned.
  - **Fear** (notoriety) is added to the companies as Renown, which brings more haul and a better-armed company.
  - **A charter reaching its reckoning** beats the wood back for 10 minutes and is replaced by its next charter.
  - **Saves:** Elderdark save v7.
  - **Balance (bot, 5 hours):** about six times the harvest of a passive wood, hands turning in numbers, nine upgrades.
- **Next:** DEEP CONTRACT's creature.

## Build order

1. **The hunt engine** (`src/shared/hunt.ts`), test-first, with no game attached. It covers push, hunger, notoriety, dormancy and growth, and drives stub prey.
2. **LATE FEES: The Killer's Cut**, the first real prey adapters:
   - the three venues, with their bots as defenders;
   - a controllable killer;
   - the mode switch, UI, horror bot, pacing and telemetry.
3. **Elderdark: the wood.** Blight and turning are already central, and the company bot defends.
4. **DEEP CONTRACT: the creature**, including held ground inverted on security prey.
5. **The hunter and the dragon**, as second horrors in their games.
6. **The Boardroom**, reusing the multi-prey core.

## Decisions (user, 2026-10-20)

1. **Build order:** LATE FEES first, then Elderdark, then DEEP CONTRACT.
2. **First horrors:** the creature for DEEP CONTRACT, and the wood for Elderdark. The hunter and the dragon come later.
3. **The prey play themselves**, defended by bots, not scripted opponents.
4. **A second mode inside each game** (proposed; not objected to).
