import { describe, it, expect } from 'vitest';
import { createOptOut, createTelemetry, telemetryAllowed, type TelemetryEvent, type TelemetrySink } from '../../src/shared/telemetry';

const live = { prod: true, hostname: 'rayners.github.io', search: '', optedOut: false };

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

function recordingSink() {
  const events: TelemetryEvent[] = [];
  const errors: unknown[] = [];
  const sink: TelemetrySink = { capture: (e) => events.push(e), captureError: (e) => errors.push(e) };
  return { sink, events, errors };
}

describe('when telemetry may run', () => {
  it('runs on the published site', () => {
    expect(telemetryAllowed(live)).toBe(true);
  });

  it('never runs in development, on this machine or the LAN, or with a debug jump', () => {
    expect(telemetryAllowed({ ...live, prod: false })).toBe(false);
    for (const hostname of ['localhost', '127.0.0.1', '192.168.1.10', '10.0.0.4', '172.16.3.2', 'box.local']) {
      expect(telemetryAllowed({ ...live, hostname })).toBe(false);
    }
    expect(telemetryAllowed({ ...live, search: '?debug=act3' })).toBe(false);
  });

  it('never runs once the player has opted out', () => {
    expect(telemetryAllowed({ ...live, optedOut: true })).toBe(false);
  });
});

describe('the opt-out switch', () => {
  it('shares play data until the player says otherwise, and remembers the choice', () => {
    const storage = memoryStorage();
    const optOut = createOptOut(storage);
    expect(optOut.sharing()).toBe(true);
    optOut.setSharing(false);
    expect(createOptOut(storage).sharing()).toBe(false);
    optOut.setSharing(true);
    expect(createOptOut(storage).sharing()).toBe(true);
  });

  it('is one switch for both games on this device', () => {
    const storage = memoryStorage();
    createOptOut(storage).setSharing(false);
    expect(storage.length).toBe(1);
  });

  it('treats unreadable storage as sharing, without throwing', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } } as unknown as Storage;
    const optOut = createOptOut(broken);
    expect(optOut.sharing()).toBe(true);
    expect(() => optOut.setSharing(false)).not.toThrow();
  });
});

describe('turning state changes into events', () => {
  type S = { level: number };
  const levelUps = (prev: S, next: S): TelemetryEvent[] => (next.level > prev.level ? [{ name: 'level_up', props: { level: next.level } }] : []);

  it('reports what changed between one state and the next, and nothing when nothing did', () => {
    const { sink, events } = recordingSink();
    const t = createTelemetry({ diff: levelUps });
    t.attach(sink);
    t.observe({ level: 1 });
    t.observe({ level: 1 });
    t.observe({ level: 2 });
    expect(events).toEqual([{ name: 'level_up', props: { level: 2 } }]);
  });

  it('does not report the state it starts from', () => {
    const { sink, events } = recordingSink();
    const t = createTelemetry({ diff: levelUps });
    t.attach(sink);
    t.observe({ level: 5 });
    expect(events).toEqual([]);
  });

  it('holds events and errors until the sink arrives, then sends them in order', () => {
    const { sink, events, errors } = recordingSink();
    const t = createTelemetry({ diff: levelUps });
    t.observe({ level: 1 });
    t.observe({ level: 2 });
    t.error(new Error('boom'));
    t.observe({ level: 3 });
    expect(events).toEqual([]);
    t.attach(sink);
    expect(events.map((e) => e.props?.level)).toEqual([2, 3]);
    expect(errors).toHaveLength(1);
  });

  it('keeps only a bounded number of events while waiting', () => {
    const { sink, events } = recordingSink();
    const t = createTelemetry({ diff: levelUps });
    for (let level = 0; level < 500; level++) t.observe({ level });
    t.attach(sink);
    expect(events.length).toBeLessThanOrEqual(100);
    expect(events.at(-1)!.props?.level).toBe(499);
  });

  it('never lets a failing sink break the game', () => {
    const t = createTelemetry({ diff: levelUps });
    t.attach({ capture: () => { throw new Error('offline'); }, captureError: () => { throw new Error('offline'); } });
    t.observe({ level: 1 });
    expect(() => t.observe({ level: 2 })).not.toThrow();
    expect(() => t.error(new Error('x'))).not.toThrow();
  });
});
