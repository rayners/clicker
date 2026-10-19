# Roadmap and status

The original plan had 8 implementation steps, each done test-first.

| # | Step | Status |
|---|---|---|
| 1 | Scaffold: Vite + TS, vitest + jsdom, Playwright (desktop + iPhone), fonts, git | done |
| 2 | Core: format, seeded RNG, profile/mission split, economy, `tickMission`, saves + migrations + corruption fallback, offline catch-up, mission isolation test | done |
| 3 | UI shell: mobile-first layout, status, drill, log, tabs, lifecycle saves, first e2e journey | done |
| 4 | Sprites + CRT theme; generator/upgrade tables; crew; directives | done |
| 5 | Story engine + Acts I–II | done |
| 6 | Specimens/containment + Acts III–IV, theme shifts, sprite corruption, archive | done |
| 7 | Prestige: endings, persistent currencies, repeat-contract story | done |
| 8 | PWA, settings (sound, reduced motion, export/import, hard reset), pacing simulator + balance | done |

## Deviations from the original plan (deliberate)

- **Folder layout:** mission logic lives in `src/mission/` (not `src/systems/`) to keep a mission self-contained for the Boardroom. Story beats are in `src/data/story.ts` (one file, grouped by act), not one file per act.
- **No generic Layer interface yet** (see `docs/BOARDROOM.md`). It was in the plan but has no consumer, so TDD argued against it.
- **Crew have no supplies or morale.** Fatigue plus thaw cost provide the tension instead.
- **Crew roster does not change between contracts.** Instead, the identical manifest is a horror beat.
- **Light-lag** is narrative flavour on corporate messages (and its absence is the Act III tell), not a mechanic. There is no "comms relay" upgrade.
- **Debug mode** is URL scenario jumps only (`?debug=act2|act3|act4|terminus`).
- **iPhone e2e** runs on Chromium with iPhone 13 emulation, because the host lacks WebKit system libraries (`sudo npx playwright install-deps webkit`, then `E2E_WEBKIT=1`).

## Backlog / ideas

- **Real-device pass on iPhone Safari**, both in-browser and installed to the home screen (offline, audio unlock, safe areas, storage persistence).
- Debug extras from the plan: a time-scale multiplier, grant resources, a story flag viewer.
- Run WebKit e2e once host dependencies are installed.
- More late-cycle story: tells starting earlier and multiplying on repeat contracts, new layers per cycle, and the true-ending thread where WARDEN subverts the Combine. The game stays playable afterwards.
- Sinister directives during Acts III–IV (the directive table currently ends at KA-008).
- Sound polish: an ambient hum per act, and a typewriter cadence tied to the print animation.
- An optional first-load boot sequence animation.
- The **Boardroom** layer (`docs/BOARDROOM.md`).

## Balance notes

Re-run `npm run simulate` after any economy change. The current first-contract timings (all seeds) are: Act II 54m, Act III 2h29m, Act IV 3h08m, Terminus 4h23m. A repeat contract with Seniority 3 is faster.

Levers, roughly in order of impact:
- generator `baseRate`
- the depth curve constants in `src/mission/progress.ts`
- Special Projects costs and strain in `src/mission/containment.ts`
- the Terminus rules in `src/data/story.ts`
