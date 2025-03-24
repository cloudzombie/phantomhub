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

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private loadStoredSettings(): void {
    try {
      const storedSettings = localStorage.getItem('phantomhub_settings');
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
      return; // Already connected or connecting
    }

    const apiConfig = ApiService.getConfig();
    const socketUrl = apiConfig.endpoint.replace('/api', ''); // Remove /api from the endpoint
    
    console.log('NotificationService: Connecting to socket server at', socketUrl);
    
    this.socket = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('NotificationService: Socket connected');
      this.isConnected = true;
      this.configureNotifications();
    });

    this.socket.on('disconnect', () => {
      console.log('NotificationService: Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error('NotificationService: Socket error', error);
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
    if (!this.socket || !this.isConnected) {
      return;
    }

    // Set up device status notifications
    if (this.settings.deviceStatus) {
      this.socket.on('device_status_changed', (data) => {
        this.notifySubscribers('device_status', data);
      });
    } else {
      this.socket.off('device_status_changed');
    }

    // Set up deployment notifications
    if (this.settings.deploymentAlerts) {
      this.socket.on('deployment_status_changed', (data) => {
        this.notifySubscribers('deployment', data);
      });
      this.socket.on('payload_status_update', (data) => {
        this.notifySubscribers('deployment', data);
      });
    } else {
      this.socket.off('deployment_status_changed');
      this.socket.off('payload_status_update');
    }

    // Set up system update notifications
    if (this.settings.systemUpdates) {
      this.socket.on('system_update_available', (data) => {
        this.notifySubscribers('system_update', data);
      });
    } else {
      this.socket.off('system_update_available');
    }

    // Set up security notifications
    if (this.settings.securityAlerts) {
      this.socket.on('security_alert', (data) => {
        this.notifySubscribers('security', data);
      });
    } else {
      this.socket.off('security_alert');
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