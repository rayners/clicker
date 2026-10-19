import { simulateRun } from '../src/sim/bot';
import { formatDuration, formatNumber } from '../src/core/format';
import { depth } from '../src/mission/extraction/progress';

const seeds = [1, 7, 42];
for (const seed of seeds) {
  const started = performance.now();
  const run = simulateRun({ seed, maxSeconds: 10 * 3600 });
  const m = run.final.mission;
  const at = (s?: number) => (s === undefined ? 'never' : formatDuration(s));
  console.log(
    `seed ${seed}: act2 ${at(run.actAt[2])} | act3 ${at(run.actAt[3])} | act4 ${at(run.actAt[4])} | terminus ${at(run.terminusAt)}` +
      ` | depth ${depth(m)}m ore ${formatNumber(m.lifetimeOre)} specimens ${Math.floor(m.specimens)} contacts ${m.contacts}` +
      ` | ${Math.round(performance.now() - started)}ms`,
  );
}
