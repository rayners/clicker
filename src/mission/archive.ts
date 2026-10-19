import { ARCHIVE, type ArchiveFile } from '../data/archive';
import type { MissionState } from './state';

export function unlockedFiles(m: MissionState): ArchiveFile[] {
  return ARCHIVE.filter((f) => f.unlock(m));
}
