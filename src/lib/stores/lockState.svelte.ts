/**
 * Child-lock state. When locked, an overlay swallows all touch until the correct
 * PIN is entered. This is a UX gate (stop a child), NOT hardened security —
 * the PIN lives in config.json in plain text and is checked client-side.
 */
class LockState {
  locked = $state(false);
  lock()   { this.locked = true; }
  unlock() { this.locked = false; }
}
export const lockState = new LockState();
