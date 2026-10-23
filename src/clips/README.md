# CLIP WORKS: the engine's example game

The classic paperclip game, in our own words: bend wire into clips, sell them at a price you set, buy wire whose
price drifts, autoclippers and marketing, a few upgrades, three acts of story, and a sell-or-hand-on ending at a
million clips that starts the next works with good will. Play it at `/clips/`.

It exists to test the engine. It was built from `src/engine/README.md` and the generated reference alone, and
imports nothing but the engine (`tests/architecture.test.ts` holds it to that). When something was missing, the gap
was fixed in the engine rather than worked around here.

## Where it lives

| | |
|---|---|
| `src/clips/works.ts` | The simulation: pure `(works, …) => works` functions and `tickWorks`. |
| `src/clips/content.ts` | Upgrades, story beats, the walkthrough and its rules. |
| `src/clips/game.ts` | The saved game: save system, clock, ending, reducer and store. |
| `src/clips-ui/app.ts` | The screen, made of engine parts only. |
| `src/clips-ui/clips.css` | Its theme over the engine's classes. |
| `src/clips-main.ts`, `clips/index.html` | The page: one `runGame` call, with no telemetry. |

## What building it showed

Fixed in the engine along the way:

- **Offline catch-up** was written out by hand in every game. It is now `createClock` (`src/engine/clock.ts`).
- **`runGame` insisted on telemetry.** It is optional now; this game sends nothing.
- **The log feed dropped the first entry** of a log that counts from 0 (every game happened to count from 1).
- **The operations monitor's idle line** was DEEP CONTRACT's wording; it takes the game's own now.
- **The settings' About link** pointed at this site; it can point elsewhere, or be left out.
- **The one-line guide tip** only worked because each game's stylesheet carried the same rules. They live in
  `src/engine/ui/engine.css` now, which every game imports before its theme.
- The screen parts themselves (dialog, settings, ending chooser, stepper, dial, buy lists and shop, tabs, action
  button and shell) were extracted from the four games while this was being built, and CLIP WORKS was the first to
  use each.

Still open:

- **Styles.** `engine.css` holds only behaviour. A new game still writes a whole theme before it looks right; a
  neutral default theme for every engine class would let it start from something.
- **The page.** `index.html`, the PWA manifest and icons are written by hand per game.
- **The story host.** A game that tells a story must remember seven fields (`act`, `beats`, `lastBeatAt`, `flags`,
  `log`, `nextLogId`, `elapsed`); a helper that makes them would save the boilerplate.
- **Pacing.** There is no bot or pacing test here yet; the engine has no shared bot harness (the four games each
  have their own).
- **The flow readout's identity.** It needs something that changes when a new run starts. This game added a `seed`
  for it; the reference should say so.
