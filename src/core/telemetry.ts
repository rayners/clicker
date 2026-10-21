import type { TelemetryEvent, TelemetryProps } from '../shared/telemetry';
import type { GameState } from './game';
import { SECTIONS } from '../data/security/systems';
import { isSecurity } from '../mission/state';

const minutes = (seconds: number) => Math.round(seconds / 60);

/** Sent with every event, so any one of them says where the player is. */
export function contractProperties(game: GameState): TelemetryProps {
  const m = game.mission;
  return { game: 'deep-contract', scenario: m.scenario, horror: m.horror, act: m.act, cycle: game.profile.contractsCompleted };
}

/** Milestones between two successive states: contracts started, abandoned and completed, acts reached, and the creature's hunt. */
export function contractEvents(prev: GameState, next: GameState): TelemetryEvent[] {
  if (next.mode === 'creature' && next.creature) {
    if (prev.mode !== 'creature') return [{ name: 'creature_started', props: {} }];
    const h = next.creature.hunt;
    if (prev.creature && h.beaten > prev.creature.hunt.beaten) return [{ name: 'creature_vented', props: { vented: h.beaten, harvest: Math.round(h.harvest) } }];
    return [];
  }
  const events: TelemetryEvent[] = [];
  const m = next.mission;
  const cycle = next.profile.contractsCompleted;

  if (next.profile.contractsCompleted > prev.profile.contractsCompleted) {
    const record = next.profile.history.at(-1)!;
    events.push({
      name: 'contract_completed',
      props: { ending: record.ending, scenario: record.scenario, minutes: minutes(record.duration), crewSurvived: record.crewSurvived, cycle },
    });
  } else if (prev.assigning && !next.assigning && m !== prev.mission) {
    if (prev.assigning === 'reassign') {
      const old = prev.mission;
      events.push({ name: 'contract_abandoned', props: { scenario: old.scenario, horror: old.horror, act: old.act, minutes: minutes(old.elapsed), cycle } });
    }
    events.push({ name: 'contract_started', props: { scenario: m.scenario, horror: m.horror, reason: prev.assigning, cycle } });
  } else if (m.seed === prev.mission.seed) {
    if (m.act > prev.mission.act) {
      events.push({ name: 'act_reached', props: { act: m.act, scenario: m.scenario, horror: m.horror, minutes: minutes(m.elapsed), cycle } });
    }
    const was = prev.mission;
    if (isSecurity(m) && isSecurity(was) && m.deepest > was.deepest) {
      const sector = SECTIONS[m.deepest - 1]!.id;
      events.push({ name: 'sector_secured', props: { sector, sectors: m.deepest, minutes: minutes(m.elapsed), horror: m.horror, cycle } });
    }
  }
  return events;
}
