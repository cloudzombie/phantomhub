# PhantomHub API Documentation

This document provides a comprehensive guide to the PhantomHub REST API endpoints, their methods, required parameters, and expected responses.

## Base URL

All API endpoints are relative to:

```
http://localhost:5001/api
```

## Authentication

Most API endpoints require authentication. Include a valid JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Authentication Endpoints

#### Register a new user
- **URL**: `/auth/register`
- **Method**: `POST`
- **Auth required**: No
- **Body**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "token": "JWT_TOKEN",
    "user": {
      "id": "UUID",
      "username": "string",
      "email": "string",
      "role": "admin|operator|viewer"
    }
  }
  ```

#### Login
- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth required**: No
- **Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "token": "JWT_TOKEN",
    "user": {
      "id": "UUID",
      "username": "string",
      "email": "string",
      "role": "admin|operator|viewer"
    }
  }
  ```

#### Get current user
- **URL**: `/auth/me`
- **Method**: `GET`
- **Auth required**: Yes
- **Response**: 
  ```json
  {
    "success": true,
    "user": {
      "id": "UUID",
      "username": "string",
      "email": "string",
      "role": "admin|operator|viewer"
    }
  }
  ```

## Device Endpoints

### Get all devices
- **URL**: `/devices`
- **Method**: `GET`
- **Auth required**: Yes
- **Response**: 
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "UUID",
        "name": "string",
        "status": "online|offline|error|maintenance",
        "connectionType": "usb|network",
        "ipAddress": "string|null",
        "serialPortId": "string|null",
        "firmwareVersion": "string|null",
        "lastSeen": "datetime|null",
        "batteryLevel": "number|null",
        "signalStrength": "number|null",
        "errors": "array|null",
        "userId": "UUID"
      }
    ]
  }
  ```

### Get a specific device
- **URL**: `/devices/:id`
- **Method**: `GET`
- **Auth required**: Yes
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "id": "UUID",
      "name": "string",
      "status": "online|offline|error|maintenance",
      "connectionType": "usb|network",
      "ipAddress": "string|null",
      "serialPortId": "string|null",
      "firmwareVersion": "string|null",
      "lastSeen": "datetime|null",
      "batteryLevel": "number|null",
      "signalStrength": "number|null",
      "errors": "array|null",
      "userId": "UUID"
    }
  }
  ```

### Create a new device
- **URL**: `/devices`
- **Method**: `POST`
- **Auth required**: Yes (Operator or Admin)
- **Body**:
  ```json
  {
    "name": "string",
    "connectionType": "usb|network",
    "ipAddress": "string" // Required for network type
    "serialPortId": "string" // Required for usb type
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "id": "UUID",
      "name": "string",
      "status": "offline",
      "connectionType": "usb|network",
      "ipAddress": "string|null",
      "serialPortId": "string|null",
      "userId": "UUID",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  }
  ```

### Update device status
- **URL**: `/devices/:id/status`
- **Method**: `PATCH`
- **Auth required**: Yes (Operator or Admin)
- **Body**:
  ```json
  {
    "status": "online|offline|error|maintenance"
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "id": "UUID",
      "status": "string",
      "updatedAt": "datetime"
    }
  }
  ```

### Send payload to device
- **URL**: `/devices/:id/send-payload`
- **Method**: `POST`
- **Auth required**: Yes (Operator or Admin)
- **Body**:
  ```json
  {
    "payloadId": "UUID", // Either this or payloadContent is required
    "payloadContent": "string" // Either this or payloadId is required
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Payload sent to O.MG Cable successfully",
    "data": {
      "deviceId": "UUID",
      "payloadId": "UUID|custom"
    }
  }
  ```

## Payload Endpoints

### Get all payloads
- **URL**: `/payloads`
- **Method**: `GET`
- **Auth required**: Yes (Operator or Admin)
- **Response**: 
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "UUID",
        "name": "string",
        "script": "string",
        "description": "string|null",
        "userId": "UUID",
        "createdAt": "datetime",
        "updatedAt": "datetime",
        "creator": {
          "id": "UUID",
          "username": "string",
          "email": "string"
        }
      }
    ]
  }
  ```

### Get a specific payload
- **URL**: `/payloads/:id`
- **Method**: `GET`
- **Auth required**: Yes (Operator or Admin)
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "id": "UUID",
      "name": "string",
      "script": "string",
      "description": "string|null",
      "userId": "UUID",
      "createdAt": "datetime",
      "updatedAt": "datetime",
      "creator": {
        "id": "UUID",
        "username": "string",
        "email": "string"
      }
    }
  }
  ```

### Create a new payload
- **URL**: `/payloads`
- **Method**: `POST`
- **Auth required**: Yes (Operator or Admin)
- **Body**:
  ```json
  {
    "name": "string",
    "script": "string",
    "description": "string" // Optional
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Payload created successfully",
    "data": {
      "id": "UUID",
      "name": "string",
      "script": "string",
      "description": "string|null",
      "userId": "UUID",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  }
  ```

### Update a payload
- **URL**: `/payloads/:id`
- **Method**: `PUT`
- **Auth required**: Yes (Operator or Admin)
- **Body**:
  ```json
  {
    "name": "string",
    "script": "string",
    "description": "string" // Optional
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Payload updated successfully",
    "data": {
      "id": "UUID",
      "name": "string",
      "script": "string",
      "description": "string|null",
      "userId": "UUID",
      "updatedAt": "datetime"
    }
  }
  ```

### Delete a payload
- **URL**: `/payloads/:id`
- **Method**: `DELETE`
- **Auth required**: Yes (Operator or Admin)
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Payload deleted successfully"
  }
  ```

### Deploy a payload
- **URL**: `/payloads/deploy`
- **Method**: `POST`
- **Auth required**: Yes (Operator or Admin)
- **Body**:
  ```json
  {
    "payloadId": "UUID",
    "deviceId": "UUID",
    "connectionType": "usb|network"
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Deployment initiated successfully",
    "data": {
      "id": "UUID",
      "payloadId": "UUID",
      "deviceId": "UUID",
      "userId": "UUID",
      "status": "pending",
      "createdAt": "datetime"
    }
  }
  ```

## Deployment Endpoints

### Get all deployments
- **URL**: `/deployments`
- **Method**: `GET`
- **Auth required**: Yes (Operator or Admin)
- **Response**: 
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "UUID",
        "payloadId": "UUID",
        "deviceId": "UUID",
        "userId": "UUID",
        "status": "pending|connected|executing|completed|failed",
        "result": "object|null",
        "createdAt": "datetime",
        "updatedAt": "datetime",
        "payload": {
          "id": "UUID",
          "name": "string"
        },
        "device": {
          "id": "UUID",
          "name": "string"
        },
        "initiator": {
          "id": "UUID",
          "username": "string"
        }
      }
    ]
  }
  ```

### Get a specific deployment
- **URL**: `/deployments/:id`
- **Method**: `GET`
- **Auth required**: Yes (Operator or Admin)
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "id": "UUID",
      "payloadId": "UUID",
      "deviceId": "UUID",
      "userId": "UUID",
      "status": "pending|connected|executing|completed|failed",
      "result": "object|null",
      "createdAt": "datetime",
      "updatedAt": "datetime",
      "payload": {
        "id": "UUID",
        "name": "string",
        "script": "string"
      },
      "device": {
        "id": "UUID",
        "name": "string",
        "status": "string"
      },
      "initiator": {
        "id": "UUID",
        "username": "string"
      }
    }
  }
  ```

### Get deployments for a device
- **URL**: `/deployments/device/:deviceId`
- **Method**: `GET`
- **Auth required**: Yes (Operator or Admin)
- **Response**: Similar to get all deployments, filtered for the specified device

### Get deployments for a payload
- **URL**: `/deployments/payload/:payloadId`
- **Method**: `GET`
- **Auth required**: Yes (Operator or Admin)
- **Response**: Similar to get all deployments, filtered for the specified payload

### Get deployments for current user
- **URL**: `/deployments/user/me`
- **Method**: `GET`
- **Auth required**: Yes
- **Response**: Similar to get all deployments, filtered for the current user

### Update deployment status
- **URL**: `/deployments/:id`
- **Method**: `PATCH`
- **Auth required**: Yes
- **Body**:
  ```json
  {
    "status": "pending|connected|executing|completed|failed",
    "result": "object" // Optional
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "id": "UUID",
      "status": "string",
      "updatedAt": "datetime"
    }
  }
  ```

## User Settings Endpoints

### Get user settings
- **URL**: `/users/settings`
- **Method**: `GET`
- **Auth required**: Yes
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "id": "UUID",
      "userId": "UUID",
      "theme": "dark|light|system",
      "notifications": "boolean",
      "dashboardLayout": "object",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  }
  ```

### Update user settings
- **URL**: `/users/settings`
- **Method**: `POST`
- **Auth required**: Yes
- **Body**:
  ```json
  {
    "theme": "dark|light|system",
    "notifications": "boolean",
    "dashboardLayout": "object"
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Settings updated successfully",
    "data": {
      "id": "UUID",
      "userId": "UUID",
      "theme": "string",
      "notifications": "boolean",
      "dashboardLayout": "object",
      "updatedAt": "datetime"
    }
  }
  ```

## System Endpoints

### Get API health
- **URL**: `/system/health`
- **Method**: `GET`
- **Auth required**: No
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "status": "online",
      "version": "string",
      "uptime": "number",
      "hostname": "string",
      "platform": "string",
      "cpuInfo": "string",
      "loadAvg": ["string"],
      "memory": {
        "used": "number",
        "total": "number",
        "percentage": "number"
      },
      "activeConnections": "number",
      "responseTime": "number",
      "cpuLoad": "number",
      "processes": {
        "pid": "number",
        "memoryUsage": "number"
      },
      "lastChecked": "datetime"
    }
  }
  ```

## WebSocket Architecture

PhantomHub uses a robust WebSocket architecture for real-time communication. This section documents the WebSocket flow, connection management, and key components.

### WebSocket Connection Flow

1. **Connection Initialization**:
   - The `ApiService` singleton initializes the Socket.IO connection when the application starts
   - Connection parameters include authentication, reconnection settings, and transport options
   - Authentication is performed using the JWT token stored in local storage

2. **Connection Management**:
   - The `ApiService` handles socket reconnection automatically
   - The `reconnectSocket()` method can be called to manually attempt reconnection
   - Connection events (connect, disconnect, error) are logged for debugging

3. **Socket Testing**:
   - The `ping_test` and `pong_test` events are used to verify WebSocket connectivity
   - The API Health Status component displays the WebSocket connection status

### ApiService (Socket Provider)

The `ApiService` class follows the singleton pattern and manages a single WebSocket connection for the entire application:

```typescript
class ApiService {
  private static instance: ApiService;
  private socket: Socket | null = null;
  
  // Private constructor prevents direct instantiation
  private constructor() {
    // Initialize socket connection
    this.initializeSocket();
  }
  
  // Static accessor for the singleton instance
  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }
  
  // Static accessor for the socket instance
  public static getSocket(): Socket | null {
    return ApiService.getInstance().socket;
  }
  
  // Method to reconnect the socket if disconnected
  public static reconnectSocket(): void {
    ApiService.getInstance().reconnectSocket();
  }
  
  // Initialize Socket.IO connection with proper authentication
  private initializeSocket(): void {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    this.socket = io(socketUrl, {
      reconnection: true,
      auth: { token: token },
      // Additional options...
    });
    
    this.setupSocketEventHandlers();
  }
  
  // Instance method to reconnect
  public reconnectSocket(): void {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    } else if (!this.socket) {
      this.initializeSocket();
    }
  }
}
```

### NotificationService (Socket Consumer)

The `NotificationService` class consumes the socket provided by `ApiService` and manages notification subscriptions:

```typescript
class NotificationService {
  private static instance: NotificationService;
  private socket: Socket | null = null;
  private subscribers: Map<string, Set<NotificationCallback>> = new Map();
  
  // Test the socket connection and emit a diagnostic event
  public async testSocketConnection(): Promise<boolean> {
    this.socket = getSocket(); // Get socket from ApiService
    
    if (!this.socket || !this.socket.connected) {
      ApiService.reconnectSocket();
      // Wait for connection or timeout...
    }
    
    // Emit test event
    this.emitTestEvent();
    return true;
  }
  
  // Private method to emit test event and handle response
  private emitTestEvent(): void {
    if (!this.socket) return;
    
    this.socket.emit('ping_test', { timestamp: new Date().toISOString() });
    
    this.socket.once('pong_test', (data) => {
      this.notifySubscribers('system_update', {
        type: 'socket_test',
        success: true,
        data
      });
    });
  }
  
  // Subscribe to notification type
  public subscribe(type: string, callback: NotificationCallback): void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)?.add(callback);
  }
  
  // Unsubscribe from notification type
  public unsubscribe(type: string, callback: NotificationCallback): void {
    this.subscribers.get(type)?.delete(callback);
  }
  
  // Notify all subscribers of a given type
  private notifySubscribers(type: string, data: any): void {
    this.subscribers.get(type)?.forEach(callback => {
      callback(data);
    });
  }
}
```

### API Health Status Component

The API Health Status component displays real-time information about the API server, including:
- Server status (online, offline, degraded)
- Database connection status
- Memory usage
- CPU load
- Active connections
- WebSocket connectivity

The component implements the following WebSocket testing flow:

1. When the user clicks "Test WebSocket":
   - The component sets the status to "testing"
   - Subscribes to the "system_update" event for test results
   - Calls `NotificationService.testSocketConnection()`

2. The `NotificationService` then:
   - Gets the socket from `ApiService`
   - Emits a "ping_test" event to the server
   - Sets up a listener for the "pong_test" response

3. When the backend responds:
   - The `NotificationService` receives the "pong_test" event
   - Notifies subscribers with the test result
   - The component updates the WebSocket status to "connected" or "failed"

4. Timeouts are implemented to handle:
   - Initial connection failure (5 seconds)
   - Server response failure (6 seconds) 

### Socket Utility Helper

A socket utility helper function is provided to access the socket instance from the ApiService:

```typescript
// socketUtils.ts
import apiServiceInstance, { ApiService } from '../services/ApiService';
import { Socket } from 'socket.io-client';

export function getSocket(): Socket | null {
  try {
    return ApiService.getSocket();
  } catch (error) {
    console.error('Error getting socket:', error);
    return null;
  }
}
```

This utility simplifies socket access throughout the application and ensures all components use the same socket instance.

## WebSocket Events

The API supports various WebSocket events for real-time communication. These events are divided into general events for business logic and diagnostic events for system monitoring.

### Connection
- **URL**: `ws://localhost:5001`
- **Auth**: JWT token passed in handshake auth object

### Business Logic Events

Events emitted by the server for application functionality:

#### device_status_changed
```json
{
  "id": "UUID",
  "status": "online|offline|error|maintenance"
}
```

#### payload_status_update
```json
{
  "deviceId": "UUID",
  "payloadId": "UUID|custom",
  "status": "executing|completed"
}
```

#### deployment_status_changed
```json
{
  "id": "UUID",
  "status": "pending|connected|executing|completed|failed",
  "result": "object|null"
}
```

### Diagnostic Events

Events used for system monitoring and testing:

#### Client to Server:
- **ping_test**: Sent to test WebSocket connectivity
  ```json
  {
    "timestamp": "ISO date string",
    "clientInfo": {
      "url": "current window location",
      "userAgent": "browser user agent"
    }
  }
  ```

#### Server to Client:
- **pong_test**: Server response to a ping_test
  ```json
  {
    "serverTime": "ISO date string",
    "receivedData": "original client data",
    "serverInfo": {
      "uptime": "server uptime in seconds",
      "activeConnections": "number of active socket connections",
      "nodeVersion": "Node.js version"
    }
  }
  ```

- **system_update**: Server-initiated system status updates
  ```json
  {
    "type": "status_update|resource_usage|socket_test",
    "timestamp": "ISO date string",
    "data": {
      "status": "online|degraded|offline",
      "memory": {
        "used": "number (MB)",
        "total": "number (MB)",
        "percentage": "number"
      },
      "cpuLoad": "number (%)",
      "activeConnections": "number"
    }
  }
  ```

## Error Responses

All endpoints return the following structure for errors:

```json
{
  "success": false,
  "message": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400`: Bad Request - The request was malformed
- `401`: Unauthorized - Authentication is required or token is invalid
- `403`: Forbidden - User doesn't have permission for the requested operation
- `404`: Not Found - The requested resource doesn't exist
- `500`: Internal Server Error - Something went wrong on the server 