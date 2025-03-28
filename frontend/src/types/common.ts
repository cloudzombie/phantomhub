// Common types for API responses and errors
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

// Common types for device data
export interface DeviceMetadata {
  [key: string]: string | number | boolean | null;
}

export interface DeviceCapability {
  name: string;
  version: string;
  enabled: boolean;
  parameters?: Record<string, unknown>;
}

// Common types for WebSocket messages
export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

// Common types for UI state
export interface UiState {
  loading: boolean;
  error: string | null;
  success: string | null;
  data: unknown;
}

// Common types for form data
export interface FormData {
  [key: string]: string | number | boolean | null;
}

// Common types for API configuration
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

// Common types for notification data
export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  read: boolean;
  metadata?: Record<string, unknown>;
}

// Common types for theme configuration
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: string;
  spacing: string;
}

// Common types for user preferences
export interface UserPreferences {
  theme: ThemeConfig;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
} 