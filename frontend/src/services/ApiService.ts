import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

interface ApiConfig {
  endpoint: string;
  pollingInterval: number;
  timeout: number;
}

class ApiService {
  private static instance: ApiService;
  private axiosInstance: AxiosInstance;
  private config: ApiConfig;
  private baseURL: string;

  private constructor() {
    // Default configuration
    this.config = {
      endpoint: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
      pollingInterval: 60,
      timeout: 30
    };

    // Clear any stored API settings that might override our hardcoded URL
    this.clearAllApiSettings();

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
    
    // We're not loading stored configuration anymore
    // this.loadStoredConfig();
    
    // Always use the Heroku URL for socket connections
    this.baseURL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com';
    
    // Initialize socket connection
    this.initializeSocket();
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
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
    // In production, we always want to use the hardcoded Heroku URL
    // So we're not loading any stored config
    console.log('ApiService: Using hardcoded Heroku URL for API endpoint');
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
    console.log('ApiService: Ignoring configuration update in production', newConfig);
    // In production, we always want to use the hardcoded Heroku URL
    // So we're not updating the config
    
    // Force the baseURL to always be the hardcoded Heroku URL
    this.axiosInstance.defaults.baseURL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';
    this.axiosInstance.defaults.timeout = this.config.timeout * 1000;
  }

  public getConfig(): ApiConfig {
    return { ...this.config };
  }

  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    // Force the baseURL to be the hardcoded Heroku URL before each request
    this.axiosInstance.defaults.baseURL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';
    console.log(`ApiService: Making GET request to ${this.axiosInstance.defaults.baseURL}${url}`);
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    // Force the baseURL to be the hardcoded Heroku URL before each request
    this.axiosInstance.defaults.baseURL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';
    console.log(`ApiService: Making POST request to ${this.axiosInstance.defaults.baseURL}${url}`);
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    // Force the baseURL to be the hardcoded Heroku URL before each request
    this.axiosInstance.defaults.baseURL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';
    console.log(`ApiService: Making PUT request to ${this.axiosInstance.defaults.baseURL}${url}`);
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    // Force the baseURL to be the hardcoded Heroku URL before each request
    this.axiosInstance.defaults.baseURL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';
    console.log(`ApiService: Making DELETE request to ${this.axiosInstance.defaults.baseURL}${url}`);
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  private initializeSocket(): void {
    console.log('Initializing socket connection to:', this.baseURL);
    // Socket initialization logic here
  }
}

export default ApiService.getInstance(); 