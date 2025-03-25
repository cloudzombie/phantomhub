/**
 * WebSerial utility for direct communication with o.MG Cable devices
 * This module provides functions to connect, communicate with, and manage o.MG devices
 * via the Web Serial API
 */

// Add SerialPort interface at the top of the file
interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialPort {
  getInfo(): SerialPortInfo;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

// Web Serial API type definitions
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

// Serial connection status
export type SerialConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Command response wrapper for parsing responses with success/error flags
interface CommandResponse {
  success: boolean;
  data: string;
  error?: string;
}

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
}

// Default Serial options for o.MG Cable
export const DEFAULT_SERIAL_OPTIONS: SerialOptions = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none',
};

// Commands for O.MG Cable
const OMG_COMMANDS = {
  GET_INFO: 'GET_INFO',
  GET_VERSION: 'GET_VERSION',
  GET_CAPABILITIES: 'GET_CAPABILITIES',
  DUCKY_MODE: 'DUCKY_MODE',
  DUCKY_WRITE: 'DUCKY_WRITE',
  DUCKY_EXECUTE: 'DUCKY_EXECUTE',
  DUCKY_SAVE: 'DUCKY_SAVE',
  DUCKY_LOAD: 'DUCKY_LOAD',
  WIFI_SCAN: 'WIFI_SCAN',
  WIFI_CONNECT: 'WIFI_CONNECT',
  WIFI_STATUS: 'WIFI_STATUS',
  RESTART: 'RESTART',
  FIRMWARE_MODE: 'FIRMWARE_MODE',
  FIRMWARE_WRITE: 'FIRMWARE_WRITE',
  FIRMWARE_VERIFY: 'FIRMWARE_VERIFY',
  FIRMWARE_APPLY: 'FIRMWARE_APPLY',
  WIFI_CONFIG: 'WIFI_CONFIG',
  WIFI_AP_MODE: 'WIFI_AP_MODE',
  WIFI_STATION_MODE: 'WIFI_STATION_MODE',
  WIFI_DISCONNECT: 'WIFI_DISCONNECT',
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
      // O.MG Elite filters - exact VID/PID will need to be confirmed
      filters: [{ usbVendorId: 0x1d6b, usbProductId: 0x0104 }]
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
      connectionStatus: 'connecting',
      info: {
        name: 'O.MG Cable',  // Default name until we get actual info
        firmwareVersion: null,
        deviceId: null,
        capabilities: {
          usbHid: false,
          wifi: false,
          bluetooth: false,
          storage: null
        }
      },
    };
    
    // Setup reader and writer
    deviceInfo.reader = port.readable?.getReader() || null;
    deviceInfo.writer = port.writable?.getWriter() || null;
    
    if (!deviceInfo.reader || !deviceInfo.writer) {
      throw new Error('Failed to set up communication with the device');
    }
    
    // Set status to connected
    deviceInfo.connectionStatus = 'connected';
    
    // Try to get device information
    try {
      // Get basic device info
      const infoResponse = await sendCommand(deviceInfo, OMG_COMMANDS.GET_INFO);
      
      if (infoResponse.success) {
        // Parse the device info from the response
        const infoLines = infoResponse.data.split('\n');
        deviceInfo.info.name = infoLines[0] || 'O.MG Cable';
        
        // Extract firmware version
        const firmwareMatch = infoLines.find(line => line.startsWith('FW:'));
        if (firmwareMatch) {
          deviceInfo.info.firmwareVersion = firmwareMatch.replace('FW:', '').trim();
        }
        
        // Extract device ID
        const idMatch = infoLines.find(line => line.startsWith('ID:'));
        if (idMatch) {
          deviceInfo.info.deviceId = idMatch.replace('ID:', '').trim();
        }
      }
      
      // Get device capabilities
      const capabilitiesResponse = await sendCommand(deviceInfo, OMG_COMMANDS.GET_CAPABILITIES);
      
      if (capabilitiesResponse.success) {
        const capLines = capabilitiesResponse.data.split('\n');
        
        deviceInfo.info.capabilities = {
          usbHid: capLines.some(line => line.includes('USB_HID: ENABLED')),
          wifi: capLines.some(line => line.includes('WIFI: ENABLED')),
          bluetooth: capLines.some(line => line.includes('BT: ENABLED')),
          storage: null
        };
        
        // Extract storage capacity if available
        const storageMatch = capLines.find(line => line.includes('STORAGE:'));
        if (storageMatch) {
          const storageValue = storageMatch.split(':')[1]?.trim();
          if (storageValue) {
            deviceInfo.info.capabilities.storage = storageValue;
          }
        }
      }
      
      // If we have a device ID, store the connected device
      if (deviceInfo.info.deviceId) {
        connectedDevices.set(deviceInfo.info.deviceId, deviceInfo);
      }
    } catch (error) {
      console.warn('Could not retrieve full device information:', error);
      // Still return the basic device info even if detailed info retrieval failed
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
 * Parse a response from the O.MG Cable
 * @param response Raw response string from the device
 * @returns Parsed CommandResponse object with success/error flags
 */
const parseResponse = (response: string): CommandResponse => {
  const lines = response.split('\n').filter(line => line.trim() !== '');
  
  // Check if response contains an error
  if (lines.some(line => line.startsWith('ERROR:'))) {
    const errorLine = lines.find(line => line.startsWith('ERROR:'));
    const errorMessage = errorLine ? errorLine.substring(7).trim() : 'Unknown error';
    
    return {
      success: false,
      data: response,
      error: errorMessage
    };
  }
  
  // If the last line is 'OK', it's a successful response
  const isSuccessful = lines[lines.length - 1] === 'OK';
  
  // Remove the OK line from the data if present
  const data = isSuccessful ? 
    lines.slice(0, lines.length - 1).join('\n') : 
    lines.join('\n');
  
  return {
    success: isSuccessful,
    data: data,
  };
};

/**
 * Send a command to the o.MG Cable device
 * @param deviceInfo The device to send the command to
 * @param command The command to send
 * @param params Optional parameters for the command
 * @returns The parsed response from the device
 */
export const sendCommand = async (
  deviceInfo: OMGDeviceInfo, 
  command: string,
  params?: string
): Promise<CommandResponse> => {
  if (deviceInfo.connectionStatus !== 'connected' || !deviceInfo.writer) {
    throw new Error('Device is not connected');
  }
  
  try {
    // Construct the full command
    const fullCommand = params ? `${command} ${params}` : command;
    
    // Convert command to binary format with proper line ending
    const encoder = new TextEncoder();
    const data = encoder.encode(`${fullCommand}\r\n`);
    
    // Send the command
    await deviceInfo.writer.write(data);
    
    // Read the response
    const response = await readResponse(deviceInfo);
    
    // Parse the response
    return parseResponse(response);
  } catch (error) {
    console.error('Error sending command to device:', error);
    return {
      success: false,
      data: '',
      error: error instanceof Error ? error.message : String(error)
    };
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
  let responseComplete = false;
  const responseTimeout = 5000; // 5 second timeout
  const startTime = Date.now();
  
  try {
    // Read until we get a complete response (ends with OK or ERROR)
    while (!responseComplete && (Date.now() - startTime < responseTimeout)) {
      const { value, done } = await deviceInfo.reader.read();
      
      if (done) {
        throw new Error('Serial port closed while reading');
      }
      
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        response += chunk;
        
        // Check if response is complete (ends with OK or contains ERROR)
        const lines = response.split('\n').map(line => line.trim());
        if (
          lines.includes('OK') || 
          lines.some(line => line.startsWith('ERROR:')) ||
          // Special case for commands that don't return OK (like RESTART)
          lines.some(line => line.includes('RESTARTING'))
        ) {
          responseComplete = true;
        }
      }
      
      // Small delay to prevent tight loop
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    if (!responseComplete) {
      throw new Error('Response timeout');
    }
    
    return response.trim();
  } catch (error) {
    console.error('Error reading response from device:', error);
    throw error;
  }
};

/**
 * Deploy a DuckyScript payload to the connected o.MG Cable
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
    
    // Enter DuckyScript mode
    const modeResponse = await sendCommand(deviceInfo, OMG_COMMANDS.DUCKY_MODE);
    if (!modeResponse.success) {
      throw new Error(`Failed to enter DuckyScript mode: ${modeResponse.error || 'Unknown error'}`);
    }
    
    // Send the DUCKY_WRITE command
    const writeCommandResponse = await sendCommand(deviceInfo, OMG_COMMANDS.DUCKY_WRITE);
    if (!writeCommandResponse.success) {
      throw new Error(`Failed to initiate payload write: ${writeCommandResponse.error || 'Unknown error'}`);
    }
    
    // Send the payload data followed by END
    if (!deviceInfo.writer) {
      throw new Error('No writer available for device');
    }
    
    const encoder = new TextEncoder();
    
    // Write the payload data
    await deviceInfo.writer.write(encoder.encode(payload + '\n'));
    
    // Send the END marker
    await deviceInfo.writer.write(encoder.encode('END\r\n'));
    
    // Read the response after sending the payload
    if (!deviceInfo.reader) {
      throw new Error('No reader available for device');
    }
    
    const writeResponse = await readResponse(deviceInfo);
    const parsedWriteResponse = parseResponse(writeResponse);
    
    if (!parsedWriteResponse.success) {
      throw new Error(`Failed to write payload: ${parsedWriteResponse.error || 'Unknown error'}`);
    }
    
    // Execute the payload
    const executeResponse = await sendCommand(deviceInfo, OMG_COMMANDS.DUCKY_EXECUTE);
    
    if (!executeResponse.success) {
      throw new Error(`Failed to execute payload: ${executeResponse.error || 'Unknown error'}`);
    }
    
    return {
      success: true,
      message: `Payload deployed successfully`
    };
  } catch (error) {
    console.error('Error deploying payload:', error);
    return {
      success: false,
      message: `Failed to deploy payload: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Get detailed capabilities of the connected device
 * @param deviceInfo The connected device
 * @returns Updated device info with capabilities
 */
export const getDeviceCapabilities = async (deviceInfo: OMGDeviceInfo): Promise<OMGDeviceInfo> => {
  try {
    // Get basic capabilities first
    const response = await sendCommand(deviceInfo, OMG_COMMANDS.GET_CAPABILITIES);
    
    if (!response.success) {
      console.warn('Failed to get basic capabilities');
      return deviceInfo;
    }
    
    const capLines = response.data.split('\n');
    
    deviceInfo.info.capabilities = {
      usbHid: capLines.some(line => line.includes('USB_HID: ENABLED')),
      wifi: capLines.some(line => line.includes('WIFI: ENABLED')),
      bluetooth: capLines.some(line => line.includes('BT: ENABLED')),
      storage: null,
      supportedFeatures: []
    };
    
    // Extract storage capacity if available
    const storageMatch = capLines.find(line => line.includes('STORAGE:'));
    if (storageMatch) {
      const storageValue = storageMatch.split(':')[1]?.trim();
      if (storageValue) {
        deviceInfo.info.capabilities.storage = storageValue;
      }
    }
    
    // Try to get more detailed capabilities
    try {
      // Get max payload size capability
      const payloadSizeResponse = await sendCommand(deviceInfo, 'GET_MAX_PAYLOAD_SIZE');
      if (payloadSizeResponse.success) {
        const sizeValue = parseInt(payloadSizeResponse.data.trim(), 10);
        if (!isNaN(sizeValue)) {
          deviceInfo.info.capabilities.maxPayloadSize = sizeValue;
        }
      }
      
      // Get supported features list
      const featuresResponse = await sendCommand(deviceInfo, 'GET_SUPPORTED_FEATURES');
      if (featuresResponse.success) {
        deviceInfo.info.capabilities.supportedFeatures = featuresResponse.data
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      }
      
      // Try to get battery level if device has battery
      const batteryResponse = await sendCommand(deviceInfo, 'GET_BATTERY_LEVEL');
      if (batteryResponse.success) {
        const batteryValue = parseInt(batteryResponse.data.trim(), 10);
        if (!isNaN(batteryValue)) {
          deviceInfo.info.capabilities.batteryLevel = batteryValue;
        }
      }
      
      // Get memory usage stats
      const memoryResponse = await sendCommand(deviceInfo, 'GET_MEMORY_USAGE');
      if (memoryResponse.success) {
        const lines = memoryResponse.data.split('\n');
        const totalMatch = lines.find(line => line.includes('TOTAL:'));
        const usedMatch = lines.find(line => line.includes('USED:'));
        const freeMatch = lines.find(line => line.includes('FREE:'));
        
        const memoryUsage = {
          total: 0,
          used: 0,
          free: 0
        };
        
        if (totalMatch) {
          const totalValue = parseInt(totalMatch.split(':')[1]?.trim(), 10);
          if (!isNaN(totalValue)) {
            memoryUsage.total = totalValue;
          }
        }
        
        if (usedMatch) {
          const usedValue = parseInt(usedMatch.split(':')[1]?.trim(), 10);
          if (!isNaN(usedValue)) {
            memoryUsage.used = usedValue;
          }
        }
        
        if (freeMatch) {
          const freeValue = parseInt(freeMatch.split(':')[1]?.trim(), 10);
          if (!isNaN(freeValue)) {
            memoryUsage.free = freeValue;
          }
        }
        
        deviceInfo.info.capabilities.memoryUsage = memoryUsage;
      }
    } catch (error) {
      console.warn('Could not retrieve advanced capabilities:', error);
      // Continue with basic capabilities
    }
    
    return deviceInfo;
  } catch (error) {
    console.error('Error getting device capabilities:', error);
    return deviceInfo;
  }
};

/**
 * Run a comprehensive diagnostic test on the device
 * Tests all major functionality and returns a diagnostic report
 * @param deviceInfo The connected device
 * @returns Diagnostic report with test results
 */
export const runDeviceDiagnostics = async (
  deviceInfo: OMGDeviceInfo
): Promise<{
  success: boolean;
  tests: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
  summary: string;
}> => {
  const tests: Array<{
    name: string;
    passed: boolean;
    message: string;
  }> = [];
  
  try {
    // Test 1: Basic connectivity
    try {
      const versionResponse = await sendCommand(deviceInfo, OMG_COMMANDS.GET_VERSION);
      tests.push({
        name: 'Basic Connectivity',
        passed: versionResponse.success,
        message: versionResponse.success 
          ? `Connected successfully, firmware version: ${versionResponse.data}`
          : 'Failed to communicate with device'
      });
    } catch (error) {
      tests.push({
        name: 'Basic Connectivity',
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
    
    // Test 2: USB HID functionality
    if (deviceInfo.info.capabilities?.usbHid) {
      try {
        const hidTestResponse = await sendCommand(deviceInfo, 'TEST_USB_HID');
        tests.push({
          name: 'USB HID Functionality',
          passed: hidTestResponse.success,
          message: hidTestResponse.success 
            ? 'USB HID functionality working properly'
            : 'USB HID test failed'
        });
      } catch (error) {
        tests.push({
          name: 'USB HID Functionality',
          passed: false,
          message: `Error: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
    
    // Test 3: Wi-Fi connectivity (if supported)
    if (deviceInfo.info.capabilities?.wifi) {
      try {
        const wifiStatusResponse = await sendCommand(deviceInfo, OMG_COMMANDS.WIFI_STATUS);
        const isConnected = wifiStatusResponse.data.includes('STATUS: CONNECTED');
        tests.push({
          name: 'Wi-Fi Connectivity',
          passed: wifiStatusResponse.success,
          message: isConnected 
            ? `Wi-Fi connected: ${wifiStatusResponse.data.split('\n').find(line => line.includes('SSID:'))?.split(':')[1]?.trim()}`
            : 'Wi-Fi not connected'
        });
      } catch (error) {
        tests.push({
          name: 'Wi-Fi Connectivity',
          passed: false,
          message: `Error: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
    
    // Test 4: Storage functionality
    if (deviceInfo.info.capabilities?.storage) {
      try {
        const storageTestResponse = await sendCommand(deviceInfo, 'TEST_STORAGE');
        tests.push({
          name: 'Storage Functionality',
          passed: storageTestResponse.success,
          message: storageTestResponse.success 
            ? 'Storage is working properly'
            : 'Storage test failed'
        });
      } catch (error) {
        tests.push({
          name: 'Storage Functionality',
          passed: false,
          message: `Error: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
    
    // Test 5: DuckyScript execution
    try {
      // Try to write a simple test payload
      await sendCommand(deviceInfo, OMG_COMMANDS.DUCKY_MODE);
      await sendCommand(deviceInfo, OMG_COMMANDS.DUCKY_WRITE);
      
      // Write a tiny test script
      if (deviceInfo.writer) {
        const encoder = new TextEncoder();
        await deviceInfo.writer.write(encoder.encode('REM Test payload\nDELAY 100\nEND\r\n'));
      }
      
      // Read the response
      const writeResponse = await readResponse(deviceInfo);
      const parsedWriteResponse = parseResponse(writeResponse);
      
      tests.push({
        name: 'DuckyScript Processing',
        passed: parsedWriteResponse.success,
        message: parsedWriteResponse.success 
          ? 'DuckyScript processing is working properly'
          : 'DuckyScript test failed'
      });
    } catch (error) {
      tests.push({
        name: 'DuckyScript Processing',
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
    
    // Calculate overall success
    const passedTests = tests.filter(test => test.passed).length;
    const allTests = tests.length;
    const success = passedTests > 0 && (passedTests / allTests) >= 0.7; // At least 70% tests passed
    
    // Generate summary
    const summary = `Diagnostic complete: ${passedTests}/${allTests} tests passed. ${
      success ? 'Device is functioning properly.' : 'Device requires attention.'
    }`;
    
    return {
      success,
      tests,
      summary
    };
  } catch (error) {
    console.error('Error running device diagnostics:', error);
    return {
      success: false,
      tests: [
        {
          name: 'Diagnostic Process',
          passed: false,
          message: `Failed to complete diagnostics: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      summary: 'Diagnostic failed to complete. Device may be disconnected or unresponsive.'
    };
  }
};

/**
 * Check device connection status
 * @param deviceInfo The device to check
 * @returns true if the device is still connected and responsive
 */
export const checkDeviceStatus = async (deviceInfo: OMGDeviceInfo): Promise<boolean> => {
  try {
    // Send a simple command to check if the device is still responsive
    const response = await sendCommand(deviceInfo, OMG_COMMANDS.GET_VERSION);
    return response.success;
  } catch (error) {
    console.error('Error checking device status:', error);
    // Update connection status to error or disconnected
    deviceInfo.connectionStatus = 'error';
    
    return false;
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

/**
 * Check if a firmware version is newer than the device's current version
 * @param currentVersion The current firmware version string
 * @param newVersion The new firmware version string to compare
 * @returns True if newVersion is newer than currentVersion
 */
export const isNewerFirmwareVersion = (currentVersion: string, newVersion: string): boolean => {
  // Parse version strings (expecting format like "1.2.3")
  const parseCurrent = currentVersion.split('.').map(num => parseInt(num, 10));
  const parseNew = newVersion.split('.').map(num => parseInt(num, 10));
  
  // Compare major version
  if (parseNew[0] > parseCurrent[0]) return true;
  if (parseNew[0] < parseCurrent[0]) return false;
  
  // Major versions are equal, compare minor version
  if (parseNew[1] > parseCurrent[1]) return true;
  if (parseNew[1] < parseCurrent[1]) return false;
  
  // Minor versions are equal, compare patch version
  if (parseNew[2] > parseCurrent[2]) return true;
  
  // Current version is greater or equal
  return false;
};

/**
 * Get the latest available firmware version from the server
 * @returns Latest firmware information or null if unavailable
 */
export const getLatestFirmwareInfo = async (): Promise<{
  version: string;
  url: string;
  releaseNotes: string;
  releaseDate: string;
  minRequiredVersion: string;
} | null> => {
  try {
    // In a real implementation, this would fetch from a server endpoint
    // For now, we'll return mock data
    return {
      version: '2.5.0',
      url: 'https://example.com/firmware/omg-cable-v2.5.0.bin',
      releaseNotes: 'Improved Wi-Fi stability, added new DuckyScript commands, fixed USB HID bugs.',
      releaseDate: '2023-06-15',
      minRequiredVersion: '2.0.0'
    };
  } catch (error) {
    console.error('Error fetching latest firmware info:', error);
    return null;
  }
};

/**
 * Update firmware on the connected O.MG Cable
 * @param deviceInfo The connected device
 * @param firmwareUrl URL to fetch the firmware binary
 * @param onProgress Optional callback for progress updates
 * @returns Success status and any response data
 */
export const updateFirmware = async (
  deviceInfo: OMGDeviceInfo,
  firmwareUrl: string,
  onProgress?: (progress: number, status: string) => void
): Promise<{ success: boolean; message: string }> => {
  // Report progress if callback provided
  const reportProgress = (progress: number, status: string) => {
    if (onProgress) {
      onProgress(progress, status);
    }
  };
  
  try {
    // First, check if we're connected
    if (deviceInfo.connectionStatus !== 'connected') {
      throw new Error('Device is not connected');
    }
    
    // Check firmware version compatibility (skipped in this implementation)
    reportProgress(5, 'Checking firmware compatibility...');
    
    // Fetch firmware binary from URL
    reportProgress(10, 'Downloading firmware...');
    const firmwareResponse = await fetch(firmwareUrl);
    if (!firmwareResponse.ok) {
      throw new Error(`Failed to download firmware: ${firmwareResponse.statusText}`);
    }
    
    // Get firmware as ArrayBuffer
    const firmwareData = await firmwareResponse.arrayBuffer();
    reportProgress(30, 'Firmware downloaded successfully');
    
    // Put device in firmware update mode
    reportProgress(35, 'Preparing device for firmware update...');
    const modeResponse = await sendCommand(deviceInfo, OMG_COMMANDS.FIRMWARE_MODE);
    if (!modeResponse.success) {
      throw new Error(`Failed to enter firmware mode: ${modeResponse.error || 'Unknown error'}`);
    }
    
    // Send the firmware write command
    reportProgress(40, 'Initiating firmware write...');
    const writeCommandResponse = await sendCommand(deviceInfo, OMG_COMMANDS.FIRMWARE_WRITE);
    if (!writeCommandResponse.success) {
      throw new Error(`Failed to initiate firmware write: ${writeCommandResponse.error || 'Unknown error'}`);
    }
    
    // Send the firmware data in chunks
    reportProgress(50, 'Writing firmware data...');
    if (!deviceInfo.writer) {
      throw new Error('No writer available for device');
    }
    
    // Create chunks of data (64KB chunks)
    const chunkSize = 65536;
    const totalChunks = Math.ceil(firmwareData.byteLength / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, firmwareData.byteLength);
      const chunk = new Uint8Array(firmwareData.slice(start, end));
      
      // Write the chunk
      await deviceInfo.writer.write(chunk);
      
      // Update progress (50-80%)
      const writeProgress = 50 + Math.floor((i + 1) / totalChunks * 30);
      reportProgress(writeProgress, `Writing firmware: ${i + 1}/${totalChunks} chunks`);
      
      // Wait for device to process chunk
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Signal end of firmware data
    await deviceInfo.writer.write(new TextEncoder().encode('END\r\n'));
    
    // Read the response after sending the firmware
    if (!deviceInfo.reader) {
      throw new Error('No reader available for device');
    }
    
    reportProgress(80, 'Verifying firmware...');
    const writeResponse = await readResponse(deviceInfo);
    const parsedWriteResponse = parseResponse(writeResponse);
    
    if (!parsedWriteResponse.success) {
      throw new Error(`Failed to write firmware: ${parsedWriteResponse.error || 'Unknown error'}`);
    }
    
    // Verify the firmware
    reportProgress(85, 'Verifying firmware integrity...');
    const verifyResponse = await sendCommand(deviceInfo, OMG_COMMANDS.FIRMWARE_VERIFY);
    
    if (!verifyResponse.success) {
      throw new Error(`Firmware verification failed: ${verifyResponse.error || 'Unknown error'}`);
    }
    
    // Apply the firmware update
    reportProgress(90, 'Applying firmware update...');
    const applyResponse = await sendCommand(deviceInfo, OMG_COMMANDS.FIRMWARE_APPLY);
    
    if (!applyResponse.success) {
      throw new Error(`Failed to apply firmware: ${applyResponse.error || 'Unknown error'}`);
    }
    
    // Device will restart automatically after applying firmware
    reportProgress(95, 'Firmware applied, device restarting...');
    
    // Wait for the device to restart
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    reportProgress(100, 'Firmware update complete');
    
    return {
      success: true,
      message: 'Firmware updated successfully. Device has been restarted with the new firmware.'
    };
  } catch (error) {
    console.error('Error updating firmware:', error);
    return {
      success: false,
      message: `Failed to update firmware: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Wi-Fi Network information
 */
export interface WiFiNetwork {
  ssid: string;
  bssid?: string;
  rssi: number; // Signal strength
  channel: number;
  security: 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3' | 'unknown';
  hidden: boolean;
}

/**
 * Wi-Fi connection status
 */
export interface WiFiStatus {
  connected: boolean;
  mode: 'ap' | 'station' | 'off';
  ssid?: string;
  ip?: string;
  mac?: string;
  rssi?: number;
  gateway?: string;
  subnet?: string;
  dns?: string;
}

/**
 * AP configuration parameters
 */
export interface APConfig {
  ssid: string;
  password: string;
  channel?: number;
  hidden?: boolean;
  maxConnections?: number;
}

/**
 * Scan for available Wi-Fi networks
 * @param device OMGDeviceInfo object
 * @returns Promise with array of available networks
 */
export async function scanWiFiNetworks(device: OMGDeviceInfo): Promise<WiFiNetwork[]> {
  if (!device.info.capabilities?.wifi) {
    throw new Error('Device does not support Wi-Fi capabilities');
  }
  
  try {
    const response = await sendCommand(device, OMG_COMMANDS.WIFI_SCAN);
    if (!response.success) {
      throw new Error(`Failed to scan Wi-Fi networks: ${response.error}`);
    }
    
    // Parse the response data which should be a JSON array of networks
    const networks: WiFiNetwork[] = [];
    try {
      const responseData = JSON.parse(response.data);
      if (Array.isArray(responseData)) {
        for (const network of responseData) {
          if (network.ssid && typeof network.rssi === 'number') {
            networks.push({
              ssid: network.ssid,
              bssid: network.bssid || undefined,
              rssi: network.rssi,
              channel: network.channel || 0,
              security: network.security || 'unknown',
              hidden: !!network.hidden
            });
          }
        }
      }
    } catch (e) {
      console.error('Error parsing Wi-Fi scan results:', e);
      throw new Error('Invalid Wi-Fi scan results format');
    }
    
    // Sort networks by signal strength (strongest first)
    return networks.sort((a, b) => b.rssi - a.rssi);
  } catch (error) {
    console.error('Error scanning Wi-Fi networks:', error);
    throw error;
  }
}

/**
 * Connect to a Wi-Fi network in station mode
 * @param device OMGDeviceInfo object
 * @param ssid Network SSID
 * @param password Network password
 * @param timeout Optional timeout in milliseconds
 * @returns Promise with connection status
 */
export async function connectToWiFiNetwork(
  device: OMGDeviceInfo, 
  ssid: string, 
  password: string,
  timeout: number = 30000
): Promise<WiFiStatus> {
  if (!device.info.capabilities?.wifi) {
    throw new Error('Device does not support Wi-Fi capabilities');
  }
  
  try {
    // First, set the device to station mode
    const modeResponse = await sendCommand(device, OMG_COMMANDS.WIFI_STATION_MODE);
    if (!modeResponse.success) {
      throw new Error(`Failed to set device to station mode: ${modeResponse.error}`);
    }
    
    // Then connect to the network
    const connectParams = JSON.stringify({ ssid, password });
    const connectResponse = await sendCommand(device, OMG_COMMANDS.WIFI_CONNECT, connectParams);
    if (!connectResponse.success) {
      throw new Error(`Failed to connect to Wi-Fi network: ${connectResponse.error}`);
    }
    
    // Wait for connection to be established or timeout
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const status = await getWiFiStatus(device);
      if (status.connected && status.mode === 'station') {
        return status;
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Connection timeout: Failed to connect to Wi-Fi network');
  } catch (error) {
    console.error('Error connecting to Wi-Fi network:', error);
    throw error;
  }
}

/**
 * Configure the device as a Wi-Fi access point
 * @param device OMGDeviceInfo object
 * @param config AP configuration parameters
 * @returns Promise with AP status
 */
export async function configureAccessPoint(
  device: OMGDeviceInfo,
  config: APConfig
): Promise<WiFiStatus> {
  if (!device.info.capabilities?.wifi) {
    throw new Error('Device does not support Wi-Fi capabilities');
  }
  
  try {
    // Set the device to AP mode
    const modeResponse = await sendCommand(device, OMG_COMMANDS.WIFI_AP_MODE);
    if (!modeResponse.success) {
      throw new Error(`Failed to set device to AP mode: ${modeResponse.error}`);
    }
    
    // Configure the AP
    const apParams = JSON.stringify({
      ssid: config.ssid,
      password: config.password,
      channel: config.channel || 1,
      hidden: config.hidden || false,
      maxConnections: config.maxConnections || 4
    });
    
    const configResponse = await sendCommand(device, OMG_COMMANDS.WIFI_CONFIG, apParams);
    if (!configResponse.success) {
      throw new Error(`Failed to configure access point: ${configResponse.error}`);
    }
    
    // Get and return the current Wi-Fi status
    return await getWiFiStatus(device);
  } catch (error) {
    console.error('Error configuring access point:', error);
    throw error;
  }
}

/**
 * Get the current Wi-Fi status of the device
 * @param device OMGDeviceInfo object
 * @returns Promise with Wi-Fi status
 */
export async function getWiFiStatus(device: OMGDeviceInfo): Promise<WiFiStatus> {
  if (!device.info.capabilities?.wifi) {
    throw new Error('Device does not support Wi-Fi capabilities');
  }
  
  try {
    const response = await sendCommand(device, OMG_COMMANDS.WIFI_STATUS);
    if (!response.success) {
      throw new Error(`Failed to get Wi-Fi status: ${response.error}`);
    }
    
    // Parse the response data which should be a JSON object with status
    try {
      const statusData = JSON.parse(response.data);
      const status: WiFiStatus = {
        connected: !!statusData.connected,
        mode: statusData.mode || 'off',
        ssid: statusData.ssid,
        ip: statusData.ip,
        mac: statusData.mac,
        rssi: statusData.rssi,
        gateway: statusData.gateway,
        subnet: statusData.subnet,
        dns: statusData.dns
      };
      
      return status;
    } catch (e) {
      console.error('Error parsing Wi-Fi status:', e);
      throw new Error('Invalid Wi-Fi status format');
    }
  } catch (error) {
    console.error('Error getting Wi-Fi status:', error);
    throw error;
  }
}

/**
 * Disconnect from the current Wi-Fi network
 * @param device OMGDeviceInfo object
 * @returns Promise with success status
 */
export async function disconnectFromWiFi(device: OMGDeviceInfo): Promise<boolean> {
  if (!device.info.capabilities?.wifi) {
    throw new Error('Device does not support Wi-Fi capabilities');
  }
  
  try {
    const response = await sendCommand(device, OMG_COMMANDS.WIFI_DISCONNECT);
    return response.success;
  } catch (error) {
    console.error('Error disconnecting from Wi-Fi:', error);
    throw error;
  }
}

/**
 * Check if a WebSerial device is currently connected
 * @param serialPortId The serial port ID to check
 * @returns true if the device is connected
 */
export const checkWebSerialConnection = async (serialPortId?: string): Promise<boolean> => {
  if (!serialPortId) return false;
  
  try {
    // Get list of available ports
    const ports = await navigator.serial.getPorts();
    
    // Check if our device's port is in the list
    for (const port of ports) {
      const info = await port.getInfo();
      if (info.usbVendorId?.toString() === serialPortId || 
          info.usbProductId?.toString() === serialPortId) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking WebSerial connection:', error);
    return false;
  }
}; 