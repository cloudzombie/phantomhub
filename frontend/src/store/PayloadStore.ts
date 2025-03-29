import { makeAutoObservable, runInAction } from 'mobx';
import { api } from '../services/api';
import { WebSocketManager } from '../core/WebSocketManager';
import axios from 'axios';
import type { Payload } from '../core/apiClient';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export class PayloadStore {
  private payloads: Map<string, Payload> = new Map();
  private selectedPayloadId: string | null = null;
  private isLoading: boolean = false;
  private error: string | null = null;
  private lastUpdated: number | null = null;
  private wsManager: WebSocketManager;

  constructor() {
    makeAutoObservable(this);
    this.wsManager = WebSocketManager.getInstance();
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners(): void {
    this.wsManager.subscribe('payloadStatusUpdate', this.handlePayloadUpdate.bind(this));
  }

  private handlePayloadUpdate(data: { payloadId: string; status: string }): void {
    runInAction(() => {
      const payload = this.payloads.get(data.payloadId);
      if (payload) {
        payload.status = data.status as 'pending' | 'in_progress' | 'completed' | 'failed';
        this.payloads.set(data.payloadId, payload);
        this.lastUpdated = Date.now();
      }
    });
  }

  public async fetchPayloads(): Promise<void> {
    if (this.lastUpdated && Date.now() - this.lastUpdated < 30000) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const response = await api.get<Payload[]>('/payloads');
      runInAction(() => {
        this.payloads.clear();
        if (response.data?.success) {
          const payloads = response.data.data || [];
          payloads.forEach((payload: Payload) => {
            this.payloads.set(payload.id, payload);
          });
        }
        this.lastUpdated = Date.now();
      });
    } catch (error) {
      runInAction(() => {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          this.payloads.clear();
        } else {
          this.error = error instanceof Error ? error.message : 'Failed to fetch payloads';
        }
        this.lastUpdated = Date.now();
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  public async getPayload(id: string): Promise<Payload | null> {
    const cachedPayload = this.payloads.get(id);
    if (cachedPayload) {
      return cachedPayload;
    }

    try {
      const response = await api.get<Payload>(`/payloads/${id}`);
      if (response.data?.success) {
        const payload = response.data.data;
        runInAction(() => {
          this.payloads.set(payload.id, payload);
        });
        return payload;
      }
      return null;
    } catch (error) {
      console.error(`Failed to fetch payload ${id}:`, error);
      return null;
    }
  }

  public async createPayload(payload: Omit<Payload, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Payload | null> {
    this.isLoading = true;

    try {
      const response = await api.post<Payload>('/payloads', payload);
      if (response.data?.success) {
        const newPayload = response.data.data;
        runInAction(() => {
          this.payloads.set(newPayload.id, newPayload);
          this.selectedPayloadId = newPayload.id;
          this.lastUpdated = Date.now();
        });
        return newPayload;
      }
      return null;
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to create payload';
      });
      return null;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  public async updatePayload(id: string, updates: Partial<Payload>): Promise<Payload | null> {
    try {
      const response = await api.put<Payload>(`/payloads/${id}`, updates);
      if (response.data?.success) {
        const updatedPayload = response.data.data;
        runInAction(() => {
          this.payloads.set(id, updatedPayload);
          this.lastUpdated = Date.now();
        });
        return updatedPayload;
      }
      return null;
    } catch (error) {
      console.error(`Failed to update payload ${id}:`, error);
      return null;
    }
  }

  public async deletePayload(id: string): Promise<boolean> {
    try {
      const response = await api.delete<void>(`/payloads/${id}`);
      if (response.data?.success) {
        runInAction(() => {
          this.payloads.delete(id);
          if (this.selectedPayloadId === id) {
            this.selectedPayloadId = null;
          }
          this.lastUpdated = Date.now();
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete payload ${id}:`, error);
      return false;
    }
  }

  public setSelectedPayload(id: string | null): void {
    this.selectedPayloadId = id;
  }

  public get allPayloads(): Payload[] {
    return Array.from(this.payloads.values());
  }

  public get selectedPayload(): Payload | null {
    return this.selectedPayloadId ? this.payloads.get(this.selectedPayloadId) || null : null;
  }

  public get loading(): boolean {
    return this.isLoading;
  }

  public get errorMessage(): string | null {
    return this.error;
  }

  public initialize(): void {
    this.fetchPayloads();
    this.wsManager.connect();
  }

  setPayloads(payloads: Payload[]) {
    this.payloads.clear();
    payloads.forEach((payload: Payload) => {
      this.payloads.set(payload.id, payload);
    });
  }
}

export default PayloadStore; 