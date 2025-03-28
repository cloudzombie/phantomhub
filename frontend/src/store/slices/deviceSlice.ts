import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Device } from '../api';

interface DeviceState {
  devices: Device[];
  selectedDevice: string | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  connectionStatus: {
    [key: string]: 'connected' | 'disconnected' | 'connecting' | 'error';
  };
}

const initialState: DeviceState = {
  devices: [],
  selectedDevice: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  connectionStatus: {},
};

const deviceSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    setDevices: (state, action: PayloadAction<Device[]>) => {
      state.devices = action.payload;
      state.error = null;
      state.lastUpdated = Date.now();
    },
    setSelectedDevice: (state, action: PayloadAction<string | null>) => {
      state.selectedDevice = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.lastUpdated = Date.now();
    },
    updateDeviceStatus: (state, action: PayloadAction<{ id: string; status: Device['status'] }>) => {
      const device = state.devices.find(d => d.id.toString() === action.payload.id);
      if (device) {
        device.status = action.payload.status;
        state.lastUpdated = Date.now();
      }
    },
    updateConnectionStatus: (state, action: PayloadAction<{ deviceId: string; status: 'connected' | 'disconnected' | 'connecting' | 'error' }>) => {
      state.connectionStatus[action.payload.deviceId] = action.payload.status;
      state.lastUpdated = Date.now();
    },
    clearDevices: (state) => {
      state.devices = [];
      state.selectedDevice = null;
      state.error = null;
      state.connectionStatus = {};
      state.lastUpdated = Date.now();
    },
  },
});

export const {
  setDevices,
  setSelectedDevice,
  setLoading,
  setError,
  updateDeviceStatus,
  updateConnectionStatus,
  clearDevices,
} = deviceSlice.actions;

export default deviceSlice.reducer; 