import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getToken } from '../utils/tokenManager';

// Define types for API responses
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Device {
  id: number;
  name: string;
  ipAddress: string;
  firmwareVersion: string | null;
  status: 'online' | 'offline' | 'busy';
  connectionType?: 'network' | 'usb';
  serialPortId?: string;
}

export interface Payload {
  id: string;
  name: string;
  script: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

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
}

// Create the API
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api',
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Device', 'Payload', 'Script'],
  endpoints: (builder) => ({
    // Device endpoints
    getDevices: builder.query<ApiResponse<Device[]>, void>({
      query: () => 'devices',
      providesTags: ['Device'],
      transformErrorResponse: (response) => ({
        success: false,
        data: [],
        message: response.data?.message || 'Failed to fetch devices',
      }),
    }),
    getDevice: builder.query<ApiResponse<Device>, number>({
      query: (id) => `devices/${id}`,
      providesTags: (result, error, id) => [{ type: 'Device', id }],
      transformErrorResponse: (response) => ({
        success: false,
        data: null,
        message: response.data?.message || 'Failed to fetch device',
      }),
    }),

    // Payload endpoints
    getPayloads: builder.query<ApiResponse<Payload[]>, void>({
      query: () => 'payloads',
      providesTags: ['Payload'],
      transformErrorResponse: (response) => ({
        success: false,
        data: [],
        message: response.data?.message || 'Failed to fetch payloads',
      }),
    }),
    getPayload: builder.query<ApiResponse<Payload>, string>({
      query: (id) => `payloads/${id}`,
      providesTags: (result, error, id) => [{ type: 'Payload', id }],
      transformErrorResponse: (response) => ({
        success: false,
        data: null,
        message: response.data?.message || 'Failed to fetch payload',
      }),
    }),
    createPayload: builder.mutation<ApiResponse<Payload>, Partial<Payload>>({
      query: (payload) => ({
        url: 'payloads',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Payload'],
      transformErrorResponse: (response) => ({
        success: false,
        data: null,
        message: response.data?.message || 'Failed to create payload',
      }),
    }),
    updatePayload: builder.mutation<ApiResponse<Payload>, { id: string; payload: Partial<Payload> }>({
      query: ({ id, payload }) => ({
        url: `payloads/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Payload', id }],
      transformErrorResponse: (response) => ({
        success: false,
        data: null,
        message: response.data?.message || 'Failed to update payload',
      }),
    }),
    deletePayload: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `payloads/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payload'],
      transformErrorResponse: (response) => ({
        success: false,
        data: null,
        message: response.data?.message || 'Failed to delete payload',
      }),
    }),

    // Script endpoints
    getScripts: builder.query<ApiResponse<Script[]>, void>({
      query: () => 'scripts',
      providesTags: ['Script'],
      transformErrorResponse: (response) => ({
        success: false,
        data: [],
        message: response.data?.message || 'Failed to fetch scripts',
      }),
    }),
    getScript: builder.query<ApiResponse<Script>, string>({
      query: (id) => `scripts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Script', id }],
      transformErrorResponse: (response) => ({
        success: false,
        data: null,
        message: response.data?.message || 'Failed to fetch script',
      }),
    }),
    createScript: builder.mutation<ApiResponse<Script>, Partial<Script>>({
      query: (script) => ({
        url: 'scripts',
        method: 'POST',
        body: script,
      }),
      invalidatesTags: ['Script'],
      transformErrorResponse: (response) => ({
        success: false,
        data: null,
        message: response.data?.message || 'Failed to create script',
      }),
    }),
    updateScript: builder.mutation<ApiResponse<Script>, { id: string; script: Partial<Script> }>({
      query: ({ id, script }) => ({
        url: `scripts/${id}`,
        method: 'PUT',
        body: script,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Script', id }],
      transformErrorResponse: (response) => ({
        success: false,
        data: null,
        message: response.data?.message || 'Failed to update script',
      }),
    }),
    deleteScript: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `scripts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Script'],
      transformErrorResponse: (response) => ({
        success: false,
        data: null,
        message: response.data?.message || 'Failed to delete script',
      }),
    }),
  }),
});

export const {
  useGetDevicesQuery,
  useGetDeviceQuery,
  useGetPayloadsQuery,
  useGetPayloadQuery,
  useCreatePayloadMutation,
  useUpdatePayloadMutation,
  useDeletePayloadMutation,
  useGetScriptsQuery,
  useGetScriptQuery,
  useCreateScriptMutation,
  useUpdateScriptMutation,
  useDeleteScriptMutation,
} = api; 