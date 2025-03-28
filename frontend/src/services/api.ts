import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * This module serves as the central API client that replaces the old ApiService.
 * It provides a standardized way to interact with the backend API using Axios.
 * All API requests should go through this service to ensure consistent handling
 * of authentication, error handling, and response formatting.
 * 
 * For complex data fetching with caching, invalidation, and background updates,
 * use the Redux Toolkit Query implementation in ../core/apiClient.ts
 */

// Define API response interface for type safety
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';

class Api {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      withCredentials: true // Enable sending cookies with requests
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Response interceptor - standardizes error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.get<ApiResponse<T>>(url, config);
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.post<ApiResponse<T>>(url, data, config);
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.put<ApiResponse<T>>(url, data, config);
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.patch<ApiResponse<T>>(url, data, config);
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.delete<ApiResponse<T>>(url, config);
  }
}

// Export a singleton instance
export const api = new Api(); 