/**
 * A capped, time-stamped log on any host.
 * @module
 */
/** One line in a game's log. */
export interface LogEntry<K extends string = string> {
  id: number;
  /** Elapsed game seconds when written. */
  t: number;
  kind: K;
  text: string;
}

/** Anything that keeps a log: a mission, a company. */
export interface LogHost<K extends string = string> {
  elapsed: number;
  log: LogEntry<K>[];
  nextLogId: number;
}

/** Entries kept; older ones fall off the top. */
export const LOG_LIMIT = 250;

/** Adds an entry stamped with the host's elapsed time, keeping the last `LOG_LIMIT`. */
export function appendLog<K extends string, H extends LogHost<K>>(host: H, kind: K, text: string): H {
  const entry: LogEntry<K> = { id: host.nextLogId, t: host.elapsed, kind, text };
  return { ...host, log: [...host.log, entry].slice(-LOG_LIMIT), nextLogId: host.nextLogId + 1 };
}
