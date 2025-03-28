import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getToken, getUserData, clearAuthData } from '../../utils/tokenManager';

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  lastUpdated: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
      state.lastUpdated = Date.now();
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.lastUpdated = Date.now();
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.lastUpdated = Date.now();
    },
    initializeAuth: (state) => {
      const token = getToken();
      const userData = getUserData();
      
      if (token && userData) {
        state.token = token;
        state.user = userData;
        state.isAuthenticated = true;
      } else {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      }
      
      state.isLoading = false;
      state.lastUpdated = Date.now();
    },
    logout: (state) => {
      clearAuthData();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.lastUpdated = Date.now();
    },
  },
});

export const {
  setUser,
  setToken,
  clearUser,
  setLoading,
  setError,
  initializeAuth,
  logout,
} = authSlice.actions;

export default authSlice.reducer; 