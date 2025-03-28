import React, { createContext, useContext, ReactNode } from 'react';
import { RootStore, rootStore } from '../store/RootStore';

// Create the context
export const StoreContext = createContext<RootStore | null>(null);

// Export the hook
export const useStore = () => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return store;
};

interface StoreProviderProps {
  children: ReactNode;
}

// Export the provider component
export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  // Initialize all stores
  React.useEffect(() => {
    rootStore.initializeStores();
  }, []);
  
  return (
    <StoreContext.Provider value={rootStore}>
      {children}
    </StoreContext.Provider>
  );
};

export function useDeviceStore() {
  return useStore().deviceStore;
}

export function useNotificationStore() {
  return useStore().notificationStore;
} 