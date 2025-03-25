import { io, Socket } from 'socket.io-client';
import ApiService from './ApiService';

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
  private settings: NotificationSettings;
  private subscribers: Map<NotificationType, Set<NotificationCallback>> = new Map();
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;

  private constructor() {
    // Default settings
    this.settings = {
      deviceStatus: true,
      deploymentAlerts: true,
      systemUpdates: false,
      securityAlerts: true
    };

    // Initialize notification handlers
    this.loadStoredSettings();
    
    // Set up listener for settings changes
    document.addEventListener('notification-settings-changed', this.handleSettingsChange as EventListener);
  }

  // Static method to get the singleton instance
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private getCurrentUserId(): string | null {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || null;
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
    return null;
  }

  private getSettingsKey(): string {
    const userId = this.getCurrentUserId();
    return userId ? `phantomhub_settings_${userId}` : 'phantomhub_settings';
  }

  private loadStoredSettings(): void {
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
    this.loadStoredSettings();
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
    if (this.socket) {
      // If we already have a socket but it's not connected, try to reconnect
      if (!this.isConnected) {
        this.socket.connect();
      }
      return;
    }

    // Get API endpoint from environment variable directly
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    
    console.log('NotificationService: Connecting to socket server at', socketUrl);
    
    this.socket = io(socketUrl, {
      reconnectionAttempts: this.maxConnectionAttempts,
      reconnectionDelay: 1000,
      autoConnect: true,
      transports: ['polling', 'websocket'] // Try polling first, then websocket
    });

    this.socket.on('connect', () => {
      console.log('NotificationService: Socket connected');
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      // Authenticate the socket connection
      this.authenticateSocket();
      
      // Configure notifications after successful connection
      this.configureNotifications();
    });

    this.socket.on('connect_error', (error) => {
      console.error('NotificationService: Connection error', error);
      this.connectionAttempts++;
      
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.warn('NotificationService: Max connection attempts reached, falling back to polling mode');
        // We've already configured the socket to use polling as fallback
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('NotificationService: Socket disconnected', reason);
      this.isConnected = false;
      
      // If the server disconnected us, try to reconnect
      if (reason === 'io server disconnect') {
        this.socket?.connect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('NotificationService: Socket error', error);
    });
    
    this.socket.on('auth_error', (error) => {
      console.error('NotificationService: Authentication error', error);
      // Retry authentication after delay
      setTimeout(() => this.authenticateSocket(), 3000);
    });
    
    this.socket.on('authenticated', () => {
      console.log('NotificationService: Socket authenticated successfully');
    });
  }

  private authenticateSocket(): void {
    if (!this.socket || !this.isConnected) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('NotificationService: No token available for socket authentication');
      return;
    }
    
    console.log('NotificationService: Authenticating socket connection');
    this.socket.emit('authenticate', { token });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  private configureNotifications(): void {
    if (!this.socket || !this.isConnected) {
      return;
    }

    // Remove all existing listeners first
    this.socket.off('device_status_changed');
    this.socket.off('deployment_status_changed');
    this.socket.off('payload_status_update');
    this.socket.off('system_update_available');
    this.socket.off('security_alert');

    // Set up device status notifications
    if (this.settings.deviceStatus) {
      this.socket.on('device_status_changed', (data) => {
        console.log('Received device status update:', data);
        this.notifySubscribers('device_status', data);
      });
    }

    // Set up deployment notifications
    if (this.settings.deploymentAlerts) {
      this.socket.on('deployment_status_changed', (data) => {
        console.log('Received deployment status update:', data);
        this.notifySubscribers('deployment', data);
      });
      this.socket.on('payload_status_update', (data) => {
        console.log('Received payload status update:', data);
        this.notifySubscribers('deployment', data);
      });
    }

    // Set up system update notifications
    if (this.settings.systemUpdates) {
      this.socket.on('system_update_available', (data) => {
        this.notifySubscribers('system_update', data);
      });
    }

    // Set up security notifications
    if (this.settings.securityAlerts) {
      this.socket.on('security_alert', (data) => {
        this.notifySubscribers('security', data);
      });
    }
  }

  public subscribe(type: NotificationType, callback: NotificationCallback): void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    
    const callbacks = this.subscribers.get(type);
    callbacks?.add(callback);
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
          console.error(`Error in notification subscriber for ${type}:`, error);
        }
      });
    }
  }

  // Factory method to create a browser notification
  public showBrowserNotification(title: string, options?: NotificationOptions): void {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
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
}

export default NotificationService.getInstance(); 