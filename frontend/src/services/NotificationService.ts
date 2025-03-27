import { io, Socket } from 'socket.io-client';
import apiServiceInstance, { ApiService } from './ApiService';
import { getSocket } from '../utils/socketUtils';
import { getToken, getUserData } from '../utils/tokenManager';

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
      // Delay initial connection attempt to allow ApiService to initialize
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
        // getUserData already returns the parsed object, no need to parse again
        return userData.id || null;
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
    
    // Use the socket from ApiService instead of creating a new one
    this.socket = getSocket();
    
    if (!this.socket) {
      console.log('NotificationService: No socket available from ApiService, will retry');
      
      // Try to initialize the socket in ApiService
      ApiService.reconnectSocket();
      
      // Retry after a short delay
      setTimeout(() => {
        this.socket = getSocket();
        if (this.socket) {
          console.log('NotificationService: Socket obtained after retry');
          this.setupSocketConnection();
        } else {
          console.warn('NotificationService: Still no socket available after retry');
        }
      }, 1500);
      
      return;
    }
    
    this.setupSocketConnection();
  }
  
  private setupSocketConnection(): void {
    if (!this.socket) return;
    
    if (!this.socket.connected) {
      console.log('NotificationService: ApiService socket not connected, requesting reconnection');
      // Ask ApiService to reconnect the socket
      ApiService.reconnectSocket();
      // Wait for connection
      this.socket.once('connect', () => {
        console.log('NotificationService: Socket connected successfully');
        this.isConnected = true;
        this.setupSocketEventListeners();
        this.configureNotifications();
        
        // Dispatch an event that the socket is connected
        document.dispatchEvent(new CustomEvent('socket-connected'));
      });
    } else {
      console.log('NotificationService: Using existing socket from ApiService:', this.socket.id);
      this.isConnected = true;
      this.setupSocketEventListeners();
      this.configureNotifications();
      
      // Dispatch an event that the socket is connected
      document.dispatchEvent(new CustomEvent('socket-connected'));
    }
  }

  private setupSocketEventListeners(): void {
    if (!this.socket) return;
    
    // Clean up existing listeners
    this.socket.off('connect');
    this.socket.off('disconnect');
    this.socket.off('connect_error');
    
    // Set up new listeners
    this.socket.on('connect', () => {
      console.log('NotificationService: Socket connected');
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      // Configure notifications after successful connection
      this.configureNotifications();
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('NotificationService: Connection error', error);
      this.connectionAttempts++;
      this.isConnected = false;
      
      // Handle authentication errors
      if (error.message && error.message.includes('Authentication')) {
        const token = getToken();
        console.warn('NotificationService: Authentication error with socket connection. Token exists:', !!token);
        
        if (this.connectionAttempts > 2) {
          console.warn('NotificationService: Multiple authentication failures, token may be invalid or expired');
        }
      }
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('NotificationService: Socket disconnected', reason);
      this.isConnected = false;
    });
  }

  public disconnect(): void {
    // Just clear our reference and event listeners, don't actually disconnect the socket
    // as it's managed by ApiService
    if (this.socket) {
      this.socket.off('connect');
      this.socket.off('disconnect');
      this.socket.off('connect_error');
      this.socket.off('device_status_changed');
      this.socket.off('deployment_status_changed');
      this.socket.off('payload_status_update');
      this.socket.off('system_update_available');
      this.socket.off('security_alert');
      
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

  /**
   * Test the socket connection and emit a diagnostic event
   */
  public async testSocketConnection(): Promise<boolean> {
    console.log('NotificationService: Testing socket connection...');
    
    // Get socket from ApiService
    this.socket = getSocket();
    console.log('NotificationService: Socket exists:', !!this.socket);
    console.log('NotificationService: Socket connected:', this.socket?.connected);
    console.log('NotificationService: Socket ID:', this.socket?.id);
    
    // If socket doesn't exist or isn't connected, ask ApiService to reconnect
    if (!this.socket || !this.socket.connected) {
      console.log('NotificationService: Socket not connected, requesting reconnection...');
      
      // Try to reconnect using ApiService
      ApiService.reconnectSocket();
      
      // Wait for connection with timeout
      return new Promise((resolve) => {
        // Set timeout for 5 seconds
        const timeoutId = setTimeout(() => {
          console.log('NotificationService: Socket connection timed out');
          this.notifySubscribers('system_update', {
            type: 'socket_test',
            success: false,
            message: 'WebSocket connection timed out',
            data: null
          });
          resolve(false);
        }, 5000);
        
        if (this.socket) {
          this.socket.once('connect', () => {
            clearTimeout(timeoutId);
            console.log('NotificationService: Socket connected, proceeding with test');
            this.emitTestEvent();
            resolve(true);
          });
        } else {
          clearTimeout(timeoutId);
          resolve(false);
        }
      });
    }

    // If socket is already connected, emit test event directly
    this.emitTestEvent();
    return true;
  }

  private emitTestEvent(): void {
    if (!this.socket) {
      console.error('NotificationService: Cannot emit test event - socket is null');
      this.notifySubscribers('system_update', {
        type: 'socket_test',
        success: false,
        message: 'WebSocket connection failed - socket is null',
        data: null
      });
      return;
    }
    
    console.log('NotificationService: Emitting test event...');
    
    try {
      this.socket.emit('ping_test', { 
        timestamp: new Date().toISOString(),
        clientInfo: {
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      });
      
      // Register a one-time listener for the server's response
      this.socket.once('pong_test', (data) => {
        console.log('NotificationService: Received pong response:', data);
        // Notify any subscribers
        this.notifySubscribers('system_update', {
          type: 'socket_test',
          success: true,
          message: 'WebSocket connectivity test succeeded',
          data
        });
      });
    } catch (error) {
      console.error('NotificationService: Error during test:', error);
      this.notifySubscribers('system_update', {
        type: 'socket_test',
        success: false,
        message: `WebSocket test failed: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      });
    }
  }
}

export default NotificationService.getInstance(); 