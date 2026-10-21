// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReducerStore } from '../../src/shared/store';
import type { OptOut, TelemetryEvent } from '../../src/shared/telemetry';

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: posthog }));

import { createPostHogSink, POSTHOG_HOST, startAnalytics, trackVisit } from '../../src/shared/posthog';

const flush = () => new Promise((r) => setTimeout(r, 0));
const sharing = (on = true): OptOut & { on: boolean } => {
  const o = { on, sharing: () => o.on, setSharing: (v: boolean) => void (o.on = v) };
  return o;
};

// These tests raise errors on purpose; keep jsdom from reporting them as unhandled.
window.addEventListener('error', (e) => e.preventDefault());

const stops: (() => void)[] = [];
beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
});

describe('the PostHog sink', () => {
  it('starts PostHog on the US cloud without cookies, autocapture, replays or remote scripts', async () => {
    await createPostHogSink(() => ({}));
    const [key, config] = posthog.init.mock.calls[0]!;
    expect(key).toMatch(/^phc_/);
    expect(config).toMatchObject({
      api_host: POSTHOG_HOST,
      persistence: 'localStorage',
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      disable_external_dependency_loading: true,
      person_profiles: 'identified_only',
    });
    expect(POSTHOG_HOST).toBe('https://us.i.posthog.com');
  });

  it('sends each event with where the player currently is', async () => {
    let act = 1;
    const sink = await createPostHogSink(() => ({ game: 'deep-contract', act }));
    act = 2;
    sink.capture({ name: 'act_reached', props: { minutes: 50 } });
    expect(posthog.capture).toHaveBeenCalledWith('act_reached', { game: 'deep-contract', act: 2, minutes: 50 });
  });

  it('sends errors as exceptions, with the same context', async () => {
    const sink = await createPostHogSink(() => ({ game: 'elderdark' }));
    const error = new Error('boom');
    sink.captureError(error);
    expect(posthog.captureException).toHaveBeenCalledWith(error, { game: 'elderdark' });
  });
});

describe('starting analytics for a game', () => {
  type S = { level: number };
  const diff = (a: S, b: S): TelemetryEvent[] => (b.level > a.level ? [{ name: 'level_up' }] : []);
  const setup = (allowed: boolean, optOut = sharing()) => {
    const store = createReducerStore<S, number>({ level: 0 }, (_s, level) => ({ level }));
    stops.push(startAnalytics({ store, diff, context: (s) => ({ level: s.level }), optOut, allowed }));
    return { store, optOut };
  };

  it('does nothing at all when telemetry is not allowed', async () => {
    const { store } = setup(false);
    store.dispatch(1);
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('x') }));
    await flush();
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('reports milestones as the game state changes', async () => {
    const { store } = setup(true);
    store.dispatch(1);
    await flush();
    expect(posthog.capture).toHaveBeenCalledWith('level_up', { level: 1 });
  });

  it('reports uncaught errors and rejected promises', async () => {
    setup(true);
    const error = new Error('uncaught');
    window.dispatchEvent(new ErrorEvent('error', { error }));
    const rejection = new Event('unhandledrejection') as Event & { reason: unknown };
    rejection.reason = 'nope';
    window.dispatchEvent(rejection);
    await flush();
    expect(posthog.captureException).toHaveBeenCalledWith(error, expect.anything());
    expect(posthog.captureException).toHaveBeenCalledWith('nope', expect.anything());
  });

  it('reports the game being opened, through the same opt-out gate as everything else', async () => {
    setup(true);
    await flush();
    expect(posthog.capture).toHaveBeenCalledWith('game_opened', { level: 0 });
  });

  it('drops anything still waiting to be sent if the player opts out before it goes', async () => {
    const { store, optOut } = setup(true);
    store.dispatch(1);
    optOut.setSharing(false);
    await flush();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('stops sending the moment the player opts out', async () => {
    const { store, optOut } = setup(true);
    await flush();
    optOut.setSharing(false);
    store.dispatch(1);
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('x') }));
    expect(posthog.capture).not.toHaveBeenCalledWith('level_up', expect.anything());
    expect(posthog.captureException).not.toHaveBeenCalled();
  });
});

describe('recording a visit to the front page', () => {
  it('sends one event, so a player\'s first step (and the site that sent them) is on record', async () => {
    trackVisit({ name: 'site_opened', props: { game: 'picker' }, optOut: sharing(), allowed: true });
    await flush();
    expect(posthog.capture).toHaveBeenCalledWith('site_opened', { game: 'picker' });
  });

  it('sends nothing when telemetry is not allowed or the player opted out', async () => {
    trackVisit({ name: 'site_opened', optOut: sharing(), allowed: false });
    trackVisit({ name: 'site_opened', optOut: sharing(false), allowed: true });
    await flush();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
