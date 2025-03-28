import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
  id: string;
  timestamp: number;
}

interface ModalState {
  isOpen: boolean;
  type: string | null;
  data: any | null;
}

interface UIState {
  messages: Message[];
  activeModal: ModalState;
  isLoading: boolean;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  lastUpdated: number | null;
}

const initialState: UIState = {
  messages: [],
  activeModal: {
    isOpen: false,
    type: null,
    data: null,
  },
  isLoading: false,
  theme: 'dark',
  sidebarOpen: true,
  lastUpdated: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Omit<Message, 'id' | 'timestamp'>>) => {
      const message: Message = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      state.messages.push(message);
      state.lastUpdated = Date.now();
    },
    removeMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(msg => msg.id !== action.payload);
      state.lastUpdated = Date.now();
    },
    clearMessages: (state) => {
      state.messages = [];
      state.lastUpdated = Date.now();
    },
    openModal: (state, action: PayloadAction<{ type: string; data?: any }>) => {
      state.activeModal = {
        isOpen: true,
        type: action.payload.type,
        data: action.payload.data,
      };
      state.lastUpdated = Date.now();
    },
    closeModal: (state) => {
      state.activeModal = {
        isOpen: false,
        type: null,
        data: null,
      };
      state.lastUpdated = Date.now();
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      state.lastUpdated = Date.now();
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      state.lastUpdated = Date.now();
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
      state.lastUpdated = Date.now();
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
      state.lastUpdated = Date.now();
    },
  },
});

export const {
  addMessage,
  removeMessage,
  clearMessages,
  openModal,
  closeModal,
  setLoading,
  toggleTheme,
  toggleSidebar,
  setSidebarOpen,
} = uiSlice.actions;

export default uiSlice.reducer; 