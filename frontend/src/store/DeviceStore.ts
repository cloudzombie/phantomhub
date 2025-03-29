import { makeAutoObservable, runInAction } from 'mobx';
import { api } from '../services/api';
import { WebSocketManager } from '../core/WebSocketManager';
import axios from 'axios';
import type { Device } from '../core/apiClient';

export interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline' | 'busy' | 'error' | 'attacking';
  lastSeen: string;
  batteryLevel?: number;
  signalStrength?: number;
  errors?: string[];
}

export class DeviceStore {
  private devices: Map<string, Device> = new Map();
  private deviceStatuses: Map<string, DeviceStatus> = new Map();
  private isLoading: boolean = false;
  private error: string | null = null;
  private wsManager: WebSocketManager;

  constructor() {
    makeAutoObservable(this);
    this.wsManager = WebSocketManager.getInstance();
    this.setupWebSocketListeners();
  }

  public initialize(): void {
    // Ensure WebSocket connection is established
    this.wsManager.connect();
    // Fetch initial devices
    this.fetchDevices();
  }

  private setupWebSocketListeners(): void {
    // Subscribe to device status updates
    this.wsManager.subscribe('device_status_update', this.handleDeviceUpdate.bind(this));
    // Subscribe to device errors
    this.wsManager.subscribe('device_error', this.handleDeviceError.bind(this));
    // Subscribe to device activity
    this.wsManager.subscribe('device_activity', this.handleDeviceActivity.bind(this));
  }

  private handleDeviceUpdate(data: { deviceId: string; status: DeviceStatus }): void {
    runInAction(() => {
      const { deviceId, status } = data;
      this.deviceStatuses.set(deviceId, status);
      const device = this.devices.get(deviceId);
      if (device) {
        this.devices.set(deviceId, {
          ...device,
          status: status.status,
          lastCheckIn: status.lastSeen
        });
      }
    });
  }

  private handleDeviceError(data: { deviceId: string; error: any }): void {
    runInAction(() => {
      const { deviceId, error } = data;
      const device = this.devices.get(deviceId);
      if (device) {
        this.devices.set(deviceId, {
          ...device,
          status: 'error',
          errors: [...(device.errors || []), error.message || 'Unknown error']
        });
      }
    });
  }

  private handleDeviceActivity(data: { deviceId: string; activity: any }): void {
    runInAction(() => {
      const { deviceId, activity } = data;
      const device = this.devices.get(deviceId);
      if (device) {
        // Update device status based on activity
        const newStatus = activity.type === 'attack_started' ? 'attacking' : 
                         activity.type === 'attack_completed' ? 'online' : 
                         device.status;
        
        this.devices.set(deviceId, {
          ...device,
          status: newStatus,
          lastCheckIn: new Date().toISOString()
        });
      }
    });
  }

  public async fetchDevices(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await api.get<Device[]>('/devices');
      runInAction(() => {
        this.devices.clear();
        if (response.data?.success) {
          const devices = response.data.data || [];
          devices.forEach(device => {
            this.devices.set(device.id, device);
            // Fetch initial status for each device
            this.fetchDeviceStatus(device.id);
          });
        }
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to fetch devices';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  public async fetchDeviceStatus(deviceId: string): Promise<void> {
    try {
      const response = await api.get<DeviceStatus>(`/devices/${deviceId}/status`);
      if (response.data?.success) {
        runInAction(() => {
          this.deviceStatuses.set(deviceId, response.data.data);
          const device = this.devices.get(deviceId);
          if (device) {
            this.devices.set(deviceId, {
              ...device,
              status: response.data.data.status,
              lastCheckIn: response.data.data.lastSeen
            });
          }
        });
      }
    } catch (error) {
      console.error(`Failed to fetch status for device ${deviceId}:`, error);
    }
  }

  public async registerDevice(deviceData: Omit<Device, 'id' | 'userId'>): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await api.post<Device>('/devices', deviceData);
      if (response.data?.success) {
        runInAction(() => {
          const newDevice = response.data.data;
          this.devices.set(newDevice.id, newDevice);
          // Fetch initial status for the new device
          this.fetchDeviceStatus(newDevice.id);
        });
      }
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to register device';
      });
      throw error;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  public async updateDevice(deviceId: string, updates: Partial<Device>): Promise<void> {
    try {
      const response = await api.put<Device>(`/devices/${deviceId}`, updates);
      if (response.data?.success) {
        runInAction(() => {
          const updatedDevice = response.data.data;
          this.devices.set(deviceId, updatedDevice);
        });
      }
    } catch (error) {
      console.error(`Failed to update device ${deviceId}:`, error);
      throw error;
    }
  }

  public async deleteDevice(deviceId: string): Promise<void> {
    try {
      const response = await api.delete(`/devices/${deviceId}`);
      if (response.data?.success) {
        runInAction(() => {
          this.devices.delete(deviceId);
          this.deviceStatuses.delete(deviceId);
        });
      }
    } catch (error) {
      console.error(`Failed to delete device ${deviceId}:`, error);
      throw error;
    }
  }

  // Setters for testing and initialization
  public setDevices(devices: Device[]): void {
    runInAction(() => {
      this.devices.clear();
      devices.forEach(device => {
        this.devices.set(device.id, device);
      });
    });
  }

  // Get WebSocketManager instance for RootStore
  public getWebSocketManager(): WebSocketManager {
    return this.wsManager;
  }

  // Computed properties
  public get allDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  public get onlineDevices(): Device[] {
    return this.allDevices.filter(device => device.status === 'online');
  }

  public get offlineDevices(): Device[] {
    return this.allDevices.filter(device => device.status === 'offline');
  }

  public get busyDevices(): Device[] {
    return this.allDevices.filter(device => device.status === 'busy');
  }

  public get attackingDevices(): Device[] {
    return this.allDevices.filter(device => device.status === 'attacking');
  }

  public get errorDevices(): Device[] {
    return this.allDevices.filter(device => device.status === 'error');
  }

  public getDevice(id: string): Device | undefined {
    return this.devices.get(id);
  }

  public getDeviceStatus(id: string): DeviceStatus | undefined {
    return this.deviceStatuses.get(id);
  }

  public get loading(): boolean {
    return this.isLoading;
  }

  public get errorMessage(): string | null {
    return this.error;
  }

  handleDeviceStatusUpdate(data: { id: string; status: DeviceStatus['status'] }): void {
    const device = this.devices.get(data.id);
    if (device) {
      this.devices.set(data.id, {
        ...device,
        status: data.status
      });
    }
  }
} 