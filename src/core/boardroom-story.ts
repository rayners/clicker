import { CREW } from '../data/crew';
import { BOARD_BEATS, type BoardStoryArgs } from '../data/boardroom/story';
import { runBeats } from '../engine/story';
import type { BoardLogKind, BoardroomState } from './boardroom';
import type { GameState } from './game';

/** Seconds between the Board's ordinary beats. */
const BOARD_MIN_GAP = 30;
const FALLBACK_SHIP = 'MSV CALLOWAY REACH';

/** The Board's words, from the player's own record: the contracts they ran, the crews they lost. */
export function boardLexicon(b: BoardroomState, game: GameState): Record<string, string> {
  const records = [...game.profile.history, ...b.ledger];
  const lost = records.reduce((n, r) => n + (CREW.length - r.crewSurvived), 0);
  const worst = [...game.profile.history].filter((r) => r.crewSurvived < CREW.length).at(-1) ?? game.profile.history.at(-1);
  const callsign = CREW[game.profile.contractsCompleted % CREW.length]!.callsign;
  return {
    pastShip: (worst?.shipName ?? FALLBACK_SHIP).toUpperCase(),
    callsign,
    contracts: String(game.profile.contractsCompleted),
    lost: String(lost),
  };
}

export function runBoardStory(b: BoardroomState, game: GameState): BoardroomState {
  return runBeats<BoardLogKind, BoardroomState, BoardStoryArgs>(b, BOARD_BEATS, { b }, { minGap: BOARD_MIN_GAP, lexicon: boardLexicon(b, game) });
}
