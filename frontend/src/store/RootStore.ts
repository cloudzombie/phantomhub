import { makeAutoObservable } from 'mobx';
import { DeviceStore } from './DeviceStore';
import { NotificationStore } from './NotificationStore';
import { ScriptStore } from './ScriptStore';
import { PayloadStore } from './PayloadStore';
import { WebSocketManager } from '../core/WebSocketManager';

export class RootStore {
  public deviceStore: DeviceStore;
  public notificationStore: NotificationStore;
  public scriptStore: ScriptStore;
  public payloadStore: PayloadStore;

  constructor() {
    makeAutoObservable(this);
    this.deviceStore = new DeviceStore();
    this.notificationStore = new NotificationStore();
    this.scriptStore = new ScriptStore();
    this.payloadStore = new PayloadStore();
  }

  // Initialize all stores and their connections
  public initializeStores(): void {
    // Ensure WebSocket connection is established
    const wsManager = WebSocketManager.getInstance();
    wsManager.connect();
    
    // Load initial data for all stores
    this.deviceStore.fetchDevices();
    this.scriptStore.fetchScripts();
    this.payloadStore.fetchPayloads();
  }

  // Add more stores here as needed
  // public userStore: UserStore;
  // etc.
} 