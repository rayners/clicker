# DEEP CONTRACT

A retro-futurist idle clicker. You are WARDEN, the operations intelligence of a Kessler-Amari Combine
ore hauler orbiting a remote moonlet. It is a cheerful corporate mining game, until it isn't.

Runs entirely in the browser (state in `localStorage`); builds to a static, installable, offline-capable PWA.

## Commands

| | |
|---|---|
| `npm run dev` | Dev server. Add `-- --host` to open it on a phone on the same network. |
| `npm test` | Unit + UI tests (vitest, jsdom), including pacing goals. |
| `npm run test:e2e` | Playwright journeys on desktop Chromium and iPhone 13 emulation. Set `E2E_WEBKIT=1` to use real WebKit (needs `sudo npx playwright install-deps webkit`). |
| `npm run simulate` | Headless bot playthrough; prints when each act and the terminus are reached. |
| `npm run build` | Typecheck + static build to `dist/` (with service worker). |
| `npm run icons` | Regenerate PWA icons from the pixel sprites. |

Debug jumps: `?debug=act2`, `act3`, `act4`, `terminus`.

## Layout

- `src/mission/`: one self-contained, JSON-serializable mission (economy, crew, directives, containment, story engine). No DOM, globals or wall-clock time, so a future "Boardroom" layer can run many in parallel.
- `src/core/`: game state (profile vs mission), loop/offline catch-up, saves + migrations, prestige, store.
- `src/data/`: content tables (generators, upgrades, crew, directives, story beats, archive files, sprites).
- `src/ui/`: framework-free DOM panels, canvas sprites, motion tracker, sound.
- `src/sim/`: the pacing bot used by `tests/sim/pacing.test.ts`.

## Docs

- [`docs/DESIGN.md`](docs/DESIGN.md): premise, systems, acts and pacing, prestige, UI direction.
- [`docs/BOARDROOM.md`](docs/BOARDROOM.md): the planned second-tier layer and the architecture rules it imposes.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): status, deviations from the plan, backlog, balance notes.
- [`CLAUDE.md`](CLAUDE.md): working rules (TDD, mobile + desktop, no backend, mission isolation).
