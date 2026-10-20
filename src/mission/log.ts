import { appendLog as appendShared, LOG_LIMIT, type LogEntry as SharedLogEntry } from '../shared/log';
import type { MissionCore } from './state';

export type LogKind = 'sys' | 'corp' | 'crew' | 'anomaly';
export type LogEntry = SharedLogEntry<LogKind>;
export { LOG_LIMIT };

export function appendLog<M extends MissionCore>(m: M, kind: LogKind, text: string): M {
  return appendShared<LogKind, M>(m, kind, text);
}
