import { progressEvents, type TelemetryEvent, type TelemetryProps } from '../shared/telemetry';
import { REGIONS } from '../forest-data/regions';
import { FLOORS } from '../forest-data/keep';
import { isRegionOpen } from './company';
import type { ForestGame } from './game';

const minutes = (seconds: number) => Math.round(seconds / 60);

/** Sent with every event, so any one of them says where the player is. */
export function charterProperties(game: ForestGame): TelemetryProps {
  return { game: 'elderdark', site: game.company.site, act: game.company.act, charter: game.company.charter.number };
}

/** Milestones between two successive states: regions opened, acts reached, Key fragments found, charters completed, and the wood's and dragon's hunts. */
export function charterEvents(prev: ForestGame, next: ForestGame): TelemetryEvent[] {
  if (next.mode === 'dragon' && next.dragon) {
    if (prev.mode !== 'dragon') return [{ name: 'dragon_started', props: {} }];
    const h = next.dragon.hunt;
    if (prev.dragon && h.beaten > prev.dragon.hunt.beaten) return [{ name: 'dragon_beaten', props: { beaten: h.beaten, harvest: Math.round(h.harvest) } }];
    return [];
  }
  if (next.mode === 'wood' && next.wood) {
    if (prev.mode !== 'wood') return [{ name: 'wood_started', props: {} }];
    const h = next.wood.hunt;
    if (prev.wood && h.beaten > prev.wood.hunt.beaten) return [{ name: 'wood_beaten', props: { beaten: h.beaten, harvest: Math.round(h.harvest) } }];
    return [];
  }
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
  if (c.site === 'keep') {
    // The delve only ever deepens, so a floor lost and retaken is not reported twice.
    FLOORS.forEach((floor, i) => {
      if (floor.leagues > was.charted && floor.leagues <= c.charted) events.push({ name: 'floor_secured', props: { floor: floor.id, floors: i + 1, ...at } });
    });
  } else {
    for (const region of REGIONS) {
      if (isRegionOpen(c, region) && !isRegionOpen(was, region)) events.push({ name: 'region_opened', props: { region: region.id, ...at } });
    }
  }
  if (c.act > was.act) events.push({ name: 'act_reached', props: { act: c.act, ...at } });
  if (c.keyFragments > was.keyFragments) events.push({ name: 'key_fragment_found', props: { fragments: c.keyFragments, ...at } });
  events.push(...progressEvents(was, c, c.elapsed));
  return events;
}
