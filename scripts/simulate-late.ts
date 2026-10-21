import { simulateLate } from '../src/late-fees/bot';
import { formatDuration, formatNumber } from '../src/shared/format';
import { incomeRate, lightDemand, lightSupply, prepForce, staff } from '../src/late-fees/camp/economy';
import { held } from '../src/shared/ground';
import type { CampRun } from '../src/late-fees/state';

const trace = process.argv.includes('--trace');
const venue = (process.argv.find((a) => a === 'camp' || a === 'clinic' || a === 'insurer') ?? 'camp') as 'camp' | 'clinic' | 'insurer';
for (const seed of [1, 7, 42]) {
  const started = performance.now();
  const run = simulateLate({
    seed,
    venue,
    maxSeconds: 10 * 3600,
    trace: trace && seed === 7 && venue === 'camp'
      ? (g, t) => {
          const r = g.run as CampRun;
          console.log(
            `${(t / 60).toFixed(0)}m act${r.act} open ${r.deepest} held ${held(r.zones)} staff ${formatNumber(staff(r))} prep ${formatNumber(prepForce(r))} light ${formatNumber(lightSupply(r))}/${formatNumber(lightDemand(r))} income ${formatNumber(incomeRate(r))} rep ${r.reputation.toFixed(2)} dead ${r.bodyCount}`,
          );
        }
      : undefined,
  });
  const at = (s?: number) => (s === undefined ? 'never' : formatDuration(s));
  const r = run.final.run;
  console.log(
    `${venue} seed ${seed}: act2 ${at(run.actAt[2])} | act3 ${at(run.actAt[3])} | act4 ${at(run.actAt[4])} | credits ${at(run.terminusAt)} | dead ${r.bodyCount} | ${Math.round(performance.now() - started)}ms`,
  );
}
