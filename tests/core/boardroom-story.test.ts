import { describe, it, expect } from 'vitest';
import { createGame, type ContractRecord, type GameState } from '../../src/core/game';
import { createBoardroom, type BoardroomState } from '../../src/core/boardroom';
import { boardLexicon, runBoardStory } from '../../src/core/boardroom-story';
import { BOARD_BEATS } from '../../src/data/boardroom/story';
import { placeholders } from '../../src/shared/lexicon';

const record = (shipName: string, crewSurvived: number): ContractRecord => ({
  scenario: 'extraction',
  horror: 'organism',
  shipName,
  ending: 'deliver',
  output: 1,
  outputUnit: 'T',
  specimens: 0,
  crewSurvived,
  duration: 1,
});
const veteranGame = (): GameState => {
  const g = createGame(1, 0);
  return { ...g, profile: { ...g.profile, contractsCompleted: 12, history: [record('MSV Old Faithful', 7), record('MSV Halden Pike', 3)] } };
};
/** Runs the story for a while, one beat per call, with time passing between them. */
function play(b: BoardroomState, game: GameState, calls = 40): BoardroomState {
  let next = b;
  for (let i = 0; i < calls; i++) next = runBoardStory({ ...next, elapsed: next.elapsed + 120 }, game);
  return next;
}

describe('the Boardroom story', () => {
  it('builds its words from the player\'s own record: a ship that lost crew, a callsign, the count and the dead', () => {
    const lex = boardLexicon(createBoardroom(1), veteranGame());
    expect(lex.pastShip).toBe('MSV HALDEN PIKE');
    expect(lex.contracts).toBe('12');
    expect(lex.lost).toBe('4');
    expect(lex.callsign!.length).toBeGreaterThan(0);
  });

  it('has a word for every placeholder its beats use', () => {
    const lex = boardLexicon(createBoardroom(1), veteranGame());
    const used = new Set(BOARD_BEATS.flatMap((b) => b.entries.flatMap((e) => placeholders(e.text))));
    for (const k of used) expect(lex).toHaveProperty(k);
  });

  it('opens with a welcome from the Chair and stays in act one until contracts are delivered', () => {
    const b = play(createBoardroom(1), veteranGame(), 5);
    expect(b.act).toBe(1);
    expect(b.log.map((e) => e.text).join(' ')).toMatch(/WELCOME/);
  });

  it('finds the player\'s own crews on new manifests in act two, each with a mundane excuse', () => {
    const b = play({ ...createBoardroom(1), lifetimeValue: 6e6, ledger: [record('X', 7)] }, veteranGame());
    expect(b.act).toBe(2);
    const text = b.log.map((e) => e.text).join(' ');
    expect(text).toContain('MSV HALDEN PIKE');
    expect(text).not.toMatch(/\{[a-zA-Z]+\}/);
    const act2 = BOARD_BEATS.filter((x) => x.act === 2).flatMap((x) => x.entries.map((e) => e.text)).join(' ');
    expect(act2).not.toMatch(/RECONDITION|CONSUMABLE/);
  });

  it('turns up WARDEN\'s own reconditioning order in act three, and puts attrition on the agenda in act four', () => {
    const three = play({ ...createBoardroom(1), act: 2, lifetimeValue: 4e7, ledger: [record('A', 7), record('B', 7), record('C', 7)] }, veteranGame());
    expect(three.act).toBe(3);
    expect(three.log.map((e) => e.text).join(' ')).toMatch(/RECONDITIONING ORDER/);
    const four = play({ ...three, lifetimeValue: 2e8 }, veteranGame());
    expect(four.act).toBe(4);
    expect(four.log.map((e) => e.text).join(' ')).toMatch(/ATTRITION/);
  });
});

describe('the end of a term', () => {
  it('comes after the agenda has been read long enough', () => {
    const four = { ...createBoardroom(1), act: 4, beats: { 'br-a4-entry': 0 }, elapsed: 0, lifetimeValue: 1e8 };
    const ended = play(four, veteranGame(), 60);
    expect(ended.flags).toContain('term-end');
  });
});
