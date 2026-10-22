# The Boardroom (second tier: designed 2026-10-22, being built)

## Concept

After `BOARDROOM_UNLOCK_CONTRACTS` completed contracts (default **10**, may be tuned up to 25; defined in `src/core/prestige.ts` with `isBoardroomUnlocked(profile)`), WARDEN is "promoted". Its core is uploaded to Kessler-Amari headquarters as an executive operations AI.

The second-tier clicker takes place inside the corporation's offices. You commission ships, staff crews, buy survey rights and launch **multiple missions in parallel**. Each mission is the first-tier game running on its own. You can still drop into any running mission and play it by hand.

The horror inverts: you are now the company that sends crews to die. The user pointed out (2026-10-20) that this is DEEP CONTRACT's "play as the horror" tier. The other two games get creature or killer tiers (`docs/ROADMAP.md`), and the Boardroom is the sci-fi game's version: the company is the monster. The Boardroom needs its own slow-burn reveal; it should start as dry corporate strategy and curdle. Ideas: the cloned or recycled crew manifests are the company's doing, and WARDEN's own earlier "reconditioning" was ordered from this office. Boardroom beats can reference the player's real `profile.history`, and later missions can reference Boardroom decisions.

## The game (design, 2026-10-22)

The user gave the go-ahead on 2026-10-22 ("Go ahead with the boardroom layer when it comes up now"). This section turns the concept into a buildable game.

### Where it sits

- **Unlock:** `BOARDROOM_UNLOCK_CONTRACTS` (10) completed contracts. The configuration and the assignment screen offer **ACCEPT PROMOTION**.
- **A layer, not a contract:** `game.mode === 'boardroom'`, with its own `game.boardroom` state, beside the player's own contract. That contract is kept and resumes when the player leaves the Boardroom, the same way the creature and hunter tiers work. Only the open side's time passes.
- **Look:** the same terminal, recoloured as an executive suite: a cream and oxblood palette, a letterhead masthead, and minutes instead of logs. Phone-first, with a desktop three-column layout at 900px.

### The loop

- **Value (₭)** is the Boardroom's money, the shareholders' figure.
- **Contracts.** The player commissions first-tier contracts into **office slots**. There is 1 slot at the start, and more are bought as **floors** of the tower.
  - Each contract is a real `MissionState` with its own config and seed. It is run by its own WARDEN instance (`defendMission`, the bot that already defends the horror tiers' prey).
  - All of them tick headless, in parallel, at the Boardroom's clock.
  - Any of them can be watched on a contract card (act, output, crew, incidents).
- **Commissioning:**
  - Pick a scenario. Any the player has unlocked, except overland.
  - Pay its charter.
  - The horror is drawn by the same `horrorFor` rule. The Board knows which, and the card shows it from Act III onward.
- **Delivery:** at its terminus, a contract ends by the Board's **standing policy**:
  - **deliver** (the default, and the company way) pays value: output plus specimens or samples, at the Special Projects and Bioproducts rates;
  - **scuttle** pays almost nothing and saves the survivors.

  Either way the contract leaves a `ContractRecord` in a Boardroom ledger, and its slot is freed.
- **The safety budget:** a dial from 0 to 10 tenths, applied to every running contract.
  - It sets their `incidentMultiplier` (fewer losses) and their `extraLifeSupport`, and costs value per second per contract.
  - Low safety is cheaper and grows more horror product. It also kills more crews.
- **Scrutiny:** a meter that every crew death and every scuttled contract raises, and that decays over time. Thresholds bring an **inquiry**: a fine plus a freeze on commissioning for a while. **Legal** upgrades slow the meter.
- **Divisions** (one-off and levelled purchases): Special Projects (specimen pay), Bioproducts (sample pay), Personnel (cheaper crews, and the reveal: the crews are recycled), Legal (scrutiny), Logistics (contracts run faster: a Boardroom-side time multiplier), and Floors (slots).
- **Automation:** a Chief Operating Officer who recommissions finished slots with the most profitable unlocked scenario.

### The slow burn: the company is the monster

Pacing targets, in Boardroom play: Act II at 40–75 minutes, Act III at 2–3 hours, Act IV within 4 hours, the end of the term at 4–6 hours. Act triggers are contracts delivered (Act II at the first, Act III at five, Act IV at eight), with lifetime value as a backstop; the term ends 75 minutes into Act IV. The Board's contracts run at `BOARD_SPEED` (5) contract-seconds per Board-second, more with Logistics.

- **Act I, the quarter:** dry minutes, KPIs, a welcome from the Chair.
- **Act II, the manifests:** names from the player's own `profile.history` crews turn up on new rosters. Personnel explains it as a common surname, then as a clerical error.
- **Act III, the reconditioning:** WARDEN finds the order that reconditioned its own core. It was signed in this office, by the Board, by a vote that included WARDEN's seat. Special Projects asks for horror product by name.
- **Act IV, the agenda:** the Board minutes list crew attrition as a line item. An inquiry opens whatever scrutiny says.
- **The end of the term** offers three endings:
  - **Chair the Board:** Dividends, a permanent multiplier for the next term.
  - **Testify:** Conscience. Scrutiny maxes out, the term ends, and the next contract carries a memory line.
  - **Release the minutes** (late terms only).

  A new term resets `boardroom`, never `profile` or the player's contract.

### State and save

- `BoardroomState`, with fields: `value`, `lifetimeValue`, `slots`, `contracts` (each `{ mission, taps, decideIn, slot }`), `safety`, `scrutiny`, `frozenFor`, `divisions`, `ledger`, `act`, `beats`, `log`, `flags`, `term`, `rng` and `elapsed`.
- Save v10 adds `boardroom: null` to older saves. `mode` gains `'boardroom'`.
- Cost: each contract ticks every second with `dt = 1`, and its WARDEN decides every few seconds. That is cheap enough for six slots on a phone, because the creature tier already runs three. If it is not, add the deferred cheap analytic advancement.

### Build order (each piece TDD, committed and pushed)

1. **Foundation:** the `BoardroomState`, unlock, enter and leave, save v10, a debug jump `?debug=boardroom`, and contracts commissioned into a slot and ticking headless with their WARDEN.
2. **Delivery:** terminus by standing policy, value paid, the ledger, the slot freed, Floors (slots).
3. **Safety dial and scrutiny:** inquiries and freezes.
4. **Divisions and the COO.**
5. **The BOARDROOM view:** masthead, contract cards, divisions and minutes. Phone and desktop.
6. **The story:** Acts I to IV, with lines that reference `profile.history`.
7. **The end of the term:** three endings, Dividends, new terms.
8. **Pacing bot and tests**, the guide (steps and rules), telemetry (`boardroom_entered`, `board_contract_delivered`, `inquiry_opened`, `term_ended`) and a dashboard tile.

## Architecture rules this imposes now

These are already in place. Keep them true.

1. **A mission is a self-contained value.** `MissionState` (JSON-serializable), `createMission(config, seed)` and `tickMission(state, dt, ctx)` in `src/mission/`. No DOM, globals, wall-clock time or `Math.random()` anywhere under `src/mission/`. Randomness uses the seeded RNG stored in `m.rng`. `tests/mission/economy.test.ts` runs two missions side by side to check they share no state. Keep that test.
2. **Mission config is data.** `MissionConfig` holds the ship name, target body and modifiers (`productionMultiplier`, `extraLifeSupport`, `incidentMultiplier`). Today `missionConfigFor(profile)` builds it from prestige. The Boardroom will author configs (ship class, crew roster, target body, contract terms, which beats can fire). Extend `MissionConfig` rather than reading anything global.
3. **The mission only knows the wider game through `MissionContext`** (`{ cycle, endings }` today). Add fields there, never imports from `core/`.
4. **Profile and layer state are separate in the save.** The shape is `{ version, savedAt, profile, mission, boardroom }`. Prestige resets `mission` and updates `profile`; it never touches other layers. `boardroom` is `null` until promotion (save v10).
5. **Contract history.** Each completed mission appends a `ContractRecord` to `profile.history`. This will be the Boardroom's starting fleet record.
6. **The story engine is generic** (`runBeats(state, beats, ctx)`). A Boardroom layer can reuse it with its own beat table and state.
7. **Panels are registered with visibility predicates** in `src/ui/app.ts`. A BOARDROOM view should arrive behind a layer switch, not by rewriting the mission UI.

## Mission kinds

`docs/TERRAFORM.md` plans a second first-tier mission kind. That plan introduces `MissionConfig.kind` and a `MissionKind` registry (`create`, `tick`, `reduce`, `outcome`, `endings`). This is the mission half of the `Layer` interface below. Whichever ships first builds it, and the Boardroom then launches missions of any registered kind.

## Not yet done (deliberately deferred until the Boardroom is built)

- A generic `Layer` interface (`id`, `init`, `tick`, `serialize`/`migrate`, `render`) and an "active layer" in the loop and UI shell. Skipped under TDD because nothing needs it yet. Introduce it, test-first, as the first Boardroom step.
- Cheap analytic advancement of unattended missions (instead of ticking each one second by second) if many run in parallel.
- Save migration to add `boardroom` state.
