import { useEffect, useCallback, useState } from 'react';
import { WebSocketManager } from '../core/WebSocketManager';
import { SOCKET_ENDPOINT } from '../config/api';

type WebSocketStatus = 'disconnected' | 'connecting' | 'connected';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  url?: string;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, url = SOCKET_ENDPOINT } = options;
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [wsManager] = useState(() => WebSocketManager.getInstance());
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    wsManager.connect(url);
  }, [wsManager, url]);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, [wsManager]);
  
  // Subscribe to an event
  const subscribe = useCallback(<T = any>(
    eventName: string, 
    callback: (data: T) => void
  ) => {
    wsManager.subscribe(eventName, callback);
    
    // Return unsubscribe function
    return () => {
      wsManager.unsubscribe(eventName, callback);
    };
  }, [wsManager]);
  
  // Emit an event
  const emit = useCallback((
    eventName: string,
    data?: any
  ) => {
    wsManager.emit(eventName, data);
  }, [wsManager]);
  
  // Update status when connection state changes
  useEffect(() => {
    const handleConnect = () => setStatus('connected');
    const handleDisconnect = () => setStatus('disconnected');
    const handleConnecting = () => setStatus('connecting');
    
    // Get current status
    setStatus(wsManager.getConnectionStatus() as WebSocketStatus);
    
    // Subscribe to connection events
    wsManager.subscribe('connect', handleConnect);
    wsManager.subscribe('disconnect', handleDisconnect);
    wsManager.subscribe('connecting', handleConnecting);
    
    // Auto-connect if enabled
    if (autoConnect) {
      connect();
    }
    
    // Cleanup
    return () => {
      wsManager.unsubscribe('connect', handleConnect);
      wsManager.unsubscribe('disconnect', handleDisconnect);
      wsManager.unsubscribe('connecting', handleConnecting);
    };
  }, [wsManager, autoConnect, connect]);
  
  return {
    status,
    connect,
    disconnect,
    subscribe,
    emit,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected'
  };
} 