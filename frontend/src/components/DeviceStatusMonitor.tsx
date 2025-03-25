/**
 * Device Status Monitor Component
 * 
 * Displays real-time status updates for O.MG Cable devices
 * using Socket.IO for live updates
 */

import React, { useEffect, useState, ReactNode } from 'react';
import { 
  FiServer, 
  FiWifi, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiClock, 
  FiActivity,
  FiXCircle
} from 'react-icons/fi';
import { Socket, io } from 'socket.io-client';
import ApiService from '../services/ApiService';
import logger from '../utils/logger';

// Helper functions
const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  batteryLevel?: number;
  signalStrength?: number;
  errors?: string[];
  [key: string]: unknown;
}

interface DeviceActivity {
  deviceId: string;
  timestamp: string;
  type: 'status_change' | 'error' | 'activity';
  message: string;
  details?: Record<string, unknown> | string | number | boolean | null;
}

interface DeviceStatusMonitorProps {
  deviceId: string;
  activeTab?: 'status' | 'activity';
  showStatusIndicator?: boolean;
  className?: string;
}

const DeviceStatusMonitor: React.FC<DeviceStatusMonitorProps> = ({
  deviceId,
  activeTab = 'status',
  showStatusIndicator = true,
  className = '',
}) => {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [activities, setActivities] = useState<DeviceActivity[]>([]);
  const [currentTab, setCurrentTab] = useState<'status' | 'activity'>(activeTab);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderDetails = (details: DeviceActivity['details']): ReactNode => {
    if (details === null || details === undefined) {
      return null;
    }
    
    try {
      const detailsString = typeof details === 'string' 
        ? details 
        : JSON.stringify(details, null, 2);
      return (
        <pre className="mt-1 text-xs overflow-x-auto">
          {detailsString}
        </pre>
      );
    } catch (error) {
      return <span className="text-xs text-red-500">Error rendering details</span>;
    }
  };

  useEffect(() => {
    // Initialize Socket.IO connection
    const token = localStorage.getItem('token');
    if (!token) {
      logger.error('No authentication token found');
      return;
    }

    const newSocket = io(
      process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001',
      {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      }
    );

    newSocket.on('connect', () => {
      logger.info('Connected to Socket.IO server');
      
      // Subscribe to device updates
      newSocket.emit('subscribe:device', deviceId);
    });

    newSocket.on('disconnect', () => {
      logger.warn('Disconnected from Socket.IO server');
    });

    // Listen for device status updates
    newSocket.on(`device:${deviceId}:status`, (newStatus: DeviceStatus) => {
      setStatus(newStatus);
      
      // Add to activity log
      const activity: DeviceActivity = {
        deviceId,
        timestamp: new Date().toISOString(),
        type: 'status_change',
        message: `Device status changed to ${newStatus.status}`,
        details: newStatus
      };
      setActivities(prev => [activity, ...prev].slice(0, 50)); // Keep last 50 activities
    });

    // Listen for device errors
    newSocket.on(`device:${deviceId}:error`, (error: { message: string; details?: unknown }) => {
      logger.error('Device error received:', error);
      
      // Add to activity log
      const activity: DeviceActivity = {
        deviceId,
        timestamp: new Date().toISOString(),
        type: 'error',
        message: error.message || 'Unknown error occurred',
        details: error
      };
      setActivities(prev => [activity, ...prev].slice(0, 50));
    });

    // Listen for device activities
    newSocket.on(`device:${deviceId}:activity`, (activity: DeviceActivity) => {
      setActivities(prev => [activity, ...prev].slice(0, 50));
    });

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.emit('unsubscribe:device', deviceId);
        newSocket.disconnect();
      }
    };
  }, [deviceId]);

  const getStatusIcon = () => {
    if (!status) return <FiActivity className="text-gray-400" />;
    
    switch (status.status) {
      case 'online':
        return <FiCheckCircle className="text-green-500" />;
      case 'offline':
        return <FiXCircle className="text-red-500" />;
      case 'error':
        return <FiAlertCircle className="text-yellow-500" />;
      default:
        return <FiActivity className="text-gray-400" />;
    }
  };

  // Render device activity log
  const renderActivityLog = () => {
    if (activities.length === 0) {
      return (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <FiActivity className="mr-2" />
          <span>No activity recorded yet</span>
        </div>
      );
    }

    return (
      <div className="space-y-2 py-2">
        {activities.map((activity, index) => (
          <div
            key={index}
            className={`p-2 rounded ${
              activity.type === 'error'
                ? 'bg-red-50 text-red-700'
                : activity.type === 'status_change'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-50 text-gray-700'
            }`}
          >
            <div className="flex justify-between text-sm">
              <span>{activity.message}</span>
              <span>{formatTimestamp(activity.timestamp)}</span>
            </div>
            {activity.details && (
              <div className="mt-1">
                {renderDetails(activity.details)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-600">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Device Status */}
      {status && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            {getStatusIcon()}
            <h3 className="text-lg font-semibold">
              Device Status: {status.status}
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Last Seen:</span>
              <span className="ml-2">{formatTimestamp(status.lastSeen)}</span>
            </div>
            {status.batteryLevel !== undefined && (
              <div>
                <span className="text-gray-600">Battery:</span>
                <span className="ml-2">{status.batteryLevel}%</span>
              </div>
            )}
            {status.signalStrength !== undefined && (
              <div>
                <span className="text-gray-600">Signal:</span>
                <span className="ml-2">{status.signalStrength}%</span>
              </div>
            )}
          </div>

          {status.errors && status.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-red-600 mb-2">Errors:</h4>
              <ul className="list-disc list-inside text-sm text-red-600">
                {status.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Activity Log */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Activity Log</h3>
        {renderActivityLog()}
      </div>
    </div>
  );
};

export default DeviceStatusMonitor; 