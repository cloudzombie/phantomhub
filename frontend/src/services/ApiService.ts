import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { io, Socket } from 'socket.io-client';
import { getToken, getUserData } from '../utils/tokenManager';

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
  private lastSocketAttempt: number = 0;
  private socketReconnectDelay: number = 5000; // 5 seconds between reconnection attempts

  private constructor() {
    // Always use the Heroku URL for API endpoint
    this.config = {
      endpoint: 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api',
      pollingInterval: 300, // 5 minutes
      timeout: 30
    };

    // Clear any stored API settings that might override our hardcoded URL
    this.clearAllApiSettings();

    // Initialize axios instance with default config
    this.axiosInstance = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout * 1000,
      withCredentials: true // Always send cookies with requests
    });

    // Add request interceptor to include auth token - use tokenManager for consistency
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = getToken(); // Use tokenManager instead of direct localStorage access
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        // Always set withCredentials to true for all requests
        config.withCredentials = true;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle auth errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // Special handling for auth errors
        if (error.response && error.response.status === 401) {
          console.warn('ApiService: Received 401 Unauthorized response');
          // Don't clear auth data here to prevent unexpected logouts
        }
        return Promise.reject(error);
      }
    );

    // Set up listener for configuration changes
    document.addEventListener('api-config-changed', this.handleConfigChange as EventListener);
    
    // We're not loading stored configuration anymore
    // this.loadStoredConfig();
    
    // Always use the Heroku URL for socket connections
    this.baseURL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com';
    
    // We'll initialize the socket connection when needed, not during construction
    // This ensures we have a token available when connecting
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

  /**
   * Initialize Socket.IO connection with proper authentication
   */
  private initializeSocket(): void {
    try {
      const token = getToken();
      
      if (!token) {
        console.warn('ApiService: No auth token available for socket connection');
        return;
      }

      if (this.socket?.connected) {
        console.log('ApiService: Socket already connected, skipping initialization');
        return;
      }
      
      if (this.socket) {
        console.log('ApiService: Disconnecting existing socket before creating a new one');
        this.socket.disconnect();
      }
      
      this.socket = io(this.baseURL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0.5,
        autoConnect: true,
        transports: ['websocket'],
        auth: {
          token: token
        },
        forceNew: true,
        timeout: 45000
      });
      
      this.setupSocketEventHandlers();
    } catch (error) {
      console.error('ApiService: Error initializing socket:', error);
    }
  }
  
  /**
   * Set up event handlers for socket connection
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('ApiService: Socket connected');
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('ApiService: Socket disconnected:', reason);
    });
    
    this.socket.on('error', (error) => {
      console.error('ApiService: Socket error:', error);
    });
  }
  
  /**
   * Reconnect socket if disconnected with enhanced token handling
   */
  public reconnectSocket(): void {
    const now = Date.now();
    if (now - this.lastSocketAttempt < this.socketReconnectDelay) {
      console.log('ApiService: Skipping socket reconnection, too soon since last attempt');
      return;
    }
    
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
}

// Export the instance as default
const apiServiceInstance = ApiService.getInstance();
export default apiServiceInstance;

// Also export the class for static method access
export { ApiService }; 