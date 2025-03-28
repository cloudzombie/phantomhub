import { io, Socket } from 'socket.io-client';
import { getToken } from '../utils/tokenManager';
import { SOCKET_ENDPOINT, WEBSOCKET_CONFIG } from '../config/api';

type EventCallback = (data: any) => void;
type EventData = Record<string, any>;

export class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = WEBSOCKET_CONFIG.reconnectionAttempts;
  private reconnectionDelay: number = WEBSOCKET_CONFIG.reconnectionDelay;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public connect(url: string = SOCKET_ENDPOINT): void {
    if (this.socket?.connected) {
      return;
    }

    this.connectionStatus = 'connecting';
    const token = getToken();

    if (!token) {
      console.warn('No authentication token found for WebSocket connection');
      return;
    }

    this.socket = io(url, {
      auth: { token },
      reconnectionAttempts: this.maxReconnectionAttempts,
      reconnectionDelay: this.reconnectionDelay,
      autoConnect: true,
      transports: ['websocket'],
      timeout: WEBSOCKET_CONFIG.timeout
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connectionStatus = 'connected';
      this.reconnectionAttempts = 0;
      this.notifyListeners('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`WebSocket disconnected: ${reason}`);
      this.connectionStatus = 'disconnected';
      this.notifyListeners('disconnect');
      
      if (reason === 'io server disconnect') {
        // The server has forcefully disconnected the socket
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectionAttempts++;
      this.notifyListeners('connect_error', error);
      
      if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
        console.error('Max reconnection attempts reached, giving up');
        this.disconnect();
      } else {
        setTimeout(() => this.reconnect(), this.reconnectionDelay * this.reconnectionAttempts);
      }
    });

    // Handle device status updates
    this.socket.on('device:*:status', (data: EventData) => {
      const deviceId = data.deviceId;
      this.notifyListeners('device_status_update', { deviceId, status: data });
    });

    // Handle device errors
    this.socket.on('device:*:error', (data: EventData) => {
      const deviceId = data.deviceId;
      this.notifyListeners('device_error', { deviceId, error: data });
    });

    // Handle device activity
    this.socket.on('device:*:activity', (data: EventData) => {
      const deviceId = data.deviceId;
      this.notifyListeners('device_activity', { deviceId, activity: data });
    });

    // Add custom event handlers here
    this.socket.onAny((eventName, ...args) => {
      this.notifyListeners(eventName, args[0]);
    });
  }

  public subscribe(eventName: string, callback: EventCallback): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)?.add(callback);

    // If this is a device subscription event, notify the backend
    if (eventName.startsWith('device:') && eventName.endsWith(':status')) {
      const deviceId = eventName.split(':')[1];
      this.socket?.emit('subscribe:device', deviceId);
    }
  }

  public unsubscribe(eventName: string, callback: EventCallback): void {
    this.listeners.get(eventName)?.delete(callback);
  }

  private notifyListeners(eventName: string, data: any): void {
    this.listeners.get(eventName)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }

  public emit(eventName: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(eventName, data);
    } else {
      console.warn(`Cannot emit event "${eventName}": Socket is not connected`);
    }
  }

  public reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus = 'disconnected';
    }
  }

  public getConnectionStatus(): string {
    return this.connectionStatus;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public clearAllListeners(): void {
    this.listeners.clear();
    if (this.socket) {
      this.socket.offAny();
    }
  }
} 