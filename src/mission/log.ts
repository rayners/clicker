import type { MissionState } from './state';

export type LogKind = 'sys' | 'corp' | 'crew' | 'anomaly';

export interface LogEntry {
  id: number;
  /** Mission elapsed seconds when written. */
  t: number;
  kind: LogKind;
  text: string;
}

export const LOG_LIMIT = 250;

export function appendLog(m: MissionState, kind: LogKind, text: string): MissionState {
  const entry: LogEntry = { id: m.nextLogId, t: m.elapsed, kind, text };
  return { ...m, log: [...m.log, entry].slice(-LOG_LIMIT), nextLogId: m.nextLogId + 1 };
}
