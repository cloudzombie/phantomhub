import { AxiosInstance, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { getToken, getUserData } from '../utils/tokenManager';
import { API_CONFIG } from '../config/api';

export interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  batteryLevel?: number;
  signalStrength?: number;
  errors?: string[];
}

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  pollingInterval: number;
}

class ApiService {
  private static instance: ApiService | null = null;
  private socket: Socket | null = null;
  private deviceSubscriptions: Map<string, Set<string>> = new Map();
  private deviceStates: Map<string, DeviceStatus> = new Map();
  private updateQueue: Map<string, NodeJS.Timeout> = new Map();
  private readonly UPDATE_THROTTLE = 5000; // 5 seconds
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly RECONNECT_DELAY = 5000; // 5 seconds
  private _isInitialized: boolean = false;
  private axiosInstance: AxiosInstance;
  private config: ApiConfig;
  private baseURL: string;
  private deviceState: Map<number, any> = new Map();
  private deviceSubscribers: Set<(devices: any[]) => void> = new Set();
  private lastDeviceUpdate: number = 0;
  private deviceUpdateThrottle: number = 5000; // 5 seconds
  private isReconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private socketReconnectDelay: number = 30000; // 30 seconds
  private subscriptionTimeout: NodeJS.Timeout | null = null;
  private isUpdating: boolean = false;
  private lastSocketAttempt: number = 0;
  private isSubscribed: boolean = false;
  private pendingUpdates: Set<number> = new Set();
  private updateTimeoutId: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      baseURL: 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api',
      timeout: 30,
      pollingInterval: 30 // 30 seconds default polling interval
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout * 1000,
      withCredentials: true
    });

    // Add request interceptor to include auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        config.withCredentials = true;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle auth errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          console.warn('ApiService: Received 401 Unauthorized response');
        }
        return Promise.reject(error);
      }
    );

    this.baseURL = API_CONFIG.socketEndpoint;
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  public static getSocket(): Socket | null {
    const instance = ApiService.getInstance();
    
    // If socket doesn't exist yet but we have a token, initialize it
    // Use tokenManager for consistency instead of direct localStorage access
    const token = getToken();
    if (!instance.socket && token) {
      instance.initializeSocket();
    }
    
    return instance.socket;
  }

  /**
   * Static method to reconnect the socket if disconnected
   */
  public static reconnectSocket(): void {
    const instance = ApiService.getInstance();
    
    // Only try to reconnect if we have a token
    // Use tokenManager for consistency instead of direct localStorage access
    const token = getToken();
    if (token) {
      instance.reconnectSocket();
    } else {
      console.warn('ApiService: Cannot reconnect socket without authentication token');
    }
  }

  private getCurrentUserId(): string | null {
    try {
      // Use tokenManager's getUserData for consistent user data handling
      const userData = getUserData();
      if (userData && userData.id) {
        return userData.id;
      }
      return null;
    } catch (error) {
      console.error('ApiService: Error getting current user ID:', error);
      // CRITICAL: Do NOT remove user data on parse error - just log it
      // This prevents logout on corrupted data
      console.warn('ApiService: Parse error but keeping user data to prevent logout');
      return null;
    }
  }

  private getSettingsKey(): string {
    const userId = this.getCurrentUserId();
    return userId ? `phantomhub_settings_${userId}` : 'phantomhub_settings';
  }

  private loadStoredConfig(): void {
    // In production, we always want to use the hardcoded Heroku URL
    // So we're not loading any stored config
    console.log('ApiService: Using hardcoded Heroku URL for API endpoint');
  }

  // Public method to explicitly reload settings for the current user
  public reloadSettings(): void {
    console.log('ApiService: Using hardcoded Heroku URL');
    // No need to reload settings as we're using hardcoded URL
  }

  public clearUserSettings(): void {
    try {
      const userId = this.getCurrentUserId();
      if (userId) {
        localStorage.removeItem(`phantomhub_settings_${userId}`);
      }
      localStorage.removeItem('phantomhub_settings'); // Remove legacy settings as well
    } catch (error) {
      console.error('Error clearing user settings:', error);
      // Still try to remove the legacy settings even if there was an error
      localStorage.removeItem('phantomhub_settings');
    }
  }

  // Clear all API settings from localStorage to ensure we use the hardcoded URL
  private clearAllApiSettings(): void {
    console.log('ApiService: Clearing all stored API settings');
    // Clear any user-specific settings
    this.clearUserSettings();
    
    // Also clear any settings that might be stored with different keys
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.includes('phantomhub_settings') || key.includes('api')) {
        console.log(`ApiService: Removing stored setting: ${key}`);
        localStorage.removeItem(key);
      }
    }
  }

  private handleConfigChange = (event: CustomEvent<ApiConfig>): void => {
    if (event.detail) {
      this.updateConfig(event.detail);
    }
  };

  private updateConfig(newConfig: ApiConfig): void {
    console.log('ApiService: Ignoring configuration update, using hardcoded Heroku URL');
    // In production, we always want to use the hardcoded Heroku URL
    // So we're not updating the config
  }

  public getConfig(): ApiConfig {
    // Always return the hardcoded config to prevent any overrides
    return {
      baseURL: 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api',
      timeout: 30,
      pollingInterval: 30 // 30 seconds default polling interval
    };
  }

  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    this.axiosInstance.defaults.baseURL = this.config.baseURL;
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    this.axiosInstance.defaults.baseURL = this.config.baseURL;
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    this.axiosInstance.defaults.baseURL = this.config.baseURL;
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    this.axiosInstance.defaults.baseURL = this.config.baseURL;
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  // Update getDeviceState to handle both cases with proper type checking
  public getDeviceState(deviceId?: string): any[] {
    if (deviceId) {
      const status = this.deviceStates.get(deviceId);
      return status ? [status] : [];
    }
    return Array.from(this.deviceState.values());
  }

  // Add method to get device status specifically
  public getDeviceStatus(deviceId: string): DeviceStatus | undefined {
    return this.deviceStates.get(deviceId);
  }

  // Update device state with strict controls
  private updateDeviceState(devices: any[]): void {
    // Skip if no devices to update
    if (!devices.length) return;

    // Add device IDs to pending updates
    devices.forEach(device => {
      if (device?.id) this.pendingUpdates.add(device.id);
    });

    // Clear any existing timeout
    if (this.updateTimeoutId) {
      clearTimeout(this.updateTimeoutId);
    }

    // Set a new timeout to process updates
    this.updateTimeoutId = setTimeout(() => {
      if (this.pendingUpdates.size === 0) return;

      const now = Date.now();
      if (now - this.lastDeviceUpdate < this.deviceUpdateThrottle) {
        return;
      }

      this.lastDeviceUpdate = now;
      let hasChanges = false;

      // Process all pending updates
      this.pendingUpdates.forEach(deviceId => {
        const device = devices.find(d => d.id === deviceId);
        if (device) {
          const currentDevice = this.deviceState.get(deviceId);
          if (!currentDevice || JSON.stringify(currentDevice) !== JSON.stringify(device)) {
            this.deviceState.set(deviceId, device);
            hasChanges = true;
          }
        }
      });

      // Clear pending updates
      this.pendingUpdates.clear();

      // Only notify if we have actual changes
      if (hasChanges) {
        this.notifyDeviceSubscribers();
      }
    }, 100); // Batch updates within 100ms
  }

  // Update notifyDeviceSubscribers to use current state
  private notifyDeviceSubscribers(): void {
    const currentDevices = this.getDeviceState();
    this.deviceSubscribers.forEach(callback => {
      try {
        callback(currentDevices);
      } catch (error) {
        console.error('ApiService: Error in device update subscriber:', error);
      }
    });
  }

  // Update subscribeToDeviceUpdates to use Set and handle state
  public subscribeToDeviceUpdates(callback: (devices: any[]) => void): () => void {
    if (!this.socket?.connected && !this.isReconnecting) {
      this.initializeSocket();
    }

    this.deviceSubscribers.add(callback);

    // Clear any existing subscription timeout
    if (this.subscriptionTimeout) {
      clearTimeout(this.subscriptionTimeout);
    }

    // Set up new subscription timeout
    this.subscriptionTimeout = setTimeout(() => {
      if (this.socket?.connected && !this.isSubscribed) {
        this.socket.emit('subscribe_device_updates');
        this.isSubscribed = true;
      }
    }, 1000);

    // Immediately notify with current state
    const currentDevices = this.getDeviceState();
    if (currentDevices.length > 0) {
      callback(currentDevices);
    }

    // Return unsubscribe function
    return () => {
      this.deviceSubscribers.delete(callback);
      
      if (this.deviceSubscribers.size === 0) {
        if (this.socket?.connected) {
          this.socket.emit('unsubscribe_device_updates');
          this.isSubscribed = false;
        }
        this.deviceState.clear();
        this.pendingUpdates.clear();
        if (this.updateTimeoutId) {
          clearTimeout(this.updateTimeoutId);
          this.updateTimeoutId = null;
        }
      }
    };
  }

  /**
   * Initialize Socket.IO connection with proper authentication
   */
  private initializeSocket(): void {
    const now = Date.now();
    if (this.socket?.connected || 
        (now - this.lastSocketAttempt < this.socketReconnectDelay) ||
        this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.lastSocketAttempt = now;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    const token = getToken();
    if (!token) {
      console.warn('ApiService: Cannot initialize socket without auth token');
      return;
    }

    this.socket = io(this.baseURL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: this.socketReconnectDelay,
      reconnectionDelayMax: 60000, // 1 minute max
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000, // 20 second timeout
      transports: ['websocket'],
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.lastSocketAttempt = 0;
      
      if (this.deviceSubscribers.size > 0 && !this.isSubscribed) {
        this.socket?.emit('subscribe_device_updates');
        this.isSubscribed = true;
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isReconnecting = true;
      this.reconnectAttempts++;
      this.isSubscribed = false;

      // Clear device state on disconnect
      this.deviceState.clear();
      this.pendingUpdates.clear();
      if (this.updateTimeoutId) {
        clearTimeout(this.updateTimeoutId);
        this.updateTimeoutId = null;
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isReconnecting = true;
      this.reconnectAttempts++;
      this.isSubscribed = false;
    });

    this.socket.on('device_status_update', (devices: any[]) => {
      if (Array.isArray(devices)) {
        this.updateDeviceState(devices);
      }
    });

    this.socket.on('device_status_changed', (update: any) => {
      if (update && update.id) {
        this.updateDeviceState([update]);
      }
    });
  }

  /**
   * Reconnect socket if disconnected with enhanced token handling
   */
  public reconnectSocket(): void {
    const now = Date.now();
    
    // More strict reconnection throttling
    if (now - this.lastSocketAttempt < this.socketReconnectDelay) {
      console.log('ApiService: Skipping socket reconnection, too soon since last attempt');
      return;
    }
    
    if (this.isReconnecting) {
      console.log('ApiService: Socket reconnection already in progress');
      return;
    }
    
    // Reset reconnection attempts when manually reconnecting
    this.reconnectAttempts = 0;
    
    this.lastSocketAttempt = now;
    this.initializeSocket();
  }
  
  /**
   * Save user settings without removing tokens
   * This is used before logout to ensure settings are saved but tokens aren't removed
   */
  public saveUserSettings(): void {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        console.log('ApiService: No user ID available, skipping settings save');
        return;
      }
      
      console.log('ApiService: Saving user settings before logout');
      // We're intentionally NOT removing any tokens or user data here
      // Just trigger any API calls needed to save settings
      
      // Dispatch an event that other services can listen to for saving their state
      document.dispatchEvent(new CustomEvent('save-user-settings', {
        detail: { userId }
      }));
    } catch (error) {
      console.error('ApiService: Error saving user settings', error);
    }
  }

  // Cleanup method to be called when the service is being destroyed
  public cleanup(): void {
    if (this.subscriptionTimeout) {
      clearTimeout(this.subscriptionTimeout);
      this.subscriptionTimeout = null;
    }
    
    if (this.updateTimeoutId) {
      clearTimeout(this.updateTimeoutId);
      this.updateTimeoutId = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.deviceState.clear();
    this.pendingUpdates.clear();
    this.deviceSubscribers.clear();
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this._isInitialized = false;
    this.isSubscribed = false;
  }

  // Method to check if service is initialized
  public isInitialized(): boolean {
    return this._isInitialized;
  }

  // Method to initialize service
  public initialize(): void {
    if (!this._isInitialized) {
      this.initializeSocket();
      this._isInitialized = true;
    }
  }

  public async connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      if (this.connectionAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
        this.isConnecting = false;
        return;
      }

      this.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000', {
        reconnection: false,
        timeout: 5000
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.isConnecting = false;
        this.connectionAttempts = 0;
        this.resubscribeDevices();
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.clearAllDeviceStates();
      });

      this.socket.on('device:status', (deviceId: string, status: DeviceStatus) => {
        this.handleDeviceStatusUpdate(deviceId, status);
      });

      this.socket.on('device:error', (deviceId: string, error: any) => {
        this.handleDeviceError(deviceId, error);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnecting = false;
        this.connectionAttempts++;
        setTimeout(() => this.connect(), this.RECONNECT_DELAY);
      });

    } catch (error) {
      console.error('Error connecting socket:', error);
      this.isConnecting = false;
      this.connectionAttempts++;
      setTimeout(() => this.connect(), this.RECONNECT_DELAY);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.clearAllDeviceStates();
    this.deviceSubscriptions.clear();
    this.clearAllUpdateQueues();
  }

  private clearAllDeviceStates(): void {
    this.deviceStates.clear();
  }

  private clearAllUpdateQueues(): void {
    for (const timeout of this.updateQueue.values()) {
      clearTimeout(timeout);
    }
    this.updateQueue.clear();
  }

  private async resubscribeDevices(): Promise<void> {
    for (const [deviceId, subscribers] of this.deviceSubscriptions.entries()) {
      if (subscribers.size > 0) {
        await this.subscribeToDevice(deviceId);
      }
    }
  }

  public async subscribeToDevice(deviceId: string, subscriberId?: string): Promise<void> {
    if (!this.socket?.connected) {
      await this.connect();
    }

    if (!this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.set(deviceId, new Set());
    }

    if (subscriberId) {
      this.deviceSubscriptions.get(deviceId)?.add(subscriberId);
    }

    if (this.socket?.connected) {
      this.socket.emit('device:subscribe', deviceId);
    }
  }

  public unsubscribeFromDevice(deviceId: string, subscriberId?: string): void {
    const subscribers = this.deviceSubscriptions.get(deviceId);
    if (!subscribers) return;

    if (subscriberId) {
      subscribers.delete(subscriberId);
    }

    if (!subscriberId || subscribers.size === 0) {
      this.deviceSubscriptions.delete(deviceId);
      if (this.socket?.connected) {
        this.socket.emit('device:unsubscribe', deviceId);
      }
      this.deviceStates.delete(deviceId);
      const timeout = this.updateQueue.get(deviceId);
      if (timeout) {
        clearTimeout(timeout);
        this.updateQueue.delete(deviceId);
      }
    }
  }

  private handleDeviceStatusUpdate(deviceId: string, status: DeviceStatus): void {
    const currentState = this.deviceStates.get(deviceId);
    
    // Only update if state has changed
    if (!currentState || 
        currentState.status !== status.status || 
        currentState.batteryLevel !== status.batteryLevel ||
        currentState.signalStrength !== status.signalStrength) {
      
      this.deviceStates.set(deviceId, status);
      
      // Throttle updates
      const existingTimeout = this.updateQueue.get(deviceId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const timeout = setTimeout(() => {
        this.emitDeviceUpdate(deviceId, status);
        this.updateQueue.delete(deviceId);
      }, this.UPDATE_THROTTLE);
      
      this.updateQueue.set(deviceId, timeout);
    }
  }

  private handleDeviceError(deviceId: string, error: any): void {
    const errorStatus: DeviceStatus = {
      deviceId,
      status: 'error',
      lastSeen: new Date().toISOString(),
      errors: [error.message || 'Unknown error']
    };
    
    this.handleDeviceStatusUpdate(deviceId, errorStatus);
  }

  private emitDeviceUpdate(deviceId: string, status: DeviceStatus): void {
    const event = new CustomEvent('device:update', {
      detail: { deviceId, status }
    });
    window.dispatchEvent(event);
  }

  public async refreshDeviceStatus(deviceId: string): Promise<void> {
    if (!this.socket?.connected) {
      await this.connect();
    }

    if (this.socket?.connected) {
      this.socket.emit('device:refresh', deviceId);
    }
  }
}

export const apiService = ApiService.getInstance();
export { ApiService }; 