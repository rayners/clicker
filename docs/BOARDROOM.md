# The Boardroom (planned second tier, not built yet)

## Concept

After `BOARDROOM_UNLOCK_CONTRACTS` completed contracts (default **10**, may be tuned up to 25; defined in `src/core/prestige.ts` with `isBoardroomUnlocked(profile)`), WARDEN is "promoted". Its core is uploaded to Kessler-Amari headquarters as an executive operations AI.

The second-tier clicker takes place inside the corporation's offices. You commission ships, staff crews, buy survey rights and launch **multiple missions in parallel**. Each mission is the first-tier game running on its own. You can still drop into any running mission and play it by hand.

The horror inverts: you are now the company that sends crews to die. The user pointed out (2026-10-20) that this is DEEP CONTRACT's "play as the horror" tier. The other two games get creature or killer tiers (`docs/ROADMAP.md`), and the Boardroom is the sci-fi game's version: the company is the monster. The Boardroom needs its own slow-burn reveal; it should start as dry corporate strategy and curdle. Ideas: the cloned or recycled crew manifests are the company's doing, and WARDEN's own earlier "reconditioning" was ordered from this office. Boardroom beats can reference the player's real `profile.history`, and later missions can reference Boardroom decisions.

## Architecture rules this imposes now

These are already in place. Keep them true.

1. **A mission is a self-contained value.** `MissionState` (JSON-serializable), `createMission(config, seed)` and `tickMission(state, dt, ctx)` in `src/mission/`. No DOM, globals, wall-clock time or `Math.random()` anywhere under `src/mission/`. Randomness uses the seeded RNG stored in `m.rng`. `tests/mission/economy.test.ts` runs two missions side by side to check they share no state. Keep that test.
2. **Mission config is data.** `MissionConfig` holds the ship name, target body and modifiers (`productionMultiplier`, `extraLifeSupport`, `incidentMultiplier`). Today `missionConfigFor(profile)` builds it from prestige. The Boardroom will author configs (ship class, crew roster, target body, contract terms, which beats can fire). Extend `MissionConfig` rather than reading anything global.
3. **The mission only knows the wider game through `MissionContext`** (`{ cycle, endings }` today). Add fields there, never imports from `core/`.
4. **Profile and layer state are separate in the save.** The shape is `{ version, savedAt, profile, mission, boardroom? }`. Prestige resets `mission` and updates `profile`; it never touches other layers. `boardroom` is reserved in `GameState`.
5. **Contract history.** Each completed mission appends a `ContractRecord` to `profile.history`. This will be the Boardroom's starting fleet record.
6. **The story engine is generic** (`runBeats(state, beats, ctx)`). A Boardroom layer can reuse it with its own beat table and state.
7. **Panels are registered with visibility predicates** in `src/ui/app.ts`. A BOARDROOM view should arrive behind a layer switch, not by rewriting the mission UI.

## Mission kinds

`docs/TERRAFORM.md` plans a second first-tier mission kind. That plan introduces `MissionConfig.kind` and a `MissionKind` registry (`create`, `tick`, `reduce`, `outcome`, `endings`). This is the mission half of the `Layer` interface below. Whichever ships first builds it, and the Boardroom then launches missions of any registered kind.

## Not yet done (deliberately deferred until the Boardroom is built)

- A generic `Layer` interface (`id`, `init`, `tick`, `serialize`/`migrate`, `render`) and an "active layer" in the loop and UI shell. Skipped under TDD because nothing needs it yet. Introduce it, test-first, as the first Boardroom step.
- A `missionOutcome(state)` summary function. Today `completeContract` builds the record inline.
- Cheap analytic advancement of unattended missions (instead of ticking each one second by second) if many run in parallel.
- Save migration to add `boardroom` state.
