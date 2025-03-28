interface Window {
  confirmSensitiveAction: (action: string) => boolean;
}

// Type declarations for modules
declare module '../config' {
  export const API_URL: string;
  export const APP_NAME: string;
  export const APP_VERSION: string;
  export const DEFAULT_PAGINATION_LIMIT: number;
}

declare module '../contexts/AuthContext' {
  export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
  }

  export interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: () => boolean;
    checkAuthStatus: () => Promise<void>;
  }

  export const useAuth: () => AuthContextType;
}

// Common API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Common error types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

// Device types
export interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
  connectionType: string;
  lastSeen: string;
  capabilities: string[];
  firmwareVersion: string;
  metadata: Record<string, unknown>;
}

// Payload types
export interface Payload {
  id: string;
  name: string;
  description: string;
  content: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

// Script types
export interface Script {
  id: string;
  name: string;
  description: string;
  content: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}