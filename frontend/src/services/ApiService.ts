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

  private constructor() {
    // Default configuration
    this.config = {
      endpoint: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
      pollingInterval: 60,
      timeout: 30
    };

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
}

export default ApiService.getInstance(); 