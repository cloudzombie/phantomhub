import { makeAutoObservable } from 'mobx';
import { DeviceStore } from './DeviceStore';
import { NotificationStore } from './NotificationStore';

export class RootStore {
  public deviceStore: DeviceStore;
  public notificationStore: NotificationStore;

  constructor() {
    makeAutoObservable(this);
    this.deviceStore = new DeviceStore();
    this.notificationStore = new NotificationStore();
  }

  // Add more stores here as needed
  // public userStore: UserStore;
  // etc.
} 