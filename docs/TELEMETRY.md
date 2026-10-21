# Telemetry

Anonymous play analytics and error reports go to PostHog (US cloud, free tier). The point is to check the pacing targets
with real players and to catch errors on devices we don't test on.

## Rules

- **Published site only.** `telemetryAllowed` (`src/shared/telemetry.ts`) refuses dev builds, localhost and LAN hosts,
  and any `?debug=` URL.
- **Opt-out.** The "SHARE ANONYMOUS PLAY DATA" box in either game's settings is one switch per device
  (localStorage `clicker.telemetry`). It is checked when each event is sent, so turning it off takes effect immediately.
- **Anonymous.** No cookies (PostHog persists a random id in localStorage), no person profiles, no autocapture, no
  pageview autocapture, no session replay, no remote scripts (`disable_external_dependency_loading`), no feature flags.
- **What PostHog still sees.** The random id ties one browser's events together, so a single player's run can be
  followed event by event (on purpose: that is how individual play is read). PostHog itself adds browser, OS, device
  type, screen size, page URL, referrer and a GeoIP country and city to each event. The project discards IP addresses
  ("Discard client IP data", on since 2026-10-21), so the IP itself is not stored.
- **Out of the simulation.** Events are derived by diffing successive store states (`src/core/telemetry.ts`,
  `src/forest/telemetry.ts`, both pure). Nothing under `src/mission/` or the forest simulation calls PostHog.
- **Never in the way.** The SDK is a lazily loaded chunk; events buffer (bounded) until it arrives; sink failures are
  swallowed; offline means events are simply lost.

## Events

Every event carries the game's context: `game` (`deep-contract` | `elderdark` | `late-fees`), `act`, and `scenario`/`horror`/`cycle`
(DEEP CONTRACT) or `charter` (Elderdark). `minutes` is in-game time on the current contract or charter.

| Game | Event | Properties |
|---|---|---|
| both | `game_opened` | (context only) |
| both | `$exception` | uncaught errors and unhandled rejections |
| DEEP CONTRACT | `contract_started` | scenario, horror, reason (`start` / `renewal` / `reassign`) |
| DEEP CONTRACT | `act_reached` | act, minutes |
| DEEP CONTRACT | `contract_abandoned` | scenario, horror, act, minutes (reassignment) |
| DEEP CONTRACT | `contract_completed` | ending, scenario, minutes, crewSurvived |
| DEEP CONTRACT | `sector_secured` | sector, sectors (how many reached), minutes (security contracts) |
| DEEP CONTRACT | `creature_started` | (Special Order 0-77 accepted: playing as the creature) |
| DEEP CONTRACT | `creature_vented` | vented (times a WARDEN vented its decks on the creature), harvest |
| Elderdark | `region_opened` | region, minutes |
| Elderdark | `act_reached` | act, minutes |
| Elderdark | `key_fragment_found` | fragments, minutes |
| Elderdark | `charter_completed` | ending, minutes, relics, dead |
| Elderdark | `wood_started` | (playing as the wood) |
| Elderdark | `wood_beaten` | beaten (times a charter beat the wood back), harvest |
| LATE FEES | `film_started` | venue, killer, part |
| LATE FEES | `act_reached` | act, venue, killer, part, minutes |
| LATE FEES | `zone_opened` | zone, zones, minutes, part (Camp Blackwater) |
| LATE FEES | `bed_opened` | bed, minutes, part (the first of each kind of bed at the sleep clinic) |
| LATE FEES | `cut_started` | killer (the tape flipped to the Killer's Cut) |
| LATE FEES | `cut_beaten` | killer, beaten (times put down), harvest |
| LATE FEES | `survivor_lost` | survivor, left (names still on the list), minutes, part (Providence Mutual) |
| LATE FEES | `film_completed` | ending, venue, bodyCount, minutes, part |

Useful PostHog insights: a funnel `act_reached` (act = 2, 3, 4) → `contract_completed`, broken down by scenario; the
median `minutes` on `act_reached` per act against the targets in `docs/DESIGN.md`.

## Not done yet

- Source maps for readable stack traces (needs a PostHog personal API key as a GitHub secret and an upload step).
- A build/release id on events.
