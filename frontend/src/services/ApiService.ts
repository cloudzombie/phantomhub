import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { io, Socket } from 'socket.io-client';

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

  private constructor() {
    // Default configuration with the correct production URL
    this.config = {
      endpoint: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
      pollingInterval: 60,
      timeout: 30
    };

    // For production builds, ensure we're using the Heroku URL
    if (import.meta.env.PROD) {
      this.config.endpoint = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';
    }

    // Initialize axios instance with default config
    this.axiosInstance = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout * 1000
    });

    // Add request interceptor to include auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Set up listener for configuration changes
    document.addEventListener('api-config-changed', this.handleConfigChange as EventListener);
    
    // Load stored configuration
    this.loadStoredConfig();
    
    // Set baseURL (without /api suffix)
    this.baseURL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
    
    // For production builds, ensure we're using the Heroku URL
    if (import.meta.env.PROD) {
      this.baseURL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com';
    }
    
    // Initialize socket connection
    this.initializeSocket();
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  public static getSocket(): Socket | null {
    return ApiService.getInstance().socket;
  }

  /**
   * Static method to reconnect the socket if disconnected
   */
  public static reconnectSocket(): void {
    ApiService.getInstance().reconnectSocket();
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

  private loadStoredConfig(): void {
    try {
      const storedSettings = localStorage.getItem(this.getSettingsKey());
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        if (settings.api) {
          this.updateConfig(settings.api);
        }
      }
    } catch (error) {
      console.error('Error loading stored API configuration:', error);
    }
  }

  // Public method to explicitly reload settings for the current user
  public reloadSettings(): void {
    console.log('ApiService: Reloading settings for user');
    this.loadStoredConfig();
  }

  public clearUserSettings(): void {
    const userId = this.getCurrentUserId();
    if (userId) {
      localStorage.removeItem(`phantomhub_settings_${userId}`);
    }
    localStorage.removeItem('phantomhub_settings'); // Remove legacy settings as well
  }

  private handleConfigChange = (event: CustomEvent<ApiConfig>): void => {
    if (event.detail) {
      this.updateConfig(event.detail);
    }
  };

  private updateConfig(newConfig: ApiConfig): void {
    console.log('ApiService: Updating configuration', newConfig);
    this.config = { ...this.config, ...newConfig };
    
    // Update axios instance with new config
    this.axiosInstance.defaults.baseURL = this.config.endpoint;
    this.axiosInstance.defaults.timeout = this.config.timeout * 1000;
  }

  public getConfig(): ApiConfig {
    return { ...this.config };
  }

  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
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
      // Use environment variable for socket URL to ensure consistent configuration
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
      console.log('ApiService: Initializing socket connection to', socketUrl);
      
      // Get token for authentication
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('ApiService: No auth token available for socket connection');
        return;
      }
      
      // Configure Socket.IO with robust connection options
      this.socket = io(socketUrl, {
        reconnection: true,
        reconnectionAttempts: 10, // Increased from 5 to 10 for better reliability
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        autoConnect: true,
        transports: ['websocket', 'polling'], // Support both transport methods
        auth: {
          token: token
        },
        forceNew: true,
        timeout: 45000,
        path: '/socket.io/' // Ensure the path matches the server configuration
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
      console.log('ApiService: Socket connected successfully');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('ApiService: Socket connection error:', error);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('ApiService: Socket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // If the server disconnected us, try to reconnect
        this.socket?.connect();
      }
    });
    
    // Debug listener for all events
    this.socket.onAny((event, ...args) => {
      console.debug(`ApiService: Socket event "${event}" received:`, args);
    });
  }
  
  /**
   * Reconnect socket if disconnected
   */
  public reconnectSocket(): void {
    if (this.socket && !this.socket.connected) {
      console.log('ApiService: Attempting to reconnect socket');
      this.socket.connect();
    } else if (!this.socket) {
      console.log('ApiService: Initializing new socket connection');
      this.initializeSocket();
    }
  }
}

// Export the instance as default
const apiServiceInstance = ApiService.getInstance();
export default apiServiceInstance;

// Also export the class for static method access
export { ApiService }; 