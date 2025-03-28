import { makeAutoObservable, runInAction } from 'mobx';
import { api } from '../services/api';
import { WebSocketManager } from '../core/WebSocketManager';
import type { ApiResponse } from '../core/apiClient';

export interface SystemHealth {
  apiStatus: 'healthy' | 'unhealthy';
  dbStatus: 'connected' | 'disconnected';
  version: string;
  uptime: number;
}

interface SystemStatus {
  memory: {
    total: number;
    used: number;
    free: number;
  };
  cpuLoad: number;
}

export class SystemStore {
  private status: SystemStatus = {
    memory: {
      total: 0,
      used: 0,
      free: 0
    },
    cpuLoad: 0
  };

  private health: SystemHealth | null = null;
  private isLoading: boolean = false;
  private error: string | null = null;
  private wsManager: WebSocketManager;

  constructor() {
    makeAutoObservable(this);
    this.wsManager = WebSocketManager.getInstance();
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners(): void {
    this.wsManager.subscribe('system_status', this.handleSystemUpdate.bind(this));
  }

  private handleSystemUpdate(data: SystemHealth): void {
    runInAction(() => {
      this.health = data;
    });
  }

  public initialize(): void {
    this.fetchSystemHealth();
    this.wsManager.connect();
  }

  private isValidSystemHealth(obj: any): obj is SystemHealth {
    return (
      obj &&
      (obj.apiStatus === 'healthy' || obj.apiStatus === 'unhealthy') &&
      (obj.dbStatus === 'connected' || obj.dbStatus === 'disconnected') &&
      typeof obj.version === 'string' &&
      typeof obj.uptime === 'number'
    );
  }

  public async fetchSystemHealth(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await api.get<ApiResponse<SystemHealth>>('/system/health');
      runInAction(() => {
        if (response.data.success && response.data.data) {
          const healthData = response.data.data;
          if (this.isValidSystemHealth(healthData)) {
            this.health = healthData;
          }
        }
      });
    } catch (err: any) {
      runInAction(() => {
        this.error = err.message || 'Failed to fetch system health';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }
  
  // Compute memory usage percentage
  public get memoryUsagePercentage(): number {
    const { total, used } = this.status.memory;
    return total > 0 ? (used / total) * 100 : 0;
  }

  // Compute color class based on memory usage
  public get memoryColorClass(): string {
    const percentage = this.memoryUsagePercentage;
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  // Compute color class based on CPU load
  public get cpuColorClass(): string {
    const { cpuLoad } = this.status;
    if (cpuLoad > 90) return 'bg-red-500';
    if (cpuLoad > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  // Computed properties
  public get systemHealth(): SystemHealth | null {
    return this.health;
  }

  public get loading(): boolean {
    return this.isLoading;
  }

  public get errorMessage(): string | null {
    return this.error;
  }

  public updateSystemStatus(newStatus: Partial<SystemHealth>): void {
    runInAction(() => {
      if (this.health) {
        this.health = {
          ...this.health,
          ...newStatus
        };
      } else {
        this.health = newStatus as SystemHealth;
      }
    });
  }
} 