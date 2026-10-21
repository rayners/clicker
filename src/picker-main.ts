import '@fontsource/vt323';
import '@fontsource/michroma';
import '@fontsource/im-fell-english';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/unifrakturmaguntia';
import '@fontsource/monoton';
import './picker/picker.css';
import { mountPicker } from './picker/picker';
import { trackVisit } from './shared/posthog';
import { createOptOut, telemetryAllowed } from './shared/telemetry';

mountPicker(document.getElementById('app')!, window.localStorage);

const optOut = createOptOut(window.localStorage);
trackVisit({
  name: 'site_opened',
  props: { game: 'picker' },
  optOut,
  allowed: telemetryAllowed({ prod: import.meta.env.PROD, hostname: location.hostname, search: location.search, optedOut: !optOut.sharing() }),
});

// Registering here too means a first visit to the picker already caches both games for offline play.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('./sw.js', location.href)).catch(() => undefined);
}
