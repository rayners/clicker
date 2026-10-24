# Games made of data

Status: **approved, being built** (user, 2026-10-23). The decisions below are settled.

## The goal

A very simple idle game should be definable in **one JSON file**: its text, its numbers, its look, its walkthrough
and its pacing targets, and nothing else. A game that needs more can add its own TypeScript, but should only have to
write the parts that are truly its own.

The test of success: **CLIP WORKS rebuilt as `clips.json`** plays the same and passes the same pacing test as the
TypeScript version, with no code of its own.

## What already repeats across the games

The four games and the example are built from a small number of shapes. These are the candidates for options a game
creator picks from:

| Shape | Where it appears now |
|---|---|
| **Tiers of producers**, each dearer than the last (a growth factor per purchase), each making something per second | Generators, reactors, cutters, troopers, beds, counselors, attractions, autoclippers |
| **A converter chain with a bottleneck**: input → conversion → income, with the limiting stage called out | Ore → refinery → credits; power → processing → income; wire → clips → sales (the flow readout) |
| **One-off upgrades** as multipliers on a rate, a cap or a cost | Every game's requisitions and shops |
| **A split dial**: one pool divided between two uses, a tenth per tap, taken over by an automation once bought | Assault/line, prep/watch, deep sleep, risk appetite, sedation, the beach dials |
| **A pressure meter** that fills toward trouble and triggers an event at the top | Containment, hull stress, sleep debt, agitation, blight, omens |
| **A market**: demand that answers price, and a supply price that drifts | CLIP WORKS's demand and wire price |
| **Cycles**: a clock with phases that change the rules | The camp's day and night, the season's days, the Boardroom's quarters |
| **Held ground**: sections taken at a frontier and kept by garrisons | Colony sectors, derelict compartments, the Keep's floors, the camp's zones |
| **Objectives**: timed goals with a reward | DEEP CONTRACT's directives |
| **Story**: beats on conditions that write the log and move the act; endings that grant a currency kept across runs | Every game |
| **Automation**: an upgrade that presses the big button, buys wire, or runs a dial | WARDEN's autocycle, the standing wire order, the dial automations |
| **The hunt**: play as the horror against several runs of the game, each played by its own bot | All six horror tiers |

Most of these already exist in the engine as code (`ground`, `hunt`, `story`, `clock`, the UI parts). The proposal
gives each a **data form**.

## The shape of a game file

```jsonc
{
  "id": "clip-works",
  "version": 1,
  "title": "CLIP WORKS",
  "description": "Bend wire into clips, sell them, grow the works.",
  "theme": { "palette": "paper", "accent": "#2f5d8a", "font": "serif" },

  "resources": {
    "wire":  { "label": "WIRE", "unit": "IN", "start": 1000 },
    "clips": { "label": "CLIPS", "unit": "ON HAND" },
    "funds": { "label": "FUNDS", "format": "money" },
    "made":  { "label": "MADE", "lifetime": "clips" }
  },

  "press": { "label": "MAKE A PAPERCLIP", "convert": { "wire": 1, "clips": 1 } },

  "producers": [
    { "id": "autoclipper", "label": "AUTOCLIPPER", "text": "Bends a clip a second while there is wire.",
      "cost": { "funds": 5, "growth": 1.1 }, "converts": { "wire": 1, "clips": 1 }, "rate": 1 }
  ],

  "mechanics": {
    "market": {
      "sells": "clips", "for": "funds", "price": { "start": 0.05, "step": 0.01, "min": 0.01 },
      "demand": { "base": 20, "elasticity": 2, "boostedBy": ["marketing", "goodwill"] }
    },
    "supply": { "buys": "wire", "spool": 1000, "price": { "start": 20, "drift": [-2, 2], "every": 10, "range": [12, 32] } }
  },

  "upgrades": [
    { "id": "sharper-dies", "label": "Sharper dies", "text": "Autoclippers bend half again as fast.",
      "cost": { "funds": 50 }, "shown": "made >= 200", "effect": { "multiply": "autoclipper.rate", "by": 1.5 } },
    { "id": "wire-buyer", "label": "Standing wire order", "text": "Buys a spool whenever the bench runs dry.",
      "cost": { "funds": 200 }, "shown": "made >= 1000", "effect": { "automate": "supply" } }
  ],

  "story": [
    { "id": "automation", "act": 2, "when": "made >= 2000", "kind": "letter",
      "text": "LETTER: The stationers on Fourth Street would like to stock your clips. All of them." },
    { "id": "million", "when": "made >= 1000000", "text": "One million clips.", "ends": true }
  ],

  "endings": [
    { "id": "sell", "title": "SELL THE WORKS", "text": "…", "grants": { "goodwill": 1 } }
  ],

  "guide": [
    { "id": "make", "title": "MAKE A CLIP", "text": "Tap the big button…", "target": "press", "done": "made >= 10" }
  ],

  "screen": {
    "flow": ["wire", "clips", "sales"],
    "status": ["funds", "made", { "stepper": "market.price" }],
    "tabs": [
      { "id": "log", "label": "LOG", "show": ["monitor", "log"] },
      { "id": "works", "label": "WORKS", "show": [{ "buy": ["supply", "autoclipper", "marketing"] }] },
      { "id": "upgrades", "label": "UPGRADES", "show": ["shop"] }
    ]
  },

  "pacing": {
    "bot": { "priorities": ["supply", "upgrades", "autoclipper", "marketing"] },
    "targets": { "act2": ["3m", "10m"], "act3": ["30m", "75m"], "end": ["90m", "4h"] }
  }
}
```

## Decisions to make

### 1. Conditions and formulas: strings or JSON trees

Conditions (`shown`, `when`, `done`) and formulas (a rate, a price) need a small, safe expression language.

- **Strings**, such as `"made >= 2000 and has('jingle')"`. Readable and short to write. They need a tiny parser, which
  can name the JSON path and the column of a mistake when the file loads.
- **JSON trees**, such as `{"and": [{"gte": ["made", 2000]}, {"has": "jingle"}]}`. No parser, but verbose and hard to
  read for anything past a comparison.

**Recommendation: strings.** The grammar would be: numbers, names, arithmetic, comparisons, `and`/`or`/`not`, and a
fixed set of functions (`min`, `max`, `floor`, `has`, `owned`, `level`). There would be no `eval` and no access to
anything outside the game's state. Expressions are parsed once at load and checked against the names the game
defines, so a typo fails at load, not mid-game.

### 2. Mechanics as options, each a module

Each shape in the table above becomes a **mechanic**: a named block in `mechanics` with its own JSON settings. Each
mechanic brings its own slice of state, its own tick, its screen parts, its bot moves and its validation. The core
(resources, the big button, producers, upgrades, story, endings, guide) is always present. Mechanics are opt-in.

The first set, in order of how much they would buy:

1. **market**: sell a resource at a price you step, demand answering price, boosts from marketing and carried
   currencies.
2. **supply**: buy a resource in lots at a drifting price, with an automation.
3. **converter chain**: an input → conversion → output pipeline with a capacity stage (the refinery shape), feeding
   the flow readout and its bottleneck note.
4. **dial**: split a pool between two uses, with an automation (the engine's `createDial` on screen).
5. **meter**: pressure that fills from named sources, drains from others, and fires an event or a story beat at the
   top (breach, incident).
6. **cycle**: a repeating clock with named phases (day and night) that change rates.
7. **objectives**: timed goals with rewards.
8. **ground**: held sections on the engine's `ground` module.
9. **hunt**: the play-as-the-horror tier, where the prey are runs of the game itself, each played by the generic bot.
   That could give every data game a horror tier almost for free.

### 3. Upgrades as modifiers

Upgrades, carried currencies and mechanic effects all act through one pipeline: every number in the game (a rate, a
cost, a cap, demand) is `base × product of multipliers + sum of additions`. Each modifier names its target
(`autoclipper.rate`, `market.demand`). That keeps upgrades declarative and lets the screen show where a number comes
from.

### 4. Code where a game needs it

A game may register its own TypeScript under names the JSON refers to:

- **custom formulas**: `"demand": { "hook": "demand" }`;
- **custom mechanics**: a module in the same shape as the built-in ones, registered by name;
- **custom screen parts**: a component given the state.

A data-only game uses none of these. A bespoke game is JSON plus a few hooks rather than a whole codebase.

### 5. The screen and the look

- **The screen** is described by naming components: masthead, flow, status, stats, steppers, tabs, buy lists, shop,
  dial, meter, log, monitor, ending chooser, guide. These are the parts already in the engine; the definition only
  says what goes where.
- **The look** is a set of **tokens** (background, ink, accent, alert, font family from a fixed list), applied to a
  **default theme** that dresses every engine class. This closes one of CLIP WORKS's open gaps: a new game looks right
  before it has a stylesheet. A game can still ship its own stylesheet to go further.
- **Text** lives entirely in the JSON, with `{placeholders}` from the lexicon and number formats (`{funds:money}`,
  `{wire:count}`).

### 6. Pacing as data

- A **generic bot** plays any data game. It knows every purchase, because the interpreter does. It follows the
  definition's priority list, uses the market and supply moves, and saves for upgrades. This uses the engine's
  `playthrough` and `applyDecisions`.
- **Pacing targets** in the file become a generated pacing test and a `simulate` command for that game. A tuning loop
  for someone who writes no code: change a number, run the bot, see when each act lands.

### 7. How a data game reaches a page

- **Build time:** each JSON in a games folder becomes its own page, manifest and icon, generated from its metadata.
  This closes CLIP WORKS's other open gap: page scaffolding.
- **Run time, optionally:** one player page that loads a definition from a file or a URL, so a game can be shared
  without a build. It's safe because the file is data only and expressions are sandboxed, but it needs care: size
  limits, and a clear "made by someone else" frame.

**Recommendation:** build time first; the runtime loader as a later step.

### 8. Saves when the definition changes

A data game's save is keyed by game id. Additive changes (a new upgrade, a new resource) load cleanly, because
missing counts default to zero. Removed things are dropped. Bumping `version` with a list of renames covers the rest,
on the engine's existing migration system.

## Checking a definition

- A JSON Schema for editor autocompletion and basic checks.
- A **validator command** that loads the file and reports, by JSON path:
  - unknown names in expressions;
  - unreachable acts (no beat leads there);
  - upgrades that can never show;
  - a missing ending;
  - unbalanced pacing (the bot never finishes).
- The engine's invariant tests run against every definition in the repo.

## Progress

- (Done) Step 1: the expression language (`data/expr`, on jsep), the definition's types, the interpreter
  (`data/game`), and the screen from data (`data/screen`). Market and supply are built in, since CLIP WORKS needs
  them.
- (Done) Step 2, mostly: the generic bot (`data/bot`), pacing targets in the file (checked for every game in
  `games/` by `tests/engine/data-bot.test.ts`), `npm run simulate:data`, the default theme (`ui/theme.css`, dressed by
  `theme` tokens), and the page at `/made/` that lists every definition in `games/` and plays one with `?game=<id>`.
  Still to do from this step: the validator command, and per-game generated pages (the single page covered the need
  for now).
- Acceptance met: `games/clip-works.json` plays CLIP WORKS with no code of its own, inside the TypeScript version's
  pacing windows.
- Next: the other mechanics, one at a time with a small sample game each (converter chain, dial, meter, cycle,
  objectives, ground), then hooks for game code and the hunt.

## Build order (when approved)

1. The expression language, the core schema (resources, press, producers, upgrades as modifiers, story, endings,
   guide), the interpreter and the screen from data. Acceptance: `clips.json` at parity with CLIP WORKS.
2. The generic bot, pacing targets, the validator, the default theme, and generated pages.
3. Mechanics, one at a time, each with a small sample game: market and supply (needed by step 1's CLIP WORKS anyway),
   converter chain, dial, meter, cycle, objectives, ground.
4. Hooks for game code. The hunt as a mechanic. The runtime loader.

The existing four games stay as they are. They keep using the engine directly. Nothing here asks them to move to
data, though some of their content tables could later be read from JSON if that ever helps.

## Decisions (user, 2026-10-23)

1. **Strings** for conditions and formulas, parsed by an existing parser rather than a hand-rolled one: **jsep**
   (MIT, no dependencies, parse-only), evaluated by the engine against a whitelist of names and functions.
2. **Build-time pages** first, as the simpler path. A generic page where someone uploads or pastes their own JSON is
   a likely later step, so nothing should rule it out.
3. Data games live **on their own page**, not in the picker.
4. **The hunt is optional** for any game, but it is used often enough that the engine should support it as a
   mechanic.
