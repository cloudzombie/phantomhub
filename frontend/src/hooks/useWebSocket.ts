import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { addMessage } from '../store/slices/uiSlice';
import { useApiError } from './useApiError';
import { WebSocketMessage, ApiError } from '../types/common';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  onOpen?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = (options: UseWebSocketOptions) => {
  const {
    url,
    onMessage,
    onError,
    onClose,
    onOpen,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const dispatch = useDispatch();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const handleApiError = useApiError({ showMessage: true });

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        onOpen?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          handleApiError({
            message: 'Failed to parse WebSocket message',
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          } as ApiError);
        }
      };

      ws.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setIsConnected(false);
        const error = new Error('WebSocket connection error');
        onError?.(error);
        handleApiError({
          message: 'WebSocket connection error',
          data: { error: error.message }
        } as ApiError);
      };

      ws.current.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        onClose?.();

        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectTimeout.current = window.setTimeout(() => {
            reconnectAttempts.current += 1;
            connect();
          }, reconnectInterval);
        } else {
          dispatch(
            addMessage({
              type: 'error',
              text: 'Failed to establish WebSocket connection after multiple attempts.',
            })
          );
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      handleApiError({
        message: 'Failed to create WebSocket connection',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      } as ApiError);
    }
  }, [url, onMessage, onError, onClose, onOpen, reconnectInterval, maxReconnectAttempts, dispatch, handleApiError]);

  const send = useCallback(
    (message: WebSocketMessage) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(message));
      } else {
        console.error('WebSocket is not connected');
        dispatch(
          addMessage({
            type: 'error',
            text: 'WebSocket is not connected. Please try again.',
          })
        );
      }
    },
    [dispatch]
  );

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    if (reconnectTimeout.current !== null) {
      window.clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    send,
    disconnect,
  };
}; 