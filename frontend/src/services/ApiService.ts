import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { io, Socket } from 'socket.io-client';
import { getToken, getUserData } from '../utils/tokenManager';
import { API_CONFIG } from '../config/api';

interface ApiConfig {
  endpoint: string;
  pollingInterval: number;
  timeout: number;
}

class ApiService {
  private static instance: ApiService;
  private axiosInstance: AxiosInstance;
  private config: ApiConfig;
  private socket: Socket | null = null;
  private baseURL: string;
  private deviceState: Map<number, any> = new Map();
  private deviceSubscribers: Set<(devices: any[]) => void> = new Set();
  private lastDeviceUpdate: number = 0;
  private deviceUpdateThrottle: number = 5000; // 5 seconds
  private isReconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = API_CONFIG.maxReconnectAttempts;
  private socketReconnectDelay: number = API_CONFIG.reconnectDelay;
  private subscriptionTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      endpoint: API_CONFIG.endpoint,
      pollingInterval: API_CONFIG.pollingInterval,
      timeout: API_CONFIG.timeout
    };

    // Initialize axios instance with default config
    this.axiosInstance = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout * 1000,
      withCredentials: true
    });

    // Add request interceptor to include auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
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
      endpoint: 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api',
      pollingInterval: 300,
      timeout: 30
    };
  }

  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    // Ensure we're always using the Heroku URL
    this.axiosInstance.defaults.baseURL = this.config.endpoint;
    
    // Ensure auth token is included in request
    const token = getToken();
    if (token) {
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    console.log(`ApiService: Making GET request to ${this.axiosInstance.defaults.baseURL}${url}`);
    const response = await this.axiosInstance.get<T>(url, {
      ...config,
      withCredentials: true
    });
    return response.data;
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    // Ensure we're always using the Heroku URL
    this.axiosInstance.defaults.baseURL = this.config.endpoint;
    console.log(`ApiService: Making POST request to ${this.axiosInstance.defaults.baseURL}${url}`);
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    // Ensure we're always using the Heroku URL
    this.axiosInstance.defaults.baseURL = this.config.endpoint;
    console.log(`ApiService: Making PUT request to ${this.axiosInstance.defaults.baseURL}${url}`);
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    // Ensure we're always using the Heroku URL
    this.axiosInstance.defaults.baseURL = this.config.endpoint;
    console.log(`ApiService: Making DELETE request to ${this.axiosInstance.defaults.baseURL}${url}`);
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  // Add method to get current device state
  public getDeviceState(): any[] {
    return Array.from(this.deviceState.values());
  }

  // Add method to update device state
  private updateDeviceState(devices: any[]): void {
    const now = Date.now();
    if (now - this.lastDeviceUpdate < this.deviceUpdateThrottle) {
      return;
    }

    this.lastDeviceUpdate = now;
    
    // Update device state map
    devices.forEach(device => {
      this.deviceState.set(device.id, device);
    });

    // Notify subscribers with current state
    this.notifyDeviceSubscribers();
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
    this.deviceSubscribers.add(callback);

    // Clear any existing subscription timeout
    if (this.subscriptionTimeout) {
      clearTimeout(this.subscriptionTimeout);
    }

    // Set up new subscription timeout
    this.subscriptionTimeout = setTimeout(() => {
      if (this.socket?.connected) {
        this.socket.emit('subscribe_device_updates');
      }
    }, 1000);

    // Immediately notify with current state
    callback(this.getDeviceState());

    // Return unsubscribe function
    return () => {
      this.deviceSubscribers.delete(callback);
      
      // If no more subscribers, unsubscribe from updates
      if (this.deviceSubscribers.size === 0 && this.socket?.connected) {
        this.socket.emit('unsubscribe_device_updates');
      }
    };
  }

  /**
   * Initialize Socket.IO connection with proper authentication
   */
  private initializeSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(this.baseURL, {
      auth: {
        token: getToken()
      },
      reconnection: true,
      reconnectionDelay: this.socketReconnectDelay,
      reconnectionDelayMax: this.socketReconnectDelay * 2,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: this.config.timeout
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      
      // Only emit subscribe if we have subscribers
      if (this.deviceSubscribers.size > 0) {
        this.socket?.emit('subscribe_device_updates');
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.isReconnecting = true;
      this.reconnectAttempts++;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.isReconnecting = true;
    });

    this.socket.on('device_status_update', (devices: any[]) => {
      this.updateDeviceState(devices);
    });

    this.socket.on('device_status_changed', (update: any) => {
      this.updateDeviceState([update]);
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
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.deviceState.clear();
    this.deviceSubscribers.clear();
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
  }
}

// Export the instance as default
const apiServiceInstance = ApiService.getInstance();
export default apiServiceInstance;

// Also export the class for static method access
export { ApiService }; 