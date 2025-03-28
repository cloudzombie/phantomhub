import { makeAutoObservable, runInAction } from 'mobx';
import { api } from '../services/api';
import { WebSocketManager } from '../core/WebSocketManager';
import axios from 'axios';
import type { ApiResponse } from '../core/apiClient';

export interface Script {
  id: string;
  name: string;
  content: string;
  type: 'callback' | 'exfiltration' | 'command' | 'custom';
  description: string | null;
  isPublic: boolean;
  endpoint: string | null;
  callbackUrl: string | null;
  lastExecuted: string | null;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export class ScriptStore {
  private scripts: Script[] = [];
  private selectedScriptId: string | null = null;
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
    this.wsManager.subscribe('scriptExecution', this.handleScriptExecution.bind(this));
  }

  private handleScriptExecution(data: { scriptId: string; executionCount: number; lastExecuted: string }): void {
    runInAction(() => {
      const script = this.scripts.find(s => s.id === data.scriptId);
      if (script) {
        script.executionCount = data.executionCount;
        script.lastExecuted = data.lastExecuted;
      }
    });
  }

  public initialize(): void {
    this.fetchScripts();
    this.wsManager.connect();
  }

  public async fetchScripts(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await api.get<ApiResponse<Script[]>>('/scripts');
      runInAction(() => {
        if (response.data.success && Array.isArray(response.data.data)) {
          this.scripts = response.data.data;
        } else {
          this.scripts = [];
        }
      });
    } catch (err: any) {
      runInAction(() => {
        this.error = err.message || 'Failed to fetch scripts';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  public async getScript(id: string): Promise<Script | null> {
    // Return from cache if available
    const cachedScript = this.scripts.find(s => s.id === id);
    if (cachedScript) {
      return cachedScript;
    }

    try {
      const response = await api.get<ApiResponse<Script>>(`/scripts/${id}`);
      if (response.data.success && response.data.data) {
        // Ensure the response has the required Script properties
        const script = response.data.data;
        if (this.isValidScript(script)) {
          runInAction(() => {
            this.scripts.push(script);
          });
          return script;
        }
      }
      return null;
    } catch (error) {
      console.error(`Failed to fetch script ${id}:`, error);
      return null;
    }
  }

  private isValidScript(obj: any): obj is Script {
    return (
      obj &&
      typeof obj.id === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.content === 'string'
    );
  }

  public async createScript(script: Omit<Script, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Script | null> {
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await api.post<ApiResponse<Script>>('/scripts', script);
      if (response.data.success && response.data.data) {
        const newScript = response.data.data;
        if (this.isValidScript(newScript)) {
          runInAction(() => {
            this.scripts.push(newScript);
          });
          return newScript;
        }
      }
      return null;
    } catch (err: any) {
      runInAction(() => {
        this.error = err.message || 'Failed to create script';
      });
      return null;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  public async updateScript(id: string, updates: Partial<Script>): Promise<Script | null> {
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await api.put<ApiResponse<Script>>(`/scripts/${id}`, updates);
      if (response.data.success && response.data.data) {
        const updatedScript = response.data.data;
        if (this.isValidScript(updatedScript)) {
          runInAction(() => {
            const index = this.scripts.findIndex(s => s.id === id);
            if (index !== -1) {
              this.scripts[index] = updatedScript;
            }
          });
          return updatedScript;
        }
      }
      return null;
    } catch (err: any) {
      runInAction(() => {
        this.error = err.message || 'Failed to update script';
      });
      return null;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  public async deleteScript(id: string): Promise<boolean> {
    this.isLoading = true;
    this.error = null;
    
    try {
      const response = await api.delete<ApiResponse<void>>(`/scripts/${id}`);
      if (response.data.success) {
        runInAction(() => {
          this.scripts = this.scripts.filter(s => s.id !== id);
        });
        return true;
      }
      return false;
    } catch (err: any) {
      runInAction(() => {
        this.error = err.message || 'Failed to delete script';
      });
      return false;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Actions
  public setSelectedScript(id: string | null): void {
    this.selectedScriptId = id;
  }

  // Computed properties
  public get allScripts(): Script[] {
    return this.scripts;
  }

  public get selectedScript(): Script | null {
    return this.selectedScriptId ? this.scripts.find(s => s.id === this.selectedScriptId) || null : null;
  }

  public get publicScripts(): Script[] {
    return this.scripts.filter(script => script.isPublic);
  }

  public get privateScripts(): Script[] {
    return this.scripts.filter(script => !script.isPublic);
  }

  public get loading(): boolean {
    return this.isLoading;
  }

  public get errorMessage(): string | null {
    return this.error;
  }
} 