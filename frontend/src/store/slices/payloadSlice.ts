import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Payload } from '../api';

interface PayloadState {
  payloads: Payload[];
  selectedPayload: Payload | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  deploymentStatus: {
    [key: string]: 'pending' | 'in_progress' | 'completed' | 'failed';
  };
}

const initialState: PayloadState = {
  payloads: [],
  selectedPayload: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  deploymentStatus: {},
};

const payloadSlice = createSlice({
  name: 'payloads',
  initialState,
  reducers: {
    setPayloads: (state, action: PayloadAction<Payload[]>) => {
      state.payloads = action.payload;
      state.error = null;
      state.lastUpdated = Date.now();
    },
    setSelectedPayload: (state, action: PayloadAction<Payload | null>) => {
      state.selectedPayload = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.lastUpdated = Date.now();
    },
    updatePayload: (state, action: PayloadAction<Payload>) => {
      const index = state.payloads.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.payloads[index] = action.payload;
        if (state.selectedPayload?.id === action.payload.id) {
          state.selectedPayload = action.payload;
        }
        state.lastUpdated = Date.now();
      }
    },
    deletePayload: (state, action: PayloadAction<string>) => {
      state.payloads = state.payloads.filter(p => p.id !== action.payload);
      if (state.selectedPayload?.id === action.payload) {
        state.selectedPayload = null;
      }
      state.lastUpdated = Date.now();
    },
    updateDeploymentStatus: (state, action: PayloadAction<{ payloadId: string; status: 'pending' | 'in_progress' | 'completed' | 'failed' }>) => {
      state.deploymentStatus[action.payload.payloadId] = action.payload.status;
      state.lastUpdated = Date.now();
    },
    clearPayloads: (state) => {
      state.payloads = [];
      state.selectedPayload = null;
      state.error = null;
      state.deploymentStatus = {};
      state.lastUpdated = Date.now();
    },
  },
});

export const {
  setPayloads,
  setSelectedPayload,
  setLoading,
  setError,
  updatePayload,
  deletePayload,
  updateDeploymentStatus,
  clearPayloads,
} = payloadSlice.actions;

export default payloadSlice.reducer; 