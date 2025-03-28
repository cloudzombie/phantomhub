import { useContext } from 'react';
import { RootStoreContext } from '../contexts/RootStoreContext';
import { RootStore } from '../store/RootStore';

export const useStores = () => {
  const rootStore = useContext(RootStoreContext);
  
  if (!rootStore) {
    throw new Error('useStores must be used within a RootStoreProvider');
  }
  
  return {
    deviceStore: rootStore.deviceStore,
    payloadStore: rootStore.payloadStore,
    scriptStore: rootStore.scriptStore,
    notificationStore: rootStore.notificationStore,
  };
}; 