/**
 * The walkthrough: short steps that introduce a scenario's levers one at a time, each shown when it applies and
 * gone once the player has done the thing or dismissed it. Pure; the progress lives on the device, not in the save.
 */
export interface GuideStep<S> {
  id: string;
  title: string;
  text: string;
  /** A CSS selector for the control this step is about, highlighted while it shows. */
  target?: string;
  /** Whether the step applies yet. */
  show(s: S): boolean;
  /** Whether the player has already done what it describes. */
  done(s: S): boolean;
}

/** The scenario's rules, for the "how this works" page. */
export interface GuideRules {
  title: string;
  sections: readonly { heading: string; text: string }[];
}

export function nextStep<S>(steps: readonly GuideStep<S>[], s: S, seen: readonly string[]): GuideStep<S> | null {
  return steps.find((step) => !seen.includes(step.id) && step.show(s) && !step.done(s)) ?? null;
}

interface Saved {
  seen: string[];
  skipped: boolean;
}

/** What the player has seen of the guide, kept per device; storage that cannot be read just means starting over. */
export function createGuideProgress(storage: Storage, key: string) {
  let state: Saved = { seen: [], skipped: false };
  try {
    const raw = storage.getItem(key);
    if (raw) state = { seen: [], skipped: false, ...(JSON.parse(raw) as Partial<Saved>) };
  } catch {
    // Keep the defaults.
  }
  const save = () => {
    try {
      storage.setItem(key, JSON.stringify(state));
    } catch {
      // Remembered for this visit only.
    }
  };
  return {
    seen: (): readonly string[] => state.seen,
    skipped: () => state.skipped,
    see(id: string) {
      if (state.seen.includes(id)) return;
      state = { ...state, seen: [...state.seen, id] };
      save();
    },
    skip() {
      state = { ...state, skipped: true };
      save();
    },
    reset() {
      state = { seen: [], skipped: false };
      save();
    },
  };
}
