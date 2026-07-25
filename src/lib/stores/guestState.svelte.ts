/**
 * Guest mode. When active, the owner has chosen a reduced set of tabs / Home
 * widgets to show while guests are around (e.g. hide the calendar). Turning it
 * OFF is gated by the shared child-lock PIN (configStore.security.childLockPin);
 * if no PIN is set, no PIN is required. Selection is in-memory — enabling guest
 * mode always re-prompts the owner to choose what to show.
 */
class GuestState {
  active = $state(false);
  /** Non-home tab ids to keep visible while active (home is always visible). */
  visibleTabs = $state<string[]>([]);
  /** Home widget ids to keep visible while active. */
  visibleHomeWidgets = $state<string[]>([]);

  enable(tabs: string[], homeWidgets: string[]) {
    this.visibleTabs        = tabs;
    this.visibleHomeWidgets = homeWidgets;
    this.active = true;
  }

  disable() {
    this.active = false;
  }

  /** Home is never hidden; other tabs must be in the chosen set. */
  tabVisible(id: string): boolean {
    return !this.active || id === 'home' || this.visibleTabs.includes(id);
  }

  homeWidgetVisible(id: string): boolean {
    return !this.active || this.visibleHomeWidgets.includes(id);
  }
}

export const guestState = new GuestState();
