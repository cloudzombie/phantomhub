import { DeviceInfo } from '../types/device';
import { OMGDeviceInfo } from './webSerialUtils';

export const convertToOMGDeviceInfo = (deviceInfo: DeviceInfo): OMGDeviceInfo => {
  return {
    port: null as any, // These will be set by the webSerial functions
    reader: null,
    writer: null,
    connectionStatus: deviceInfo.connectionStatus || 'disconnected',
    info: {
      name: deviceInfo.name,
      firmwareVersion: deviceInfo.firmwareVersion || null,
      deviceId: deviceInfo.info?.deviceId || null,
      capabilities: deviceInfo.info?.capabilities || {
        usbHid: false,
        wifi: false,
        bluetooth: false,
        storage: null
      }
    }
  };
};

export const convertFromOMGDeviceInfo = (omgInfo: OMGDeviceInfo): DeviceInfo => {
  return {
    name: omgInfo.info.name,
    firmwareVersion: omgInfo.info.firmwareVersion || undefined,
    connectionStatus: omgInfo.connectionStatus,
    info: omgInfo.info
  };
}; 