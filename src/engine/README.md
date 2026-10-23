# The engine

The code all four games share: DEEP CONTRACT, CHARTER OF THE ELDERDARK, LATE FEES and DOWN THERE. It knows nothing
about any of them; `tests/architecture.test.ts` fails if anything here imports a game. Anything a second idle game in
this style would need again belongs here. Anything with a game's names, numbers or writing belongs in that game.

Full API reference: the generated pages at <https://rayners.github.io/clicker/engine/> (`npm run docs` builds them
locally). Every export carries a doc comment, and `tests/engine/docs.test.ts` keeps it that way.

## Example

CLIP WORKS (`src/clips/`, played at `/clips/`) is a whole game built from this README and the reference alone:
the classic paperclip loop. Read [its README](../clips/README.md) for the layout of a small game and for the gaps
building it showed.

## Ground rules

- **Simulation code is pure.** Everything outside `ui/`, `run`, `posthog` and `telemetry`'s browser helpers is
  `(state, …) => state`. Nothing reads the clock, `Math.random()` or the DOM: time arrives as `dt` in seconds, and
  randomness comes from a seeded state (`rng`) kept in the game's own state. That keeps runs deterministic, testable
  and replayable by bots.
- **State is immutable** and JSON-serializable, so it can be saved as is.
- **The UI is hand-rolled DOM**, with no framework. Components are `{ el, render(state) }`. Rendering runs on every
  tick and only touches the DOM when something changed (`setText`, `setAttr`).
- **Phone first.** Controls are at least 44px, act on `click` (no hover-only affordances), and a two-tap confirm
  ignores a double tap.

## Plugging a game in

A game supplies a store (`createReducerStore` over its own reducer, with a `tick` action), a save system
(`createSaveSystem`), and a `mount` that builds its screen. Then its page's entry file is one call:

```ts
import { runGame } from './engine/run';

runGame(
  {
    saveKey: MY_SAVE_KEY,
    saves: mySaves,                 // createSaveSystem({ key, version, migrations, fresh, … })
    catchUp,                        // advance a loaded game by the time it was away
    createStore: createMyStore,     // createReducerStore(initial, reduce), handling { type: 'tick', dt }
    mount: mountMyGame,             // (root, store, { fresh, debugging }) => void
    telemetry: { diff: myEvents, context: myProperties }, // optional: leave out to send nothing
    debug: applyMyDebugJump,        // optional, dev builds only: ?debug=<jump>
  },
  { dev: import.meta.env.DEV, prod: import.meta.env.PROD },
);
```

Import `engine/ui/engine.css` before your theme: it holds what the engine's parts need to behave (layout and
states, no colours). Your stylesheet dresses the same classes.

`runGame` loads the save, catches up the time away, applies a dev-only debug jump, and mounts the game. It then keeps
the game running: a wall-clock tick (time with the phone asleep still counts), autosave every ten seconds and on
`visibilitychange`/`pagehide` (iOS Safari may kill a background tab without `beforeunload`), opt-out telemetry on the
published build only, persistent storage, and the site's service worker.

## Modules

### Running and saving

| Module | What it does |
|---|---|
| `run` | `runGame`: everything above, from a `GameDef`. |
| `clock` | `createClock`: a game's `advance` (every frame) and `catchUp` (on load). Time away runs in steps, capped at eight hours, with an optional note of what happened; a clock set back never runs time in reverse. |
| `store` | `createReducerStore`: a minimal immutable store with subscribe and replace. |
| `save` | `createSaveSystem`: versioned saves in `localStorage` with ordered migrations, shape checks (`hasShape`), corruption backup, and export/import codes. |
| `memo` | `memoByState`: caches a value derived from one immutable state. |

### Simulation

| Module | What it does |
|---|---|
| `rng` | `nextRandom`, `randomInt`: mulberry32, with its state as one integer you keep in your game state. |
| `story` | `runBeats`: fires story beats (at most one per tick, spaced unless urgent) that write log entries and set acts, flags or game actions. `sinceBeat` gives seconds since a beat fired. |
| `lexicon` | `interpolate`, `placeholders`: `{placeholder}` text written once and filled from each scenario's phrases. |
| `log` | `appendLog`: a capped, time-stamped log on any host. |
| `ground` | Held ground: sections taken at a frontier by `assault`, kept by garrisons (`setGarrison`), slipping back under pressure (`tickGround`). |
| `hunt` | The play-as-the-horror engine: strength split across several self-defending prey, hunger, harvest, notoriety and Legend (`createHunt`, `shiftPush`, `tickHunt`, `legendEarned`). |
| `hunt-guide` | `huntGuide`: walkthrough steps and a rules page for any hunt, in the game's own words (`HuntWords`). |
| `guide` | Walkthrough steps that each show when they apply and go once done (`nextStep`), with progress kept per device (`createGuideProgress`). |
| `pixels` | Palette-indexed pixel art (`sprite`, `framePixels`) and deterministic glitching (`corruptFrame`). |
| `format` | `formatNumber`, `formatDuration`, `formatClock`. |

### Telemetry

| Module | What it does |
|---|---|
| `telemetry` | `createTelemetry` turns state changes into events (`progressEvents` for common milestones). Also the device-wide opt-out (`createOptOut`), `telemetryAllowed` (published build, public host, no debug jump, not opted out), and `announce` for events that no state change shows. |
| `posthog` | `startAnalytics` wires a store and uncaught errors to PostHog, loading it only when allowed. `trackVisit` is for pages without a game. |

### Screen

| Module | What it does |
|---|---|
| `ui/shell` | `createShell`: mounts a game's parts and overlays into its root, and covers the game (inert) while a full-screen layer is open. |
| `ui/tabs` | `createTabs`: the tab bar and a panel per tab; tabs appear as they apply, fall back home when they go, are marked (and named aloud) when they want attention, and can be renamed; a desktop side column; one broken panel never stops the rest. |
| `ui/action` | `createActionButton`: the big button that acts on the press itself (rapid taps on a phone all count), works from the keyboard, and floats what each press earned. |
| `ui/dom` | `h()` builds elements; `setText` and `setAttr` change them only when needed; `aboutLink` links to the About page. |
| `ui/flow` | `createFlow`: the three-stage production readout that highlights the limiting stage and calls out every change in rate. |
| `ui/monitor` | `createMonitor`: animated rows showing automation at work. |
| `ui/log` | `createLogView`: an append-only feed that prints only new entries. |
| `ui/guide` | `createGuideView`: the one-line walkthrough tip (tap to open) and the rules page. |
| `ui/dialog` | `createDialog`: a modal dialog named after a class you give it, closed by its button or Escape, focus moved in and back; or a choice that must be made (`closable: false`). |
| `ui/settings` | `createSettings`: the settings button and dialog: sound, reduced motion, the telemetry opt-out, the About link, export/copy/download/import of the save code, sections of the game's own, and a two-tap reset, all in the game's own words. |
| `ui/endings` | `createEndingChooser`: a card for each ending on offer, with its words and reward, each ended by its own two-tap button. |
| `ui/stepper` | `createStepper`: a − and + around a value, one step per tap; either way can stop at a limit, and the buttons hide while an automation has the control. |
| `ui/dial` | `createDial`: a stepper between the two sides it trades off (or under one name), an optional meter and line of detail, and an automation that takes it over with a handover button once bought. |
| `ui/buy-list` | `createBuyList`: rows of things to buy (name, owned, description, notes, a price button that waits until affordable), fixed or changing with the game; `createBuyPanel`: a title and a heading, running total and list per section. Prices are written and spoken in the game's own currency. |
| `ui/shop` | `createShop`: one-off upgrades on offer now, each bought once, with a list of what has been bought. |
| `ui/doors` | `createDoors`: a masthead button opening a dialog of doors to a game's other tiers; a closed door says what opens it. |
| `ui/confirm` | `createConfirmButton`, `confirmedInTime`: two-tap confirms that a double tap cannot pass. |
| `ui/sprites` | `createSpriteKit`: draws sprites on canvases, tinted from CSS variables so themes re-colour them. |
| `ui/sound` | `createSynth`: WebAudio cues and a hum per level of tension, silent until enabled and unlocked by a tap (iOS). |
