import { formatDuration, formatNumber } from '../src/engine/format';
import { simulateClips } from '../src/clips/bot';

const at = (s?: number) => (s === undefined ? 'never' : formatDuration(s));
for (const seed of [1, 7, 42]) {
  const run = simulateClips({ seed, maxSeconds: 6 * 3600 });
  const w = run.final.works;
  console.log(
    `seed ${seed}: first autoclipper ${at(run.firstAt.firstClipper)} act2 ${at(run.actAt[2])} act3 ${at(run.actAt[3])} million ${at(run.doneAt)} | clippers ${w.autoclippers} marketing ${w.marketing} price $${w.price.toFixed(2)} funds $${formatNumber(w.funds)}`,
  );
}
