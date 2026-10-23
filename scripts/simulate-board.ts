import { simulateBoard } from '../src/sim/board-bot';
import { formatDuration, formatNumber } from '../src/engine/format';

for (const seed of [1, 7, 42]) {
  const started = performance.now();
  const run = simulateBoard({ seed, maxSeconds: 8 * 3600 });
  const b = run.final.boardroom!;
  const at = (s?: number) => (s === undefined ? 'never' : formatDuration(s));
  console.log(
    `board seed ${seed}: act2 ${at(run.actAt[2])} | act3 ${at(run.actAt[3])} | act4 ${at(run.actAt[4])} | term ${at(run.termAt)}` +
      ` | value ${formatNumber(b.lifetimeValue)} delivered ${b.ledger.length} slots ${b.slots} inquiries ${b.inquiries} | ${Math.round(performance.now() - started)}ms`,
  );
}
