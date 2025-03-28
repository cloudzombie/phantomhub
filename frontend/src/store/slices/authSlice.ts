import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { getToken, getUserData, clearAuthData, isAuthenticated } from '../../utils/tokenManager';

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

// Async thunk for initializing auth state
export const initializeAuthAsync = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const token = getToken();
      const userData = getUserData();
      
      if (!token || !userData) {
        return { isAuthenticated: false };
      }
      
      // Verify token is still valid
      const isValid = await isAuthenticated();
      if (!isValid) {
        clearAuthData();
        return { isAuthenticated: false };
      }
      
      return {
        token,
        user: userData,
        isAuthenticated: true
      };
    } catch (error) {
      return rejectWithValue('Failed to initialize authentication');
    }
  }
);

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
    logout: (state) => {
      clearAuthData();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.lastUpdated = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuthAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuthAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = action.payload.isAuthenticated;
        if (action.payload.isAuthenticated) {
          state.token = action.payload.token;
          state.user = action.payload.user;
        }
        state.lastUpdated = Date.now();
      })
      .addCase(initializeAuthAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || null;
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      });
  },
});

export const {
  setUser,
  setToken,
  clearUser,
  setLoading,
  setError,
  logout,
} = authSlice.actions;

export default authSlice.reducer; 