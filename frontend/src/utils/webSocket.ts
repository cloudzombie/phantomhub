import { WebSocketManager } from '../core/WebSocketManager';
import { Socket } from 'socket.io-client';

/**
 * Get the Socket.IO instance from the WebSocketManager singleton
 */
export function getSocket(): Socket | null {
  try {
    const wsManager = WebSocketManager.getInstance();
    return wsManager.getSocket();
  } catch (error) {
    console.error('Error getting socket:', error);
    return null;
  }
}

/**
 * Connect to the WebSocket
 */
export function connectWebSocket(url?: string): void {
  try {
    const wsManager = WebSocketManager.getInstance();
    wsManager.connect(url);
  } catch (error) {
    console.error('Error connecting to WebSocket:', error);
  }
}

/**
 * Disconnect from the WebSocket
 */
export function disconnectWebSocket(): void {
  try {
    const wsManager = WebSocketManager.getInstance();
    wsManager.disconnect();
  } catch (error) {
    console.error('Error disconnecting from WebSocket:', error);
  }
}

/**
 * Subscribe to a WebSocket event
 */
export function subscribeToEvent(eventName: string, callback: (data: any) => void): void {
  try {
    const wsManager = WebSocketManager.getInstance();
    wsManager.subscribe(eventName, callback);
  } catch (error) {
    console.error('Error subscribing to event:', error);
  }
}

/**
 * Unsubscribe from a WebSocket event
 */
export function unsubscribeFromEvent(eventName: string, callback: (data: any) => void): void {
  try {
    const wsManager = WebSocketManager.getInstance();
    wsManager.unsubscribe(eventName, callback);
  } catch (error) {
    console.error('Error unsubscribing from event:', error);
  }
}

/**
 * Emit a WebSocket event
 */
export function emitEvent(eventName: string, data?: any): void {
  try {
    const wsManager = WebSocketManager.getInstance();
    wsManager.emit(eventName, data);
  } catch (error) {
    console.error('Error emitting event:', error);
  }
} 