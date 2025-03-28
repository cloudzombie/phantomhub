// API configuration values
export const API_ENDPOINT = import.meta.env.VITE_API_URL || 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';
export const SOCKET_ENDPOINT = import.meta.env.VITE_SOCKET_URL || 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com';

// WebSocket configuration
export const WEBSOCKET_CONFIG = {
  reconnectionAttempts: 5,
  reconnectionDelay: 5000, // 5 seconds
  timeout: 20000 // 20 seconds
};

// Default serial port options for USB devices
export const DEFAULT_SERIAL_OPTIONS = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none' as const,
  flowControl: 'none' as const
};