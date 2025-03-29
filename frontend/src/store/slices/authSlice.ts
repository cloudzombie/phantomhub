import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { getUserData, clearAuthData, isAuthenticated } from '../../utils/tokenManager';

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: AuthState = {
  user: null,
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
      console.log('Auth: Starting initialization...');
      const userData = getUserData();
      console.log('Auth: Retrieved user data:', userData);
      
      if (!userData) {
        console.log('Auth: No user data found');
        return { isAuthenticated: false };
      }
      
      // Verify authentication with HTTP-only cookie
      console.log('Auth: Verifying authentication...');
      const isValid = await isAuthenticated();
      console.log('Auth: Authentication verification result:', isValid);
      
      if (!isValid) {
        console.log('Auth: Authentication invalid, clearing data');
        clearAuthData();
        return { isAuthenticated: false };
      }
      
      console.log('Auth: Authentication successful');
      return {
        user: userData,
        isAuthenticated: true
      };
    } catch (error) {
      console.error('Auth: Initialization error:', error);
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
    clearUser: (state) => {
      state.user = null;
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
          state.user = action.payload.user;
        }
        state.lastUpdated = Date.now();
      })
      .addCase(initializeAuthAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || null;
        state.isAuthenticated = false;
        state.user = null;
      });
  },
});

export const {
  setUser,
  clearUser,
  setLoading,
  setError,
  logout,
} = authSlice.actions;

export default authSlice.reducer; 