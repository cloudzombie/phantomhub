declare module '../contexts/AuthContext' {
  export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt?: string;
    updatedAt?: string;
  }

  export interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: () => boolean;
    checkAuthStatus: () => Promise<void>;
  }

  export const useAuth: () => AuthContextType;
}
