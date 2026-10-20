import '@fontsource/vt323';
import '@fontsource/michroma';
import '@fontsource/im-fell-english';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/unifrakturmaguntia';
import '@fontsource/monoton';
import './picker/picker.css';
import { mountPicker } from './picker/picker';

mountPicker(document.getElementById('app')!, window.localStorage);

// Registering here too means a first visit to the picker already caches both games for offline play.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('./sw.js', location.href)).catch(() => undefined);
}
