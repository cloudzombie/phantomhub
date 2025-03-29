import { useContext, createContext } from 'react';
import type { RootStore } from '../store/RootStore';
import { rootStore } from '../store/RootStore';

// Create context
const StoreContext = createContext<RootStore>(rootStore);

// Hook to use the store
export const useStores = () => useContext(StoreContext); 