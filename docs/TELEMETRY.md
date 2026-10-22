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
- **The walkthrough is the one exception to state diffs:** its progress is kept per device, outside the save, so the
  guide view announces `guide_step` and `guide_skipped` on the document (`announce` in `src/shared/telemetry.ts`) and
  `startAnalytics` forwards them through the same opt-out gate.
- **Never in the way.** The SDK is a lazily loaded chunk; events buffer (bounded) until it arrives; sink failures are
  swallowed; offline means events are simply lost.

## Events

Every event carries the game's context: `game` (`deep-contract` | `elderdark` | `late-fees` | `fathom`), `act`, and `scenario`/`horror`/`cycle`
(DEEP CONTRACT) or `site`/`charter` (Elderdark). `minutes` is in-game time on the current contract or charter.

| Game | Event | Properties |
|---|---|---|
| picker | `site_opened` | game `picker` only. The front page's one event, so a player's first step carries the outside referrer (`$referring_domain`) |
| all | `game_opened` | (context only) |
| all | `$exception` | uncaught errors and unhandled rejections |
| all | `sitting_ended` | seconds (how long the game was in view before a tab switch, the phone locking or closing) |
| all | `upgrade_bought` | upgrade (id), upgrades (how many owned), minutes (to a tenth). Fills the time before the first milestone |
| all | `beat_seen` | beat (story beat id), minutes (to a tenth) |
| all | `guide_step` | guide (its progress key, e.g. `latefees.guide`, `elderdark.wood.guide`), step (id), how (`done`: the player used the lever; `dismissed`: tapped GOT IT). Once per step per device |
| all | `guide_skipped` | guide, step (the one showing when the player tapped SKIP GUIDE) |
| DEEP CONTRACT | `contract_started` | scenario, horror, reason (`start` / `renewal` / `reassign`) |
| DEEP CONTRACT | `act_reached` | act, minutes |
| DEEP CONTRACT | `contract_abandoned` | scenario, horror, act, minutes (reassignment) |
| DEEP CONTRACT | `contract_completed` | ending, scenario, minutes, crewSurvived |
| DEEP CONTRACT | `sector_secured` | sector, sectors (how many reached), minutes (security contracts) |
| DEEP CONTRACT | `compartment_opened` | compartment, compartments (how many reached), breaches (so far), minutes (salvage contracts) |
| DEEP CONTRACT | `leg_completed` | station (or depot), legs, onTime (inside the window), minutes (haulage and overland contracts) |
| DEEP CONTRACT | `crew_turned` | crewTurned (how many named crew have turned), minutes (outbreak contracts) |
| DEEP CONTRACT | `lockdown_used` | lockdowns (so far), minutes (outbreak contracts) |
| DEEP CONTRACT | `creature_started` | (Special Order 0-77 accepted: playing as the creature) |
| DEEP CONTRACT | `creature_vented` | vented (times a WARDEN vented its decks on the creature), harvest |
| DEEP CONTRACT | `hunter_started` | (none): the player accepted the hunt |
| DEEP CONTRACT | `hunter_driven` | driven (times a crew drove the hunter off), harvest |
| every game | `hunt_ended` | horror (`creature`, `hunter`, `wood`, `dragon`, `source`, or a LATE FEES killer), harvest, legend (earned by ending it) |
| Elderdark | `region_opened` | region, minutes (forest charters) |
| Elderdark | `floor_secured` | floor, floors (how deep), minutes (Keep charters; each floor once, however often it is lost and retaken) |
| Elderdark | `act_reached` | act, minutes |
| Elderdark | `key_fragment_found` | fragments, minutes |
| Elderdark | `charter_completed` | ending, minutes, relics, dead |
| Elderdark | `wood_started` | (playing as the wood) |
| Elderdark | `wood_beaten` | beaten (times a charter beat the wood back), harvest |
| Elderdark | `dragon_started` | (none): the player woke the dragon |
| Elderdark | `dragon_beaten` | beaten (times a charter's reckoning drove the dragon to its lair), harvest |
| LATE FEES | `film_started` | venue, killer, part |
| LATE FEES | `act_reached` | act, venue, killer, part, minutes |
| LATE FEES | `zone_opened` | zone, zones, minutes, part (Camp Blackwater) |
| LATE FEES | `bed_opened` | bed, minutes, part (the first of each kind of bed at the sleep clinic) |
| LATE FEES | `ward_opened` | ward, minutes, part (the first of each kind of ward at Grayhaven) |
| LATE FEES | `patient_escaped` | escapes (so far), loose (still out), minutes, part (Grayhaven) |
| LATE FEES | `cut_started` | killer (the tape flipped to the Killer's Cut) |
| LATE FEES | `cut_beaten` | killer, beaten (times put down), harvest |
| LATE FEES | `survivor_lost` | survivor, left (names still on the list), minutes, part (Providence Mutual) |
| DOWN THERE (`game: 'fathom'`) | `zone_reached` | zone (`shelf`, `open-water`, `trench`), minutes, season |
| DOWN THERE (`game: 'fathom'`) | `act_reached` | act, minutes, season |
| DOWN THERE (`game: 'fathom'`) | `landfall` | category (2–5; the first comes with act 4), minutes, season |
| DOWN THERE (`game: 'fathom'`) | `season_completed` | ending (`close`, `study`, `through`), minutes, lost, season |
| DOWN THERE (`game: 'fathom'`) | `deep_started` | (none): the player answered the Source |
| DOWN THERE (`game: 'fathom'`) | `deep_beaten` | beaten (times a town's season end beat the Source back), harvest |
| LATE FEES | `film_completed` | ending, venue, bodyCount, minutes, part |

Useful PostHog insights: a funnel `act_reached` (act = 2, 3, 4) → `contract_completed`, broken down by scenario; the
median `minutes` on `act_reached` per act against the targets in `docs/DESIGN.md`.

## Not done yet

- Source maps for readable stack traces (needs a PostHog personal API key as a GitHub secret and an upload step).
- A build/release id on events.
