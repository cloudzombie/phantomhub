import { Socket } from 'socket.io-client';
import { getSocket } from '../utils/webSocket';
import { getUserData } from '../utils/tokenManager';
import { WebSocketManager } from '../core/WebSocketManager';

interface NotificationSettings {
  deviceStatus: boolean;
  deploymentAlerts: boolean;
  systemUpdates: boolean;
  securityAlerts: boolean;
}

type NotificationType = 'device_status' | 'deployment' | 'system_update' | 'security';
type NotificationCallback = (data: any) => void;

class NotificationService {
  private static instance: NotificationService;
  private socket: Socket | null = null;
  private wsManager: WebSocketManager;
  private isConnected: boolean = false;
  private settings: NotificationSettings = {
    deviceStatus: true,
    deploymentAlerts: true,
    systemUpdates: true,
    securityAlerts: true
  };
  private subscribers: Map<string, Set<NotificationCallback>> = new Map();
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.loadSettings();
    
    // Set up listener for settings changes
    document.addEventListener('notification-settings-changed', this.handleSettingsChange as EventListener);
    
    // Set up listener for auth events to connect when user logs in
    document.addEventListener('user-authenticated', () => {
      console.log('NotificationService: User authenticated event received, attempting connection');
      this.connect();
    });
    
    // Try to connect if we have user data
    const userData = getUserData();
    if (userData) {
      // Delay initial connection attempt to allow systems to initialize
      setTimeout(() => this.connect(), 1000);
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Static method to get settings
  public static getSettings(): NotificationSettings {
    return NotificationService.getInstance().getSettings();
  }

  // Static method to connect
  public static connect(): void {
    NotificationService.getInstance().connect();
  }

  // Static method to disconnect
  public static disconnect(): void {
    NotificationService.getInstance().disconnect();
  }

  // Static method to subscribe
  public static subscribe(type: NotificationType, callback: NotificationCallback): void {
    NotificationService.getInstance().subscribe(type, callback);
  }

  // Static method to unsubscribe
  public static unsubscribe(type: NotificationType, callback: NotificationCallback): void {
    NotificationService.getInstance().unsubscribe(type, callback);
  }

  // Static method to test socket connection
  public static async testSocketConnection(): Promise<boolean> {
    return NotificationService.getInstance().testSocketConnection();
  }

  private getCurrentUserId(): string | null {
    try {
      const userData = getUserData();
      if (userData) {
        return userData.id || null;
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
    return null;
  }

  private getSettingsKey(): string {
    const userId = this.getCurrentUserId();
    return userId ? `notification_settings_${userId}` : 'notification_settings';
  }

  private loadSettings(): void {
    try {
      const settingsKey = this.getSettingsKey();
      const savedSettings = localStorage.getItem(settingsKey);
      if (savedSettings) {
        this.settings = JSON.parse(savedSettings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  public reloadSettings(): void {
    this.loadSettings();
    this.configureNotifications();
  }

  private handleSettingsChange = (event: CustomEvent<NotificationSettings>): void => {
    this.updateSettings(event.detail);
  };

  private updateSettings(newSettings: NotificationSettings): void {
    this.settings = newSettings;
    try {
      const settingsKey = this.getSettingsKey();
      localStorage.setItem(settingsKey, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
    this.configureNotifications();
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  public connect(): void {
    if (this.isConnected) {
      return;
    }

    const userData = getUserData();
    if (!userData) {
      console.log('NotificationService: No user data available, skipping connection');
      return;
    }

    this.connectionAttempts = 0;
    this.setupSocketConnection();
  }

  private setupSocketConnection(): void {
    if (this.socket) {
      return;
    }

    this.socket = getSocket();
    if (!this.socket) {
      console.error('NotificationService: Failed to get socket instance');
      return;
    }

    const checkSocket = () => {
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.error('NotificationService: Max connection attempts reached');
        return;
      }

      if (this.socket?.connected) {
        this.isConnected = true;
        this.connectionAttempts = 0;
        this.setupSocketEventListeners();
        this.configureNotifications();
      } else {
        this.connectionAttempts++;
        setTimeout(checkSocket, 1000);
      }
    };

    checkSocket();
  }

  private setupSocketEventListeners(): void {
    if (!this.socket) return;

    // Device status updates
    this.socket.on('device:*:status', (data) => {
      if (this.settings.deviceStatus) {
        this.notifySubscribers('device_status', data);
      }
    });

    // Deployment alerts
    this.socket.on('deployment:*:status', (data) => {
      if (this.settings.deploymentAlerts) {
        this.notifySubscribers('deployment', data);
      }
    });

    // System updates
    this.socket.on('system:update', (data) => {
      if (this.settings.systemUpdates) {
        this.notifySubscribers('system_update', data);
      }
    });

    // Security alerts
    this.socket.on('security:alert', (data) => {
      if (this.settings.securityAlerts) {
        this.notifySubscribers('security', data);
      }
    });

    // Handle disconnection
    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('NotificationService: Socket disconnected');
    });

    // Handle reconnection
    this.socket.on('reconnect', () => {
      this.isConnected = true;
      console.log('NotificationService: Socket reconnected');
      this.configureNotifications();
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  private configureNotifications(): void {
    if (!this.isConnected || !this.socket) return;

    const userId = this.getCurrentUserId();
    if (!userId) return;

    // Subscribe to user-specific notification channels
    this.socket.emit('subscribe:notifications', {
      userId,
      settings: this.settings
    });
  }

  public subscribe(type: NotificationType, callback: NotificationCallback): void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)?.add(callback);
  }

  public unsubscribe(type: NotificationType, callback: NotificationCallback): void {
    this.subscribers.get(type)?.delete(callback);
  }

  private notifySubscribers(type: NotificationType, data: any): void {
    this.subscribers.get(type)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${type} notification handler:`, error);
      }
    });
  }

  public showBrowserNotification(title: string, options?: NotificationOptions): void {
    if (!('Notification' in window)) {
      console.warn('Browser notifications are not supported');
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, options);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, options);
        }
      });
    }
  }

  public async testSocketConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }

      let timeoutId: NodeJS.Timeout;
      const testHandler = () => {
        clearTimeout(timeoutId);
        this.socket?.off('test:response', testHandler);
        resolve(true);
      };

      timeoutId = setTimeout(() => {
        this.socket?.off('test:response', testHandler);
        resolve(false);
      }, 5000);

      this.socket.on('test:response', testHandler);
      this.emitTestEvent();
    });
  }

  private emitTestEvent(): void {
    if (this.socket?.connected) {
      this.socket.emit('test:connection');
    }
  }

  public cleanup() {
    this.disconnect();
    document.removeEventListener('notification-settings-changed', this.handleSettingsChange as EventListener);
    document.removeEventListener('user-authenticated', () => this.connect());
  }
}

export default NotificationService;