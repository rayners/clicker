import '@fontsource/im-fell-english';
import '@fontsource/im-fell-english/400-italic.css';
import './picker/about.css';
import { mountAbout } from './picker/about';
import { trackVisit } from './shared/posthog';
import { createOptOut, telemetryAllowed, TELEMETRY_EVENT, type TelemetryEvent } from './shared/telemetry';

mountAbout(document.getElementById('app')!);

const optOut = createOptOut(window.localStorage);
const allowed = telemetryAllowed({ prod: import.meta.env.PROD, hostname: location.hostname, search: location.search, optedOut: !optOut.sharing() });
trackVisit({ name: 'site_opened', props: { game: 'about' }, optOut, allowed });
// The tip jar opening is announced by the page; send it the same way.
document.addEventListener(TELEMETRY_EVENT, (e) => {
  const event = (e as CustomEvent<TelemetryEvent>).detail;
  trackVisit({ name: event.name, props: { game: 'about', ...event.props }, optOut, allowed });
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('../sw.js', location.href), { scope: new URL('../', location.href).pathname }).catch(() => undefined);
}
