/**
 * WebSerial utility for direct communication with o.MG Cable devices
 * This module provides functions to connect, communicate with, and manage o.MG devices
 * via the Web Serial API
 */

// Web Serial API type definitions
interface SerialPort {
  open: (options: SerialOptions) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

interface SerialPortRequestOptions {
  filters?: Array<{
    usbVendorId?: number;
    usbProductId?: number;
  }>;
}

// Extend Navigator interface to include serial property
declare global {
  interface Navigator {
    serial: {
      requestPort: (options?: SerialPortRequestOptions) => Promise<SerialPort>;
      getPorts: () => Promise<SerialPort[]>;
      addEventListener?: (type: string, listener: EventListener) => void;
      removeEventListener?: (type: string, listener: EventListener) => void;
    };
  }
}

type SerialConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SerialOptions {
  baudRate: number;
  // Additional serial port options as needed
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

export interface OMGDeviceInfo {
  port: SerialPort;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
  writer: WritableStreamDefaultWriter<Uint8Array> | null;
  connectionStatus: SerialConnectionStatus;
  info: {
    name: string;
    firmwareVersion: string | null;
    deviceId: string | null;
  };
}

// Default Serial options for o.MG Cable
const DEFAULT_SERIAL_OPTIONS: SerialOptions = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none',
};

// Store connected devices
const connectedDevices: Map<string, OMGDeviceInfo> = new Map();

/**
 * Check if Web Serial API is supported in the current browser
 */
export const isWebSerialSupported = (): boolean => {
  return 'serial' in navigator;
};

/**
 * Request access to a serial port
 * @returns The selected serial port or null if the user cancels
 */
export const requestSerialPort = async (): Promise<SerialPort | null> => {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial API is not supported in this browser');
  }

  try {
    // Request port with o.MG cable filters if available
    // Note: Serial port filters may not work for all o.MG cables depending on their USB identifiers
    const port = await navigator.serial.requestPort({
      // Optional filters for o.MG devices - adjust based on actual device VID/PID
      // filters: [{ usbVendorId: 0x1234, usbProductId: 0x5678 }]
    });
    
    return port;
  } catch (error) {
    console.error('Error requesting serial port:', error);
    return null;
  }
};

/**
 * Connect to an o.MG Cable device via Serial port
 * @param port The SerialPort to connect to
 * @param options Serial port options
 * @returns Device info object if connection is successful
 */
export const connectToDevice = async (
  port: SerialPort,
  options: SerialOptions = DEFAULT_SERIAL_OPTIONS
): Promise<OMGDeviceInfo> => {
  try {
    // Open the port with the specified options
    await port.open(options);
    
    // Create a device info object
    const deviceInfo: OMGDeviceInfo = {
      port,
      reader: null,
      writer: null,
      connectionStatus: 'connected',
      info: {
        name: 'O.MG Cable',  // Default name until we get actual info
        firmwareVersion: null,
        deviceId: null,
      },
    };
    
    // Setup reader and writer
    deviceInfo.reader = port.readable?.getReader() || null;
    deviceInfo.writer = port.writable?.getWriter() || null;
    
    // Try to get device information
    const deviceId = await getDeviceIdentifier(deviceInfo);
    if (deviceId) {
      deviceInfo.info.deviceId = deviceId;
      // Store the connected device
      connectedDevices.set(deviceId, deviceInfo);
    }
    
    return deviceInfo;
  } catch (error) {
    console.error('Error connecting to o.MG Cable device:', error);
    throw error;
  }
};

/**
 * Disconnect from an o.MG Cable device
 * @param deviceInfo The device to disconnect from
 */
export const disconnectFromDevice = async (deviceInfo: OMGDeviceInfo): Promise<void> => {
  try {
    // Release reader if it exists
    if (deviceInfo.reader) {
      await deviceInfo.reader.cancel();
      deviceInfo.reader.releaseLock();
      deviceInfo.reader = null;
    }
    
    // Release writer if it exists
    if (deviceInfo.writer) {
      await deviceInfo.writer.close();
      deviceInfo.writer.releaseLock();
      deviceInfo.writer = null;
    }
    
    // Close the port
    await deviceInfo.port.close();
    
    // Update status
    deviceInfo.connectionStatus = 'disconnected';
    
    // Remove from connected devices
    if (deviceInfo.info.deviceId) {
      connectedDevices.delete(deviceInfo.info.deviceId);
    }
  } catch (error) {
    console.error('Error disconnecting from o.MG Cable device:', error);
    throw error;
  }
};

/**
 * Get the device identifier to uniquely identify this o.MG Cable
 * @param deviceInfo The connected device
 * @returns A unique identifier for the device or null if not available
 */
const getDeviceIdentifier = async (deviceInfo: OMGDeviceInfo): Promise<string | null> => {
  try {
    // Send a command to get the device ID
    const response = await sendCommand(deviceInfo, 'GET_DEVICE_INFO');
    
    // Parse the response to extract device ID
    // This is a placeholder - actual implementation will depend on the device's protocol
    const deviceId = parseDeviceId(response);
    
    return deviceId;
  } catch (error) {
    console.error('Error getting device identifier:', error);
    return null;
  }
};

/**
 * Send a command to the o.MG Cable device
 * @param deviceInfo The device to send the command to
 * @param command The command to send
 * @returns The response from the device
 */
export const sendCommand = async (deviceInfo: OMGDeviceInfo, command: string): Promise<string> => {
  if (deviceInfo.connectionStatus !== 'connected' || !deviceInfo.writer) {
    throw new Error('Device is not connected');
  }
  
  try {
    // Convert command to binary format
    const encoder = new TextEncoder();
    const data = encoder.encode(command + '\r\n');
    
    // Send the command
    await deviceInfo.writer.write(data);
    
    // Read the response
    const response = await readResponse(deviceInfo);
    return response;
  } catch (error) {
    console.error('Error sending command to device:', error);
    throw error;
  }
};

/**
 * Read the response from the device
 * @param deviceInfo The device to read from
 * @returns The response as a string
 */
const readResponse = async (deviceInfo: OMGDeviceInfo): Promise<string> => {
  if (!deviceInfo.reader) {
    throw new Error('No reader available for device');
  }
  
  const decoder = new TextDecoder();
  let response = '';
  
  try {
    // Read until we get a complete response
    // This is a simplified implementation - actual implementation may need
    // more sophisticated handling based on o.MG Cable protocols
    const { value, done } = await deviceInfo.reader.read();
    
    if (done) {
      throw new Error('Serial port closed while reading');
    }
    
    if (value) {
      response += decoder.decode(value);
    }
    
    return response.trim();
  } catch (error) {
    console.error('Error reading response from device:', error);
    throw error;
  }
};

/**
 * Parse device ID from response
 * @param response The response from the device
 * @returns The device ID or null if not found
 */
const parseDeviceId = (response: string): string | null => {
  // This is a placeholder - actual implementation will depend on the o.MG Cable response format
  // Example: Extract ID from a JSON response or parse a specific format
  try {
    // Just a sample implementation
    const match = response.match(/ID:([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Deploy a payload to the connected o.MG Cable
 * @param deviceInfo The connected device
 * @param payload The DuckyScript payload to deploy
 * @returns Success status and any response data
 */
export const deployPayload = async (
  deviceInfo: OMGDeviceInfo,
  payload: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // First, check if we're connected
    if (deviceInfo.connectionStatus !== 'connected') {
      throw new Error('Device is not connected');
    }
    
    // Send a command to prepare the device for a payload
    await sendCommand(deviceInfo, 'PAYLOAD_MODE');
    
    // Send the payload in chunks if needed
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    
    if (!deviceInfo.writer) {
      throw new Error('No writer available for device');
    }
    
    // Write the payload data
    await deviceInfo.writer.write(data);
    
    // Send execution command
    const response = await sendCommand(deviceInfo, 'EXECUTE_PAYLOAD');
    
    return {
      success: true,
      message: `Payload deployed successfully: ${response}`,
    };
  } catch (error) {
    console.error('Error deploying payload:', error);
    return {
      success: false,
      message: `Failed to deploy payload: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Get a list of all currently connected devices
 */
export const getConnectedDevices = (): OMGDeviceInfo[] => {
  return Array.from(connectedDevices.values());
};

/**
 * Listen for device connection events
 * Note: This API is not fully supported in all browsers yet
 */
export const setupDeviceConnectionListeners = (callback: (event: any) => void): void => {
  if (isWebSerialSupported() && 'addEventListener' in navigator.serial) {
    // @ts-ignore - This API might not be fully typed yet
    navigator.serial.addEventListener('connect', callback);
    // @ts-ignore
    navigator.serial.addEventListener('disconnect', callback);
  }
};

/**
 * Initialize the WebSerial system
 */
export const initializeWebSerial = (): void => {
  if (isWebSerialSupported()) {
    console.log('Web Serial API is supported');
    setupDeviceConnectionListeners((event) => {
      console.log('Serial device event:', event);
    });
  } else {
    console.warn('Web Serial API is not supported in this browser');
  }
}; 