/** Anonymous play analytics: milestones derived from state changes, sent to a pluggable sink (PostHog in production). */

export type TelemetryProps = Record<string, string | number | boolean>;
export interface TelemetryEvent {
  name: string;
  props?: TelemetryProps;
}

export interface TelemetrySink {
  capture(event: TelemetryEvent): void;
  captureError(error: unknown): void;
}

const OPT_OUT_KEY = 'clicker.telemetry';
const MAX_PENDING = 100;
const LOCAL_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|\.local$/;

/** Only the published build, on a public host, without debug jumps, for players who haven't opted out. */
export function telemetryAllowed(env: { prod: boolean; hostname: string; search: string; optedOut: boolean }): boolean {
  if (!env.prod || env.optedOut) return false;
  if (LOCAL_HOST.test(env.hostname)) return false;
  return !new URLSearchParams(env.search).has('debug');
}

/** One device-wide switch, shared by both games. Storage failures default to sharing and never throw. */
export function createOptOut(storage: Storage) {
  return {
    sharing(): boolean {
      try {
        return storage.getItem(OPT_OUT_KEY) !== 'off';
      } catch {
        return true;
      }
    },
    setSharing(on: boolean): void {
      try {
        if (on) storage.removeItem(OPT_OUT_KEY);
        else storage.setItem(OPT_OUT_KEY, 'off');
      } catch {
        // Nothing to do: the preference just won't persist.
      }
    },
  };
}
export type OptOut = ReturnType<typeof createOptOut>;

type Pending = { kind: 'event'; event: TelemetryEvent } | { kind: 'error'; error: unknown };

/** Watches successive states, turning changes into events. Buffers until a sink is attached; never throws. */
export function createTelemetry<S>(options: { diff: (prev: S, next: S) => TelemetryEvent[] }) {
  let sink: TelemetrySink | null = null;
  let previous: S | undefined;
  let pending: Pending[] = [];

  const send = (item: Pending) => {
    if (!sink) {
      pending.push(item);
      if (pending.length > MAX_PENDING) pending = pending.slice(-MAX_PENDING);
      return;
    }
    try {
      if (item.kind === 'event') sink.capture(item.event);
      else sink.captureError(item.error);
    } catch {
      // Analytics must never break the game.
    }
  };

  return {
    observe(state: S): void {
      if (previous !== undefined && previous !== state) {
        for (const event of options.diff(previous, state)) send({ kind: 'event', event });
      }
      previous = state;
    },
    track(event: TelemetryEvent): void {
      send({ kind: 'event', event });
    },
    error(error: unknown): void {
      send({ kind: 'error', error });
    },
    attach(next: TelemetrySink): void {
      sink = next;
      const queued = pending;
      pending = [];
      queued.forEach(send);
    },
  };
}
