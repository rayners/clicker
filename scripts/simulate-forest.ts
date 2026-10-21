import { simulateForest } from '../src/forest/bot';
import { formatDuration, formatNumber } from '../src/shared/format';
import { REGIONS } from '../src/forest-data/regions';

import { FLOORS } from '../src/forest-data/keep';

const site = process.argv[2] === 'keep' ? 'keep' : 'forest';
const hours = Number(process.argv[3] ?? process.argv[2] ?? 6) || 6;
for (const seed of [1, 7, 42]) {
  const started = performance.now();
  const run = simulateForest({ seed, maxSeconds: hours * 3600, site });
  const c = run.final.company;
  const at = (s?: number) => (s === undefined ? 'never' : formatDuration(s));
  const regions =
    site === 'keep'
      ? FLOORS.map((f) => `${f.id} ${at(run.floorAt[f.id])}`).join(' | ') + ` | held ${c.floors.filter((f) => f.secured).length} posted ${c.posted.reduce((a, b) => a + b, 0)} oil ${Math.round(c.oil)}`
      : REGIONS.map((r) => `${r.id} ${at(run.openedAt[r.id])}`).join(' | ');
  const hands = Object.values(c.hired).reduce((a, b) => a + b, 0);
  console.log(
    `seed ${seed}: act2 ${at(run.actAt[2])} act3 ${at(run.actAt[3])} act4 ${at(run.actAt[4])} terminus ${at(run.terminusAt)} | ${regions}\n   charted ${c.charted.toFixed(1)} hands ${hands} dead ${c.lifetimeDead} turned ${c.turned} keys ${c.keyFragments} blight ${Math.round(c.blight)} silver ${formatNumber(c.silver)} relics ${formatNumber(c.lifetimeRelics)} upgrades ${c.upgrades.length} | ${Math.round(performance.now() - started)}ms`,
  );
}
