import { getStoredToken } from './api';

export type SyncStatus = 'connected' | 'connecting' | 'disconnected';

export interface SyncEventPayload {
  entity: 'tasks' | 'focus_logs' | 'reports' | 'notes' | 'memos' | 'excel_configs' | 'files';
  action: 'create' | 'update' | 'delete' | 'reorder' | 'sync_recurring' | 'open';
  timestamp: number;
  data?: any;
}

class SyncManager {
  private eventSource: EventSource | null = null;
  private status: SyncStatus = 'disconnected';
  private reconnectTimer: any = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private retryCount = 0;

  constructor() {
    // Re-sync whenever the window regains focus or visibility
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.emitSyncEvent({
          entity: 'tasks',
          action: 'update',
          timestamp: Date.now()
        });
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.emitSyncEvent({
            entity: 'tasks',
            action: 'update',
            timestamp: Date.now()
          });
        }
      });
    }
  }

  public subscribeStatus(callback: (status: SyncStatus) => void) {
    this.listeners.add(callback);
    callback(this.status);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private setStatus(newStatus: SyncStatus) {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.listeners.forEach(cb => cb(newStatus));
    window.dispatchEvent(new CustomEvent('workbench:sync_status', { detail: newStatus }));
  }

  public connect() {
    const token = getStoredToken();
    if (!token) {
      this.disconnect();
      return;
    }

    if (this.eventSource) {
      this.disconnect();
    }

    this.setStatus('connecting');

    const sseUrl = `/api/sync/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(sseUrl);
    this.eventSource = es;

    es.onopen = () => {
      this.retryCount = 0;
      this.setStatus('connected');
    };

    es.onmessage = (event) => {
      try {
        if (event.data.startsWith(':')) return; // ignore comments/heartbeats
        const parsed: SyncEventPayload = JSON.parse(event.data);
        this.emitSyncEvent(parsed);
      } catch (err) {
        console.warn('Failed to parse SSE sync event:', err);
      }
    };

    es.onerror = () => {
      this.setStatus('disconnected');
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      this.scheduleReconnect();
    };
  }

  private emitSyncEvent(payload: SyncEventPayload) {
    window.dispatchEvent(new CustomEvent('workbench:sync', { detail: payload }));
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(1000 * Math.pow(1.5, this.retryCount), 15000);
    this.retryCount++;
    this.reconnectTimer = setTimeout(() => {
      const token = getStoredToken();
      if (token) {
        this.connect();
      }
    }, delay);
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setStatus('disconnected');
  }
}

export const syncService = new SyncManager();
