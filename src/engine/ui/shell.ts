/**
 * The page's shell: the game's parts in order, the overlays above them, and covering the game while a layer is open.
 * @module
 */

/** Mounts a game into its root; `cover` makes the game inert (unreachable, unpressable) behind a full-screen layer. */
export function createShell(root: HTMLElement, options: { className: string; parts: readonly HTMLElement[]; overlays: readonly HTMLElement[] }): { cover(covered: boolean): void } {
  root.classList.add(...options.className.split(' '));
  root.replaceChildren(...options.parts, ...options.overlays);
  return {
    cover(covered) {
      for (const el of options.parts) el.toggleAttribute('inert', covered);
    },
  };
}
