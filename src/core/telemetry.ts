import type { TelemetryEvent, TelemetryProps } from '../shared/telemetry';
import type { GameState } from './game';

const minutes = (seconds: number) => Math.round(seconds / 60);

/** Sent with every event, so any one of them says where the player is. */
export function contractProperties(game: GameState): TelemetryProps {
  const m = game.mission;
  return { game: 'deep-contract', scenario: m.scenario, horror: m.horror, act: m.act, cycle: game.profile.contractsCompleted };
}

/** Milestones between two successive states: contracts started, abandoned and completed, and acts reached. */
export function contractEvents(prev: GameState, next: GameState): TelemetryEvent[] {
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
  } else if (m.seed === prev.mission.seed && m.act > prev.mission.act) {
    events.push({ name: 'act_reached', props: { act: m.act, scenario: m.scenario, horror: m.horror, minutes: minutes(m.elapsed), cycle } });
  }
  return events;
}
