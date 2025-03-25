import apiServiceInstance, { ApiService } from '../services/ApiService';
import { Socket } from 'socket.io-client';

/**
 * Get the Socket.IO instance from the ApiService singleton
 */
export function getSocket(): Socket | null {
  try {
    // Access the static method from the class
    return ApiService.getSocket();
  } catch (error) {
    console.error('Error getting socket:', error);
    return null;
  }
} 