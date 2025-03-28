import { Socket } from 'socket.io-client';
import { getSocket } from '../utils/webSocket';
import { getToken, getUserData } from '../utils/tokenManager';
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
    
    // Try to connect if we already have a token
    const token = getToken();
    if (token) {
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
    return userId ? `ghostwire_settings_${userId}` : 'ghostwire_settings';
  }

  private loadSettings(): void {
    try {
      const storedSettings = localStorage.getItem(this.getSettingsKey());
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        if (settings.notifications) {
          this.updateSettings(settings.notifications);
        }
      }
    } catch (error) {
      console.error('Error loading stored notification settings:', error);
    }
  }

  // Public method to explicitly reload settings for the current user
  public reloadSettings(): void {
    console.log('NotificationService: Reloading settings for user');
    this.loadSettings();
    this.configureNotifications();
  }

  private handleSettingsChange = (event: CustomEvent<NotificationSettings>): void => {
    if (event.detail) {
      this.updateSettings(event.detail);
    }
  };

  private updateSettings(newSettings: NotificationSettings): void {
    console.log('NotificationService: Updating settings', newSettings);
    this.settings = { ...this.settings, ...newSettings };
    
    // Update subscriptions based on new settings
    this.configureNotifications();
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  public connect(): void {
    // Check if we have a token before attempting to connect
    const token = getToken();
    if (!token) {
      console.log('NotificationService: No auth token available, skipping connection');
      return;
    }
    
    // Use the WebSocketManager
    this.socket = this.wsManager.getSocket();
    
    if (!this.socket) {
      console.log('NotificationService: No socket available, will retry');
      
      // Check if the socket becomes available
      const checkSocket = () => {
        this.socket = this.wsManager.getSocket();
        if (this.socket) {
          console.log('NotificationService: Socket obtained after retry');
          this.setupSocketConnection();
        } else {
          console.warn('NotificationService: Still no socket available, will retry in 5 seconds');
          setTimeout(checkSocket, 5000);
        }
      };
      
      checkSocket();
      return;
    }
    
    this.setupSocketConnection();
  }
  
  private setupSocketConnection(): void {
    if (!this.socket) return;
    
    if (!this.socket.connected) {
      console.log('NotificationService: Socket not connected, waiting for connection');
      
      // Wait for the socket to connect
      this.wsManager.subscribe('connect', () => {
        console.log('NotificationService: Socket connected successfully');
        this.isConnected = true;
        this.setupSocketEventListeners();
        this.configureNotifications();
        
        // Dispatch an event that the socket is connected
        document.dispatchEvent(new CustomEvent('socket-connected'));
      });
    } else {
      console.log('NotificationService: Using existing socket:', this.socket.id);
      this.isConnected = true;
      this.setupSocketEventListeners();
      this.configureNotifications();
    }
  }

  private setupSocketEventListeners(): void {
    if (!this.socket) return;
    
    // Set up listeners for different notification types
    this.wsManager.subscribe('notification', (data) => {
      console.log('NotificationService: Received notification', data);
      if (data && data.type) {
        this.notifySubscribers(data.type, data);
        
        // Show browser notification if appropriate
        if (data.browserNotification && Notification.permission === 'granted') {
          this.showBrowserNotification(data.title || 'GhostWire Notification', {
            body: data.message || '',
            icon: '/logo.png'
          });
        }
      }
    });
    
    // Listen for device status updates
    this.wsManager.subscribe('device_status_changed', (data) => {
      if (this.settings.deviceStatus) {
        this.notifySubscribers('device_status', data);
      }
    });
    
    // Listen for deployment events
    this.wsManager.subscribe('deployment_status', (data) => {
      if (this.settings.deploymentAlerts) {
        this.notifySubscribers('deployment', data);
      }
    });
    
    // Listen for system updates
    this.wsManager.subscribe('system_update', (data) => {
      if (this.settings.systemUpdates) {
        this.notifySubscribers('system_update', data);
      }
    });
    
    // Listen for security alerts
    this.wsManager.subscribe('security_alert', (data) => {
      if (this.settings.securityAlerts) {
        this.notifySubscribers('security', data);
      }
    });
  }

  public disconnect(): void {
    // We don't disconnect the socket since it's managed by WebSocketManager
    this.isConnected = false;
    console.log('NotificationService: Disconnected from notification service');
  }

  private configureNotifications(): void {
    if (!this.isConnected || !this.socket) return;
    
    // Send current notification settings to the server
    this.wsManager.emit('configure_notifications', {
      settings: this.settings,
      userId: this.getCurrentUserId()
    });
    
    console.log('NotificationService: Configured notifications with settings', this.settings);
  }

  public subscribe(type: NotificationType, callback: NotificationCallback): void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)?.add(callback);
  }

  public unsubscribe(type: NotificationType, callback: NotificationCallback): void {
    const callbacks = this.subscribers.get(type);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private notifySubscribers(type: NotificationType, data: any): void {
    const callbacks = this.subscribers.get(type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in notification callback:', error);
        }
      });
    }
  }

  public showBrowserNotification(title: string, options?: NotificationOptions): void {
    if (!('Notification' in window)) {
      console.log('NotificationService: Browser does not support notifications');
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
    if (!this.socket) {
      console.log('NotificationService: No socket available for testing');
      return false;
    }
    
    return new Promise<boolean>(resolve => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);
      
      this.emitTestEvent();
      
      const testHandler = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      
      this.wsManager.subscribe('test_response', testHandler);
      
      // Clean up after 5 seconds
      setTimeout(() => {
        this.wsManager.unsubscribe('test_response', testHandler);
      }, 5000);
    });
  }

  private emitTestEvent(): void {
    if (this.isConnected && this.socket) {
      this.wsManager.emit('test_ping', { timestamp: Date.now() });
    }
  }

  public cleanup() {
    // Clean up listeners
    document.removeEventListener('notification-settings-changed', this.handleSettingsChange as EventListener);
    document.removeEventListener('user-authenticated', () => this.connect());
    
    // Clear all subscribers
    this.subscribers.clear();
    
    // We don't disconnect the socket here as it's managed by WebSocketManager
  }
}

// Export a singleton instance
export default NotificationService.getInstance();