import React, { createContext, ReactNode } from 'react';
import { RootStore } from '../store/RootStore';

export const RootStoreContext = createContext<RootStore | null>(null);

interface RootStoreProviderProps {
  children: ReactNode;
}

let rootStore: RootStore;

export const RootStoreProvider: React.FC<RootStoreProviderProps> = ({ children }) => {
  if (!rootStore) {
    rootStore = new RootStore();
    // Initialize all stores
    rootStore.initializeStores();
  }

  return (
    <RootStoreContext.Provider value={rootStore}>
      {children}
    </RootStoreContext.Provider>
  );
}; 