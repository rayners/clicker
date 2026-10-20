import { formatClock } from '../shared/format';
import type { LogKind } from '../mission/log';
import { createLogView as createSharedLogView } from '../shared/ui/log';

export function createLogView() {
  return createSharedLogView<LogKind>({ label: 'Comms log', stamp: (t) => `T+${formatClock(t)}` });
}
