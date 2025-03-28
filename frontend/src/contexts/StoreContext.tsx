import React, { createContext, useContext, ReactNode } from 'react';
import { RootStore } from '../store/RootStore';

const StoreContext = createContext<RootStore | null>(null);

export interface StoreProviderProps {
  children: ReactNode;
  store: RootStore;
}

export function StoreProvider({ children, store }: StoreProviderProps): JSX.Element {
  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): RootStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return store;
}

export function useDeviceStore() {
  return useStore().deviceStore;
}

export function useNotificationStore() {
  return useStore().notificationStore;
} 