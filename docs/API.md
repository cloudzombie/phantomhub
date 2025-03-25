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

## WebSocket Events

The API also supports real-time updates through WebSocket connections.

### Connection
- **URL**: `ws://localhost:5001`
- **Events emitted by server**:
  - `device_status_changed`: When a device's status changes
  - `payload_status_update`: When a payload's execution status changes
  - `deployment_status_changed`: When a deployment's status changes

### Event Payloads

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