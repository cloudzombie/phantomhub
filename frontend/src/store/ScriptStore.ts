import { makeAutoObservable, runInAction } from 'mobx';
import { apiService } from '../services/ApiService';
import { WebSocketManager } from '../core/WebSocketManager';
import axios from 'axios';

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

// Define API response interface
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export class ScriptStore {
  private scripts: Map<string, Script> = new Map();
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
      const script = this.scripts.get(data.scriptId);
      if (script) {
        script.executionCount = data.executionCount;
        script.lastExecuted = data.lastExecuted;
        this.scripts.set(data.scriptId, script);
        this.lastUpdated = Date.now();
      }
    });
  }

  public async fetchScripts(): Promise<void> {
    // Don't fetch if we've fetched recently (within 30 seconds)
    if (this.lastUpdated && Date.now() - this.lastUpdated < 30000) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const response = await apiService.get<ApiResponse<Script[]>>('/scripts');
      runInAction(() => {
        this.scripts.clear();
        if (response.data?.success) {
          const scripts = response.data.data || [];
          scripts.forEach((script: Script) => {
            this.scripts.set(script.id, script);
          });
        }
        this.lastUpdated = Date.now();
      });
    } catch (error) {
      runInAction(() => {
        // Handle 404 as empty scripts (for new users)
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          this.scripts.clear();
        } else {
          this.error = error instanceof Error ? error.message : 'Failed to fetch scripts';
        }
        this.lastUpdated = Date.now();
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  public async getScript(id: string): Promise<Script | null> {
    // Return from cache if available
    const cachedScript = this.scripts.get(id);
    if (cachedScript) {
      return cachedScript;
    }

    try {
      const response = await apiService.get<ApiResponse<Script>>(`/scripts/${id}`);
      if (response.data?.success) {
        const script = response.data.data;
        runInAction(() => {
          this.scripts.set(script.id, script);
        });
        return script;
      }
      return null;
    } catch (error) {
      console.error(`Failed to fetch script ${id}:`, error);
      return null;
    }
  }

  public async createScript(script: Omit<Script, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'executionCount' | 'lastExecuted'>): Promise<Script | null> {
    this.isLoading = true;

    try {
      const response = await apiService.post<ApiResponse<Script>>('/scripts', script);
      if (response.data?.success) {
        const newScript = response.data.data;
        runInAction(() => {
          this.scripts.set(newScript.id, newScript);
          this.selectedScriptId = newScript.id;
          this.lastUpdated = Date.now();
        });
        return newScript;
      }
      return null;
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to create script';
      });
      return null;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  public async updateScript(id: string, updates: Partial<Script>): Promise<Script | null> {
    try {
      const response = await apiService.put<ApiResponse<Script>>(`/scripts/${id}`, updates);
      if (response.data?.success) {
        const updatedScript = response.data.data;
        runInAction(() => {
          this.scripts.set(id, updatedScript);
          this.lastUpdated = Date.now();
        });
        return updatedScript;
      }
      return null;
    } catch (error) {
      console.error(`Failed to update script ${id}:`, error);
      return null;
    }
  }

  public async deleteScript(id: string): Promise<boolean> {
    try {
      const response = await apiService.delete<ApiResponse<void>>(`/scripts/${id}`);
      if (response.data?.success) {
        runInAction(() => {
          this.scripts.delete(id);
          if (this.selectedScriptId === id) {
            this.selectedScriptId = null;
          }
          this.lastUpdated = Date.now();
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to delete script ${id}:`, error);
      return false;
    }
  }

  // Actions
  public setSelectedScript(id: string | null): void {
    this.selectedScriptId = id;
  }

  // Computed properties
  public get allScripts(): Script[] {
    return Array.from(this.scripts.values());
  }

  public get selectedScript(): Script | null {
    return this.selectedScriptId ? this.scripts.get(this.selectedScriptId) || null : null;
  }

  public get publicScripts(): Script[] {
    return this.allScripts.filter(script => script.isPublic);
  }

  public get privateScripts(): Script[] {
    return this.allScripts.filter(script => !script.isPublic);
  }

  public get loading(): boolean {
    return this.isLoading;
  }

  public get errorMessage(): string | null {
    return this.error;
  }
} 