import type { Store } from './store';
import { createTelemetry, type OptOut, type TelemetryEvent, type TelemetryProps, type TelemetrySink } from './telemetry';

/** Public by design: a PostHog project key only allows sending events. */
const POSTHOG_KEY = 'phc_sWEhq5z9p3HygDsTtgBJv8xrF3jLhKLAVy8ev2hgvZLx';
export const POSTHOG_HOST = 'https://us.i.posthog.com';

/** Loads PostHog on demand (its own chunk, off the boot path) and adapts it to a telemetry sink. */
export async function createPostHogSink(context: () => TelemetryProps): Promise<TelemetrySink> {
  const { default: posthog } = await import('posthog-js');
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // An anonymous id in localStorage; no cookies.
    persistence: 'localStorage',
    person_profiles: 'identified_only',
    autocapture: false,
    // Sent as game_opened instead, so it passes the opt-out check like every other event.
    capture_pageview: false,
    capture_pageleave: false,
    capture_performance: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    disable_session_recording: true,
    disable_surveys: true,
    // Everything ships in the bundle, so nothing is fetched from PostHog's CDN (and the PWA works offline).
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
  });
  return {
    capture: (event) => posthog.capture(event.name, { ...context(), ...event.props }),
    captureError: (error) => posthog.captureException(error, context()),
  };
}

/** Wires a game's store and uncaught errors to PostHog. Returns a function that stops listening. */
export function startAnalytics<S>(options: {
  store: Store<S, never>;
  diff: (prev: S, next: S) => TelemetryEvent[];
  context: (state: S) => TelemetryProps;
  optOut: OptOut;
  allowed: boolean;
  now?: () => number;
}): () => void {
  if (!options.allowed) return () => undefined;
  const { store, optOut } = options;
  const telemetry = createTelemetry({ diff: options.diff });
  telemetry.observe(store.getState());
  const unsubscribe = store.subscribe((state) => {
    if (optOut.sharing()) telemetry.observe(state);
  });
  const onError = (e: ErrorEvent) => {
    if (optOut.sharing()) telemetry.error(e.error ?? e.message);
  };
  const onRejection = (e: PromiseRejectionEvent) => {
    if (optOut.sharing()) telemetry.error(e.reason);
  };
  // How long each stretch in view lasted, sent as the game goes out of view (a tab switch, the phone locking, closing).
  const now = options.now ?? Date.now;
  let shownAt: number | null = now();
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      shownAt = now();
    } else if (shownAt !== null) {
      if (optOut.sharing()) telemetry.track({ name: 'sitting_ended', props: { seconds: Math.round((now() - shownAt) / 1000) } });
      shownAt = null;
    }
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  document.addEventListener('visibilitychange', onVisibility);
  telemetry.track({ name: 'game_opened' });
  // Checked again at send time: anything buffered while PostHog loaded is dropped if the player opted out meanwhile.
  createPostHogSink(() => options.context(store.getState())).then(
    (sink) =>
      telemetry.attach({
        capture: (event) => optOut.sharing() && sink.capture(event),
        captureError: (error) => optOut.sharing() && sink.captureError(error),
      }),
    () => undefined,
  );
  return () => {
    unsubscribe();
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** A single event from a page with no game state (the picker). PostHog records the referrer with it. */
export function trackVisit(options: { name: string; props?: TelemetryProps; optOut: OptOut; allowed: boolean }): void {
  if (!options.allowed || !options.optOut.sharing()) return;
  createPostHogSink(() => ({})).then(
    (sink) => options.optOut.sharing() && sink.capture({ name: options.name, props: options.props }),
    () => undefined,
  );
}
