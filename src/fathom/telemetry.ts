import type { TelemetryEvent, TelemetryProps } from '../engine/telemetry';
import { depth } from './depth';
import { LEGEND_KEY } from './deep';
import type { FathomGame } from './game';
import { SHELF_OPENS_AT } from '../fathom-data/shelf';
import { OPEN_WATER_AT } from '../fathom-data/open-water';
import { TRENCH_AT } from '../fathom-data/trench';

const minutes = (seconds: number) => Math.round(seconds / 60);
const ZONES: [string, number][] = [
  ['shelf', SHELF_OPENS_AT],
  ['open-water', OPEN_WATER_AT],
  ['trench', TRENCH_AT],
];

/** Sent with every event, so any one of them says where the player is. */
export function seasonProperties(game: FathomGame): TelemetryProps {
  return { game: 'fathom', act: game.outfit.act, season: game.outfit.terms.season };
}

/** Milestones between two successive states: zones reached, acts, landfalls, seasons ended, and the Source's hunt. */
export function seasonEvents(prev: FathomGame, next: FathomGame): TelemetryEvent[] {
  if (prev.deep && !next.deep) {
    const legend = (next.profile.legend[LEGEND_KEY] ?? 0) - (prev.profile.legend[LEGEND_KEY] ?? 0);
    return [{ name: 'hunt_ended', props: { horror: 'source', harvest: Math.round(prev.deep.hunt.harvest), legend } }];
  }
  if (next.mode === 'deep' && next.deep) {
    if (prev.mode !== 'deep') return [{ name: 'deep_started', props: {} }];
    const h = next.deep.hunt;
    if (prev.deep && h.beaten > prev.deep.hunt.beaten) return [{ name: 'deep_beaten', props: { beaten: h.beaten, harvest: Math.round(h.harvest) } }];
    return [];
  }
  const was = prev.outfit;
  if (next.profile.seasons > prev.profile.seasons) {
    const record = next.profile.history.at(-1)!;
    return [{ name: 'season_completed', props: { ending: record.ending, minutes: minutes(record.duration), lost: record.bodyCount, season: was.terms.season } }];
  }
  const o = next.outfit;
  if (o.seed !== was.seed) return [];
  const at = { minutes: minutes(o.elapsed), season: o.terms.season };
  const events: TelemetryEvent[] = [];
  const before = depth(was);
  const now = depth(o);
  for (const [zone, opens] of ZONES) if (before < opens && now >= opens) events.push({ name: 'zone_reached', props: { zone, ...at } });
  if (o.act > was.act) events.push({ name: 'act_reached', props: { act: o.act, ...at } });
  if (o.category > was.category && was.category > 0) events.push({ name: 'landfall', props: { category: o.category, ...at } });
  return events;
}
