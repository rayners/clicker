import { simulateFathom } from '../src/fathom/bot';
import { formatDuration, formatNumber } from '../src/shared/format';
import { depth } from '../src/fathom/depth';
import { citiesHeld } from '../src/fathom/breach';

const hours = Number(process.argv[2] ?? 7);
for (const seed of [1, 7, 42]) {
  const started = performance.now();
  const run = simulateFathom({ seed, maxSeconds: hours * 3600 });
  const o = run.final.outfit;
  const at = (s?: number) => (s === undefined ? 'never' : formatDuration(s));
  console.log(
    `seed ${seed}: act2 ${at(run.actAt[2])} act3 ${at(run.actAt[3])} act4 ${at(run.actAt[4])} end ${at(run.terminusAt)} | depth ${depth(o)} lost ${o.bodyCount} cities ${citiesHeld(o)} cat ${o.category} upgrades ${o.upgrades.length} cash ${formatNumber(o.cash)} | ${Math.round(performance.now() - started)}ms`,
  );
}
