import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Script } from '../api';

interface ScriptState {
  scripts: Script[];
  selectedScripts: string[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  executionStatus: {
    [key: string]: 'pending' | 'running' | 'completed' | 'failed';
  };
}

const initialState: ScriptState = {
  scripts: [],
  selectedScripts: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  executionStatus: {},
};

const scriptSlice = createSlice({
  name: 'scripts',
  initialState,
  reducers: {
    setScripts: (state, action: PayloadAction<Script[]>) => {
      state.scripts = action.payload;
      state.error = null;
      state.lastUpdated = Date.now();
    },
    setSelectedScripts: (state, action: PayloadAction<string[]>) => {
      state.selectedScripts = action.payload;
      state.lastUpdated = Date.now();
    },
    toggleScriptSelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedScripts.indexOf(action.payload);
      if (index === -1) {
        state.selectedScripts.push(action.payload);
      } else {
        state.selectedScripts.splice(index, 1);
      }
      state.lastUpdated = Date.now();
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.lastUpdated = Date.now();
    },
    updateScript: (state, action: PayloadAction<Script>) => {
      const index = state.scripts.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.scripts[index] = action.payload;
        state.lastUpdated = Date.now();
      }
    },
    deleteScript: (state, action: PayloadAction<string>) => {
      state.scripts = state.scripts.filter(s => s.id !== action.payload);
      state.selectedScripts = state.selectedScripts.filter(id => id !== action.payload);
      state.lastUpdated = Date.now();
    },
    updateExecutionStatus: (state, action: PayloadAction<{ scriptId: string; status: 'pending' | 'running' | 'completed' | 'failed' }>) => {
      state.executionStatus[action.payload.scriptId] = action.payload.status;
      state.lastUpdated = Date.now();
    },
    clearScripts: (state) => {
      state.scripts = [];
      state.selectedScripts = [];
      state.error = null;
      state.executionStatus = {};
      state.lastUpdated = Date.now();
    },
  },
});

export const {
  setScripts,
  setSelectedScripts,
  toggleScriptSelection,
  setLoading,
  setError,
  updateScript,
  deleteScript,
  updateExecutionStatus,
  clearScripts,
} = scriptSlice.actions;

export default scriptSlice.reducer; 