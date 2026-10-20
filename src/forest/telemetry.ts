import type { TelemetryEvent, TelemetryProps } from '../shared/telemetry';
import { REGIONS } from '../forest-data/regions';
import { isRegionOpen } from './company';
import type { ForestGame } from './game';

const minutes = (seconds: number) => Math.round(seconds / 60);

/** Sent with every event, so any one of them says where the player is. */
export function charterProperties(game: ForestGame): TelemetryProps {
  return { game: 'elderdark', act: game.company.act, charter: game.company.charter.number };
}

/** Milestones between two successive states: regions opened, acts reached, Key fragments found, charters completed. */
export function charterEvents(prev: ForestGame, next: ForestGame): TelemetryEvent[] {
  if (next.profile.chartersCompleted > prev.profile.chartersCompleted) {
    const record = next.profile.history.at(-1)!;
    const props = { ending: record.ending, minutes: minutes(record.duration), relics: record.relics, dead: record.dead, charter: prev.company.charter.number };
    return [{ name: 'charter_completed', props }];
  }
  const was = prev.company;
  const c = next.company;
  if (c.seed !== was.seed) return [];
  const at = { minutes: minutes(c.elapsed), charter: c.charter.number };
  const events: TelemetryEvent[] = [];
  for (const region of REGIONS) {
    if (isRegionOpen(c, region) && !isRegionOpen(was, region)) events.push({ name: 'region_opened', props: { region: region.id, ...at } });
  }
  if (c.act > was.act) events.push({ name: 'act_reached', props: { act: c.act, ...at } });
  if (c.keyFragments > was.keyFragments) events.push({ name: 'key_fragment_found', props: { fragments: c.keyFragments, ...at } });
  return events;
}
