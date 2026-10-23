export type Listener<S> = (state: S) => void;

export interface Store<S, A> {
  getState(): S;
  dispatch(action: A): void;
  subscribe(listener: Listener<S>): () => void;
  replace(state: S): void;
}

/** A minimal reducer store: every dispatch produces a new immutable state and notifies listeners. */
export function createReducerStore<S, A>(initial: S, reduce: (state: S, action: A) => S): Store<S, A> {
  let state = initial;
  const listeners = new Set<Listener<S>>();
  const notify = () => listeners.forEach((l) => l(state));
  return {
    getState: () => state,
    dispatch(action) {
      state = reduce(state, action);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    replace(next) {
      state = next;
      notify();
    },
  };
}
