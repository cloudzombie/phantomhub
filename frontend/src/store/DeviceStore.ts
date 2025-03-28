import { makeAutoObservable, runInAction } from 'mobx';
import { api } from '../services/api';
import { WebSocketManager } from '../core/WebSocketManager';
import axios from 'axios';

export interface Device {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy' | 'error';
  connectionType: 'network' | 'usb';
  ipAddress?: string;
  serialPortId?: string;
  firmwareVersion?: string;
  lastCheckIn?: string;
  userId: string;
  owner?: {
    id: string;
    name: string;
    username: string;
  };
  capabilities?: {
    usbHid: boolean;
    wifi: boolean;
    bluetooth: boolean;
    storage: string;
    supportedFeatures: string[];
  };
  errors?: string[];
}

export interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline' | 'error';
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
    this.wsManager.subscribe('device_status', this.handleDeviceUpdate.bind(this));
  }

  private handleDeviceUpdate(data: DeviceStatus): void {
    runInAction(() => {
      this.deviceStatuses.set(data.deviceId, data);
      const device = this.devices.get(data.deviceId);
      if (device) {
        this.devices.set(data.deviceId, {
          ...device,
          status: data.status,
          lastCheckIn: data.lastSeen
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
          this.devices.set(response.data.data.id, response.data.data);
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
} 