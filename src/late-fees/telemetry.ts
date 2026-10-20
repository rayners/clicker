import type { TelemetryEvent, TelemetryProps } from '../shared/telemetry';
import { ZONES } from '../late-fees-data/camp';
import type { LateGame } from './game';
import type { CampRun } from './state';

const minutes = (seconds: number) => Math.round(seconds / 60);

/** Sent with every event, so any one of them says where the player is. */
export function filmProperties(game: LateGame): TelemetryProps {
  const r = game.run;
  return { game: 'late-fees', venue: r.venue, killer: r.killer, part: r.config.part, act: r.act, sequels: game.profile.sequels };
}

/** Milestones between two successive states: tapes rented, acts, zones opened, films finished. */
export function filmEvents(prev: LateGame, next: LateGame): TelemetryEvent[] {
  if (next.profile.sequels > prev.profile.sequels) {
    const record = next.profile.history.at(-1)!;
    return [
      {
        name: 'film_completed',
        props: { ending: record.ending, venue: record.venue, bodyCount: record.bodyCount, minutes: minutes(record.duration), part: prev.run.config.part },
      },
    ];
  }
  const r = next.run;
  if (prev.shelf && !next.shelf) return [{ name: 'film_started', props: { venue: r.venue, killer: r.killer, part: r.config.part } }];
  if (r.seed !== prev.run.seed) return [];
  const events: TelemetryEvent[] = [];
  const at = { minutes: minutes(r.elapsed), part: r.config.part };
  if (r.act > prev.run.act) events.push({ name: 'act_reached', props: { act: r.act, venue: r.venue, killer: r.killer, ...at } });
  const was = prev.run as CampRun;
  const now = r as CampRun;
  if (now.deepest > was.deepest) events.push({ name: 'zone_opened', props: { zone: ZONES[now.deepest - 1]!.id, zones: now.deepest, ...at } });
  return events;
}
