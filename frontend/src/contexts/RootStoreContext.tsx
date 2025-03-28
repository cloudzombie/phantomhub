import React, { createContext, ReactNode } from 'react';
import { RootStore, RootStoreImpl, rootStore } from '../store/RootStore';

export const RootStoreContext = createContext<RootStore | null>(null);

interface RootStoreProviderProps {
  children: ReactNode;
}

export const RootStoreProvider: React.FC<RootStoreProviderProps> = ({ children }) => {
  React.useEffect(() => {
    // Initialize all stores
    rootStore.initializeStores();
  }, []);

  return (
    <RootStoreContext.Provider value={rootStore}>
      {children}
    </RootStoreContext.Provider>
  );
}; 