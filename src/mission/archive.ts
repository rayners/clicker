import type { ArchiveFile } from './kinds';
import { interpolate } from '../shared/lexicon';
import { horrorOf, scenarioOf } from './registry';
import type { MissionState } from './state';

/** Files WARDEN can read now: the scenario's own, then the horror's, in the scenario's vocabulary. */
export function unlockedFiles(m: MissionState): ArchiveFile[] {
  const { lexicon, archive } = scenarioOf(m);
  return [...archive, ...horrorOf(m).archive]
    .filter((f) => f.unlock(m))
    .map((f) => ({ ...f, title: interpolate(f.title, lexicon), body: f.body.map((line) => interpolate(line, lexicon)) }));
}
