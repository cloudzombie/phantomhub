export const API_ENDPOINT = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';
export const SOCKET_ENDPOINT = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com';

export const DEFAULT_SERIAL_OPTIONS = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none' as const,
  flowControl: 'none' as const
};

export const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  endpoint: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  socketEndpoint: process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001',
  pollingInterval: 30000, // 30 seconds
  timeout: 30000, // 30 seconds
  maxReconnectAttempts: 3,
  reconnectDelay: 5000 // 5 seconds
}; 