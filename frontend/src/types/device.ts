export interface OMGDeviceInfo {
  id?: string;
  name: string;
  type?: string;
  status?: 'online' | 'offline' | 'error';
  connectionType?: 'usb' | 'wifi' | 'ethernet' | 'bluetooth';
  serialPortId?: string;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting';
  ipAddress?: string;
  macAddress?: string;
  firmwareVersion?: string;
  lastSeen?: Date;
  batteryLevel?: number;
  signalStrength?: number;
  uptime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  temperature?: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  metadata?: Record<string, any>;
  info?: {
    name: string;
    firmwareVersion: string | null;
    deviceId: string | null;
    capabilities?: {
      usbHid: boolean;
      wifi: boolean;
      bluetooth: boolean;
      storage: string | null;
      maxPayloadSize?: number;
      supportedFeatures?: string[];
      batteryLevel?: number;
      memoryUsage?: {
        total: number;
        used: number;
        free: number;
      };
    };
  };
  [key: string]: unknown;
} 