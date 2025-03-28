import { useContext, createContext } from 'react';
import { DeviceStore } from '../store/DeviceStore';
import { PayloadStore } from '../store/PayloadStore';
import { ScriptStore } from '../store/ScriptStore';

interface RootStore {
  deviceStore: DeviceStore;
  payloadStore: PayloadStore;
  scriptStore: ScriptStore;
}

// Create the stores
const deviceStore = new DeviceStore();
const payloadStore = new PayloadStore();
const scriptStore = new ScriptStore();

// Create the root store
const rootStore: RootStore = {
  deviceStore,
  payloadStore,
  scriptStore
};

// Create context
const StoreContext = createContext<RootStore>(rootStore);

// Hook to use the store
export const useStores = () => useContext(StoreContext); 