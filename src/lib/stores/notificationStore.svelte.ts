/**
 * Notification store — three streams:
 *   1. New devices/entities (diffed against a persisted baseline)
 *   2. HA warnings/errors (connection loss, auth failures)
 *   3. Activity log (rolling high-level events)
 */

export interface AppNotification {
  id:      string;
  kind:    'device' | 'warning' | 'error';
  title:   string;
  detail?: string;
  ts:      number;
  read:    boolean;
}

export interface LogEntry {
  id:   string;
  text: string;
  ts:   number;
}

class NotificationStore {
  notifications = $state<AppNotification[]>([]);
  log           = $state<LogEntry[]>([]);

  // Memoized — recomputes only when notifications change, not on every read
  // (the screensaver reads this continuously).
  unreadCount = $derived(this.notifications.filter(n => !n.read).length);

  #baseline       = new Set<string>();
  #baselineLoaded = false;
  #seq            = 0;

  #id(prefix: string): string {
    return `${prefix}-${Date.now()}-${this.#seq++}`;
  }

  addNotification(kind: AppNotification['kind'], title: string, detail?: string) {
    this.notifications = [
      { id: this.#id(kind), kind, title, detail, ts: Date.now(), read: false },
      ...this.notifications,
    ].slice(0, 50);
  }

  addLog(text: string) {
    this.log = [
      { id: this.#id('log'), text, ts: Date.now() },
      ...this.log,
    ].slice(0, 100);
  }

  markAllRead() {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
  }

  clearAll() {
    this.notifications = [];
  }

  // ── Baseline persistence ──────────────────────────────────────────────────

  async loadBaseline(): Promise<void> {
    try {
      const res = await fetch('/api/notifications/baseline');
      if (res.ok) {
        const data = await res.json() as { ids?: string[] };
        this.#baseline       = new Set(data.ids ?? []);
        this.#baselineLoaded = true;
      }
    } catch { /* ignore */ }
  }

  async checkForNewEntities(entityIds: string[]): Promise<void> {
    if (!this.#baselineLoaded) return;
    const newOnes = entityIds.filter(id => !this.#baseline.has(id));
    if (newOnes.length === 0) return;

    for (const id of newOnes) {
      this.#baseline.add(id);
      this.addNotification('device', 'New device detected', id);
      this.addLog(`New entity: ${id}`);
    }
    try {
      await fetch('/api/notifications/baseline', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: [...this.#baseline] }),
      });
    } catch { /* ignore */ }
  }

  async seedBaselineIfEmpty(entityIds: string[]): Promise<void> {
    if (this.#baseline.size > 0) return;
    this.#baseline       = new Set(entityIds);
    this.#baselineLoaded = true;
    try {
      await fetch('/api/notifications/baseline', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids: entityIds }),
      });
    } catch { /* ignore */ }
  }
}

export const notificationStore = new NotificationStore();
