import { makeAutoObservable } from 'mobx';
import { DeviceStore } from './DeviceStore';
import { NotificationStore } from './NotificationStore';
import { SystemStore } from './SystemStore';
import { ScriptStore } from './ScriptStore';
import { PayloadStore } from './PayloadStore';

export interface RootStore {
  deviceStore: DeviceStore;
  notificationStore: NotificationStore;
  scriptStore: ScriptStore;
  payloadStore: PayloadStore;
  systemStore: SystemStore;
  initializeStores(): void;
}

export class RootStoreImpl implements RootStore {
  public deviceStore: DeviceStore;
  public notificationStore: NotificationStore;
  public scriptStore: ScriptStore;
  public payloadStore: PayloadStore;
  public systemStore: SystemStore;

  constructor() {
    makeAutoObservable(this);
    this.deviceStore = new DeviceStore();
    this.notificationStore = new NotificationStore();
    this.scriptStore = new ScriptStore();
    this.payloadStore = new PayloadStore();
    this.systemStore = new SystemStore();
  }

  public initializeStores(): void {
    this.deviceStore.initialize();
    this.notificationStore.initialize();
    this.scriptStore.initialize();
    this.payloadStore.initialize();
    this.systemStore.initialize();
  }

  // Add more stores here as needed
  // public userStore: UserStore;
  // etc.
}

// Create and export a singleton instance
export const rootStore = new RootStoreImpl(); 