import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import { WebSocketManager } from '../core/WebSocketManager';
import { getToken, getUserData } from '../utils/tokenManager';
import { API_CONFIG } from '../config/api';
import { Socket } from 'socket.io-client';

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
  endpoint: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export class ApiService {
  private static instance: ApiService | null = null;
  private axiosInstance: AxiosInstance;
  private config: ApiConfig;
  private wsManager: WebSocketManager;
  private deviceSubscriptions: Map<string, Set<string>> = new Map();
  private deviceStates: Map<string, DeviceStatus> = new Map();
  private updateQueue: Map<string, NodeJS.Timeout> = new Map();
  private readonly UPDATE_THROTTLE = 5000; // 5 seconds
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly RECONNECT_DELAY = 5000; // 5 seconds
  private _isInitialized: boolean = false;
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
      baseURL: API_CONFIG.baseURL,
      timeout: 30,
      pollingInterval: 30,
      endpoint: API_CONFIG.endpoint
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout * 1000,
      withCredentials: true
    });

    this.wsManager = WebSocketManager.getInstance();

    this.setupInterceptors();

    this.baseURL = API_CONFIG.socketEndpoint;
  }

  private setupInterceptors(): void {
    // Request interceptor
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

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.warn('ApiService: Received 401 Unauthorized response');
        }
        return Promise.reject(error);
      }
    );
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private handleError(error: any): void {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('ApiService: Response error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('ApiService: Request error:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('ApiService: Error:', error.message);
    }
  }

  public getWebSocketManager(): WebSocketManager {
    return this.wsManager;
  }

  public getSocket(): Socket | null {
    return this.wsManager.getSocket();
  }

  public getConfig(): ApiConfig {
    return { ...this.config };
  }

  public getDeviceState(deviceId?: string): any[] {
    if (deviceId) {
      const status = this.deviceStates.get(deviceId);
      return status ? [status] : [];
    }
    return Array.from(this.deviceState.values());
  }

  public getDeviceStatus(deviceId: string): DeviceStatus | undefined {
    return this.deviceStates.get(deviceId);
  }

  private updateDeviceState(devices: any[]): void {
    if (!devices.length) return;

    devices.forEach(device => {
      if (device?.id) this.pendingUpdates.add(device.id);
    });

    if (this.updateTimeoutId) {
      clearTimeout(this.updateTimeoutId);
    }

    this.updateTimeoutId = setTimeout(() => {
      if (this.pendingUpdates.size === 0) return;

      const now = Date.now();
      if (now - this.lastDeviceUpdate < this.deviceUpdateThrottle) {
        return;
      }

      this.lastDeviceUpdate = now;
      let hasChanges = false;

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

      this.pendingUpdates.clear();

      if (hasChanges) {
        this.notifyDeviceSubscribers();
      }
    }, 100);
  }

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

  public subscribeToDeviceUpdates(callback: (devices: any[]) => void): () => void {
    if (!this.wsManager.isConnected() && !this.isReconnecting) {
      this.wsManager.connect();
    }

    this.deviceSubscribers.add(callback);

    if (this.subscriptionTimeout) {
      clearTimeout(this.subscriptionTimeout);
    }

    this.subscriptionTimeout = setTimeout(() => {
      if (this.wsManager.isConnected() && !this.isSubscribed) {
        this.wsManager.subscribe('device_status_update', this.handleDeviceUpdate.bind(this));
        this.isSubscribed = true;
      }
    }, 1000);

    const currentDevices = this.getDeviceState();
    if (currentDevices.length > 0) {
      callback(currentDevices);
    }

    return () => {
      this.deviceSubscribers.delete(callback);
      
      if (this.deviceSubscribers.size === 0) {
        if (this.wsManager.isConnected()) {
          this.wsManager.unsubscribe('device_status_update', this.handleDeviceUpdate.bind(this));
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

  private setupWebSocketListeners(): void {
    this.wsManager.subscribe('device_status_update', this.handleDeviceUpdate.bind(this));
    this.wsManager.subscribe('device_error', this.handleDeviceError.bind(this));
    this.wsManager.subscribe('device_activity', this.handleDeviceActivity.bind(this));
  }

  private handleDeviceUpdate(data: any): void {
    if (data && data.deviceId) {
      const deviceId = data.deviceId;
      const status = data.status;
      this.handleDeviceStatusUpdate(deviceId, status);
    }
  }

  private handleDeviceError(data: any): void {
    if (data && data.deviceId) {
      const deviceId = data.deviceId;
      const error = data.error;
      
      const errorStatus: DeviceStatus = {
        deviceId,
        status: 'error',
        lastSeen: new Date().toISOString(),
        errors: [error.message || 'Unknown error']
      };
      
      this.handleDeviceStatusUpdate(deviceId, errorStatus);
    }
  }

  private handleDeviceActivity(data: any): void {
    if (data && data.deviceId) {
      const deviceId = data.deviceId;
      const activity = data.activity;
      // Handle device activity updates
      console.log(`Device ${deviceId} activity:`, activity);
    }
  }

  private handleDeviceStatusUpdate(deviceId: string, status: DeviceStatus): void {
    const currentState = this.deviceStates.get(deviceId);
    
    if (!currentState || 
        currentState.status !== status.status || 
        currentState.batteryLevel !== status.batteryLevel ||
        currentState.signalStrength !== status.signalStrength) {
      
      this.deviceStates.set(deviceId, status);
      
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

  private emitDeviceUpdate(deviceId: string, status: DeviceStatus): void {
    const event = new CustomEvent('device:update', {
      detail: { deviceId, status }
    });
    window.dispatchEvent(event);
  }

  public async refreshDeviceStatus(deviceId: string): Promise<void> {
    if (!this.wsManager.isConnected()) {
      await this.connect();
    }

    if (this.wsManager.isConnected()) {
      this.wsManager.emit('device:refresh', deviceId);
    }
  }

  public isInitialized(): boolean {
    return this._isInitialized;
  }

  public initialize(): void {
    if (!this._isInitialized) {
      this.connect();
      this._isInitialized = true;
    }
  }

  public async saveUserSettings(): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        console.log('ApiService: No user ID available, skipping settings save');
        return;
      }
      
      console.log('ApiService: Saving user settings before logout');
      document.dispatchEvent(new CustomEvent('save-user-settings', {
        detail: { userId }
      }));
    } catch (error) {
      console.error('ApiService: Error saving user settings', error);
    }
  }

  public cleanup(): void {
    if (this.subscriptionTimeout) {
      clearTimeout(this.subscriptionTimeout);
      this.subscriptionTimeout = null;
    }
    
    if (this.updateTimeoutId) {
      clearTimeout(this.updateTimeoutId);
      this.updateTimeoutId = null;
    }
    
    if (this.wsManager.isConnected()) {
      this.wsManager.disconnect();
    }
    
    this.deviceState.clear();
    this.pendingUpdates.clear();
    this.deviceSubscribers.clear();
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this._isInitialized = false;
    this.isSubscribed = false;
  }

  private getCurrentUserId(): string | null {
    try {
      const userData = getUserData();
      if (userData && userData.id) {
        return userData.id;
      }
      return null;
    } catch (error) {
      console.error('ApiService: Error getting current user ID:', error);
      console.warn('ApiService: Parse error but keeping user data to prevent logout');
      return null;
    }
  }

  private getSettingsKey(): string {
    const userId = this.getCurrentUserId();
    return userId ? `phantomhub_settings_${userId}` : 'phantomhub_settings';
  }

  private loadStoredConfig(): void {
    console.log('ApiService: Using hardcoded Heroku URL for API endpoint');
  }

  public reloadSettings(): void {
    console.log('ApiService: Using hardcoded Heroku URL');
  }

  public clearUserSettings(): void {
    try {
      const userId = this.getCurrentUserId();
      if (userId) {
        localStorage.removeItem(`phantomhub_settings_${userId}`);
      }
      localStorage.removeItem('phantomhub_settings');
    } catch (error) {
      console.error('Error clearing user settings:', error);
      localStorage.removeItem('phantomhub_settings');
    }
  }

  private clearAllApiSettings(): void {
    console.log('ApiService: Clearing all stored API settings');
    this.clearUserSettings();
    
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
  }

  public async connect(): Promise<void> {
    if (this.wsManager.isConnected() || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      if (this.connectionAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
        this.isConnecting = false;
        return;
      }

      this.wsManager.connect();
      this.setupWebSocketListeners();

    } catch (error) {
      console.error('Error connecting socket:', error);
      this.isConnecting = false;
      this.connectionAttempts++;
      setTimeout(() => this.connect(), this.RECONNECT_DELAY);
    }
  }

  public disconnect(): void {
    if (this.wsManager.isConnected()) {
      this.wsManager.unsubscribe('device_status_update', this.handleDeviceUpdate.bind(this));
      this.wsManager.unsubscribe('device_error', this.handleDeviceError.bind(this));
      this.wsManager.unsubscribe('device_activity', this.handleDeviceActivity.bind(this));
      this.wsManager.disconnect();
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
    if (!this.wsManager.isConnected()) {
      await this.connect();
    }

    if (!this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.set(deviceId, new Set());
    }

    if (subscriberId) {
      this.deviceSubscriptions.get(deviceId)?.add(subscriberId);
    }

    if (this.wsManager.isConnected()) {
      this.wsManager.subscribe('device_status_update', this.handleDeviceUpdate.bind(this));
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
      if (this.wsManager.isConnected()) {
        this.wsManager.unsubscribe('device_status_update', this.handleDeviceUpdate.bind(this));
      }
      this.deviceStates.delete(deviceId);
      const timeout = this.updateQueue.get(deviceId);
      if (timeout) {
        clearTimeout(timeout);
        this.updateQueue.delete(deviceId);
      }
    }
  }
}

export const apiService = ApiService.getInstance(); 