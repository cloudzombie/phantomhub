import { makeAutoObservable, runInAction } from 'mobx';
import { WebSocketManager } from '../core/WebSocketManager';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
  read: boolean;
  data?: any;
}

export interface NotificationFilters {
  types: ('info' | 'success' | 'warning' | 'error')[];
  unreadOnly: boolean;
  startDate?: Date;
  endDate?: Date;
}

export class NotificationStore {
  private notifications: Map<string, Notification> = new Map();
  private filters: NotificationFilters = {
    types: ['info', 'success', 'warning', 'error'],
    unreadOnly: false
  };
  private wsManager: WebSocketManager;

  constructor() {
    makeAutoObservable(this);
    this.wsManager = WebSocketManager.getInstance();
    this.setupWebSocketListeners();
  }

  public initialize(): void {
    // Ensure WebSocket connection is established
    this.wsManager.connect();
  }

  private setupWebSocketListeners(): void {
    this.wsManager.subscribe('notification', this.handleNotification.bind(this));
  }

  private handleNotification(data: Notification): void {
    runInAction(() => {
      this.notifications.set(data.id, data);
    });
  }

  public setFilters(filters: Partial<NotificationFilters>): void {
    runInAction(() => {
      this.filters = { ...this.filters, ...filters };
    });
  }

  public markAsRead(id: string): void {
    runInAction(() => {
      const notification = this.notifications.get(id);
      if (notification) {
        notification.read = true;
      }
    });
  }

  public markAllAsRead(): void {
    runInAction(() => {
      this.notifications.forEach(notification => {
        notification.read = true;
      });
    });
  }

  public deleteNotification(id: string): void {
    runInAction(() => {
      this.notifications.delete(id);
    });
  }

  public clearNotifications(): void {
    runInAction(() => {
      this.notifications.clear();
    });
  }

  // Computed properties
  public get allNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  public get unreadNotifications(): Notification[] {
    return this.allNotifications.filter(n => !n.read);
  }

  public get filteredNotifications(): Notification[] {
    return this.allNotifications.filter(notification => {
      // Apply type filter
      if (!this.filters.types.includes(notification.type)) {
        return false;
      }

      // Apply unread filter
      if (this.filters.unreadOnly && notification.read) {
        return false;
      }

      // Apply date filters
      if (this.filters.startDate && notification.timestamp < this.filters.startDate.getTime()) {
        return false;
      }
      if (this.filters.endDate && notification.timestamp > this.filters.endDate.getTime()) {
        return false;
      }

      return true;
    });
  }

  public get unreadCount(): number {
    return this.unreadNotifications.length;
  }

  public getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }
} 