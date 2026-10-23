import { CREW } from '../data/crew';
import { TESTIFY_CONSCIENCE } from './boardroom';
import { progressEvents, type TelemetryEvent, type TelemetryProps } from '../engine/telemetry';
import type { GameState } from './game';
import { SECTIONS } from '../data/security/systems';
import { COMPARTMENTS } from '../data/salvage/systems';
import { isHaulage, isOutbreak, isSalvage, isSecurity } from '../mission/state';
import { profileOf } from '../mission/haulage/profiles';

const minutes = (seconds: number) => Math.round(seconds / 60);

/** Sent with every event, so any one of them says where the player is. */
export function contractProperties(game: GameState): TelemetryProps {
  const m = game.mission;
  return { game: 'deep-contract', scenario: m.scenario, horror: m.horror, act: m.act, cycle: game.profile.contractsCompleted };
}

/** Milestones between two successive states: contracts started, abandoned and completed, acts reached, and the creature's and the hunter's hunts. */
/** The Boardroom: promotion, the contracts it closes, its inquiries, and the end of a term (docs/BOARDROOM.md). */
function boardEvents(prev: GameState, next: GameState): TelemetryEvent[] {
  const b = next.boardroom;
  const was = prev.boardroom;
  if (!b) return [];
  if (!was) return [{ name: 'boardroom_entered', props: { term: b.term } }];
  if (next.profile.boardTerms > prev.profile.boardTerms) {
    // Read from what the ending changed, so a term ended the same way twice is still named.
    const ending = next.profile.dividends > prev.profile.dividends ? 'chair' : next.profile.conscience - prev.profile.conscience > TESTIFY_CONSCIENCE ? 'release' : 'testify';
    return [{ name: 'term_ended', props: { ending, terms: next.profile.boardTerms, dividends: next.profile.dividends } }];
  }
  const minutes = Math.round(b.elapsed / 60);
  const events: TelemetryEvent[] = b.ledger.slice(was.ledger.length).map((r, i) => ({
    name: 'board_contract_delivered',
    props: { scenario: r.scenario, horror: r.horror, ending: r.ending, crewLost: CREW.length - r.crewSurvived, delivered: was.ledger.length + i + 1, minutes },
  }));
  if (b.inquiries > was.inquiries) events.push({ name: 'inquiry_opened', props: { inquiries: b.inquiries, minutes } });
  return events;
}

export function contractEvents(prev: GameState, next: GameState): TelemetryEvent[] {
  const board = boardEvents(prev, next);
  if (board.length > 0 || next.mode === 'boardroom') return board;
  for (const [horror, before, after] of [
    ['creature', prev.creature, next.creature],
    ['hunter', prev.hunter, next.hunter],
  ] as const) {
    if (before && !after) {
      const legend = (next.profile.legend[horror] ?? 0) - (prev.profile.legend[horror] ?? 0);
      return [{ name: 'hunt_ended', props: { horror, harvest: Math.round(before.hunt.harvest), legend } }];
    }
  }
  if (next.mode === 'hunter' && next.hunter) {
    if (prev.mode !== 'hunter') return [{ name: 'hunter_started', props: {} }];
    const h = next.hunter.hunt;
    if (prev.hunter && h.beaten > prev.hunter.hunt.beaten) return [{ name: 'hunter_driven', props: { driven: h.beaten, harvest: Math.round(h.harvest) } }];
    return [];
  }
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
    if (isSalvage(m) && isSalvage(was) && m.deepest > was.deepest) {
      const compartment = COMPARTMENTS[m.deepest - 1]!.id;
      events.push({ name: 'compartment_opened', props: { compartment, compartments: m.deepest, breaches: m.breaches, minutes: minutes(m.elapsed), horror: m.horror, cycle } });
    }
    if (isHaulage(m) && isHaulage(was) && m.leg > was.leg) {
      const onTime = m.onTime > was.onTime;
      events.push({ name: 'leg_completed', props: { station: profileOf(m).station(m.leg - 1), legs: m.leg, onTime, minutes: minutes(m.elapsed), horror: m.horror, cycle } });
    }
    if (isOutbreak(m) && isOutbreak(was)) {
      if (m.crewTurned > was.crewTurned) events.push({ name: 'crew_turned', props: { crewTurned: m.crewTurned, minutes: minutes(m.elapsed), horror: m.horror, cycle } });
      if (m.lockdowns > was.lockdowns) events.push({ name: 'lockdown_used', props: { lockdowns: m.lockdowns, minutes: minutes(m.elapsed), horror: m.horror, cycle } });
    }
    events.push(...progressEvents(was, m, m.elapsed));
  }
  return events;
}
