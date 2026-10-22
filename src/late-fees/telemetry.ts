import { progressEvents, type TelemetryEvent, type TelemetryProps } from '../shared/telemetry';
import { ZONES } from '../late-fees-data/camp';
import { BEDS } from '../late-fees-data/clinic';
import { WARDS } from '../late-fees-data/asylum';
import type { LateGame } from './game';
import type { AsylumRun, CampRun, ClinicRun, InsurerRun } from './state';

const minutes = (seconds: number) => Math.round(seconds / 60);

/** Sent with every event, so any one of them says where the player is. */
export function filmProperties(game: LateGame): TelemetryProps {
  const r = game.run;
  return { game: 'late-fees', venue: r.venue, killer: r.killer, part: r.config.part, act: r.act, sequels: game.profile.sequels };
}

/** Milestones between two successive states: tapes rented, acts, camp zones and clinic beds opened, survivors lost, films finished. */
export function filmEvents(prev: LateGame, next: LateGame): TelemetryEvent[] {
  if (prev.cut && !next.cut) {
    const horror = prev.cut.killer;
    const legend = (next.profile.legend[horror] ?? 0) - (prev.profile.legend[horror] ?? 0);
    return [{ name: 'hunt_ended', props: { horror, harvest: Math.round(prev.cut.hunt.harvest), legend } }];
  }
  if (next.mode === 'cut' && next.cut) {
    if (prev.mode !== 'cut' || prev.cut?.killer !== next.cut.killer) return [{ name: 'cut_started', props: { killer: next.cut.killer } }];
    const h = next.cut.hunt;
    if (prev.cut && h.beaten > prev.cut.hunt.beaten) return [{ name: 'cut_beaten', props: { killer: next.cut.killer, beaten: h.beaten, harvest: Math.round(h.harvest) } }];
    return [];
  }
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
  if (r.venue === 'camp') {
    const was = prev.run as CampRun;
    const now = r as CampRun;
    if (now.deepest > was.deepest) events.push({ name: 'zone_opened', props: { zone: ZONES[now.deepest - 1]!.id, zones: now.deepest, ...at } });
  } else if (r.venue === 'clinic') {
    const was = prev.run as ClinicRun;
    const now = r as ClinicRun;
    for (const b of BEDS) {
      if ((now.beds[b.id] ?? 0) > 0 && (was.beds[b.id] ?? 0) === 0) events.push({ name: 'bed_opened', props: { bed: b.id, ...at } });
    }
  } else if (r.venue === 'asylum') {
    const was = prev.run as AsylumRun;
    const now = r as AsylumRun;
    for (const w of WARDS) {
      if ((now.wards[w.id] ?? 0) > 0 && (was.wards[w.id] ?? 0) === 0) events.push({ name: 'ward_opened', props: { ward: w.id, ...at } });
    }
    if (now.escapes > was.escapes) events.push({ name: 'patient_escaped', props: { escapes: now.escapes, loose: now.loose, ...at } });
  } else if (r.venue === 'insurer') {
    const was = prev.run as InsurerRun;
    const now = r as InsurerRun;
    // Skips rotate the list without shortening it; only a death shortens it.
    if (now.list.length < was.list.length) {
      const lost = was.list.find((n) => !now.list.includes(n));
      if (lost) events.push({ name: 'survivor_lost', props: { survivor: lost, left: now.list.length, ...at } });
    }
  }
  events.push(...progressEvents(prev.run, r, r.elapsed));
  return events;
}
