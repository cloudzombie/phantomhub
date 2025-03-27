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