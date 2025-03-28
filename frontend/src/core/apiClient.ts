import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getToken } from '../utils/tokenManager';
import { API_ENDPOINT } from '../config/api';

// Define common types for API responses
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Basic entity types
export interface Device {
  id: string; 
  name: string;
  status: 'online' | 'offline' | 'busy' | 'error';
  connectionType: 'network' | 'usb';
  ipAddress?: string;
  serialPortId?: string;
  firmwareVersion?: string;
  lastCheckIn?: string;
  userId: string;
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
  userId: string;
}

// Create the API with RTK Query
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_ENDPOINT,
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Device', 'Payload', 'Script', 'User', 'Deployment'],
  endpoints: (builder) => ({
    // Device endpoints
    getDevices: builder.query<ApiResponse<Device[]>, void>({
      query: () => '/devices',
      providesTags: ['Device'],
    }),
    getDevice: builder.query<ApiResponse<Device>, string>({
      query: (id) => `/devices/${id}`,
      providesTags: (result, error, id) => [{ type: 'Device', id }],
    }),
    createDevice: builder.mutation<ApiResponse<Device>, Partial<Device>>({
      query: (device) => ({
        url: '/devices',
        method: 'POST',
        body: device,
      }),
      invalidatesTags: ['Device'],
    }),
    updateDevice: builder.mutation<ApiResponse<Device>, { id: string; device: Partial<Device> }>({
      query: ({ id, device }) => ({
        url: `/devices/${id}`,
        method: 'PUT',
        body: device,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Device', id }],
    }),
    deleteDevice: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/devices/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Device'],
    }),

    // Payload endpoints
    getPayloads: builder.query<ApiResponse<Payload[]>, void>({
      query: () => '/payloads',
      providesTags: ['Payload'],
    }),
    getPayload: builder.query<ApiResponse<Payload>, string>({
      query: (id) => `/payloads/${id}`,
      providesTags: (result, error, id) => [{ type: 'Payload', id }],
    }),
    createPayload: builder.mutation<ApiResponse<Payload>, Partial<Payload>>({
      query: (payload) => ({
        url: '/payloads',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Payload'],
    }),
    updatePayload: builder.mutation<ApiResponse<Payload>, { id: string; payload: Partial<Payload> }>({
      query: ({ id, payload }) => ({
        url: `/payloads/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Payload', id }],
    }),
    deletePayload: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/payloads/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payload'],
    }),
    deployPayload: builder.mutation<ApiResponse<{ id: string }>, { payloadId: string; deviceId: string; connectionType: 'network' | 'usb' }>({
      query: (deployment) => ({
        url: '/payloads/deploy',
        method: 'POST',
        body: deployment,
      }),
      invalidatesTags: ['Device', 'Deployment'],
    }),

    // Script endpoints
    getScripts: builder.query<ApiResponse<Script[]>, void>({
      query: () => '/scripts',
      providesTags: ['Script'],
    }),
    getScript: builder.query<ApiResponse<Script>, string>({
      query: (id) => `/scripts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Script', id }],
    }),
    createScript: builder.mutation<ApiResponse<Script>, Partial<Script>>({
      query: (script) => ({
        url: '/scripts',
        method: 'POST',
        body: script,
      }),
      invalidatesTags: ['Script'],
    }),
    updateScript: builder.mutation<ApiResponse<Script>, { id: string; script: Partial<Script> }>({
      query: ({ id, script }) => ({
        url: `/scripts/${id}`,
        method: 'PUT',
        body: script,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Script', id }],
    }),
    deleteScript: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/scripts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Script'],
    }),
    
    // Script associations
    getPayloadScripts: builder.query<ApiResponse<Script[]>, string>({
      query: (payloadId) => `/scripts/payload/${payloadId}`,
      providesTags: (result, error, payloadId) => [
        { type: 'Script', id: `payload-${payloadId}` },
      ],
    }),
    associateScript: builder.mutation<ApiResponse<void>, { scriptId: string; payloadId: string; executionOrder?: number }>({
      query: (data) => ({
        url: '/scripts/associate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { payloadId, scriptId }) => [
        { type: 'Script', id: `payload-${payloadId}` },
        { type: 'Payload', id: payloadId },
      ],
    }),
    disassociateScript: builder.mutation<ApiResponse<void>, { scriptId: string; payloadId: string }>({
      query: (data) => ({
        url: '/scripts/disassociate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { payloadId, scriptId }) => [
        { type: 'Script', id: `payload-${payloadId}` },
        { type: 'Payload', id: payloadId },
      ],
    }),
  }),
});

// Export hooks for using the endpoints
export const {
  useGetDevicesQuery,
  useGetDeviceQuery,
  useCreateDeviceMutation,
  useUpdateDeviceMutation,
  useDeleteDeviceMutation,
  useGetPayloadsQuery,
  useGetPayloadQuery,
  useCreatePayloadMutation,
  useUpdatePayloadMutation,
  useDeletePayloadMutation,
  useDeployPayloadMutation,
  useGetScriptsQuery,
  useGetScriptQuery,
  useCreateScriptMutation,
  useUpdateScriptMutation,
  useDeleteScriptMutation,
  useGetPayloadScriptsQuery,
  useAssociateScriptMutation,
  useDisassociateScriptMutation,
} = apiSlice; 