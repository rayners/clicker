import { formatClock } from '../engine/format';
import type { LogKind } from '../mission/log';
import { createLogView as createSharedLogView } from '../engine/ui/log';

export function createLogView() {
  return createSharedLogView<LogKind>({ label: 'Comms log', stamp: (t) => `T+${formatClock(t)}` });
}
