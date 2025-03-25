/**
 * AlertSystem Component
 * 
 * Provides a centralized system for displaying alerts and notifications
 * about device status changes and other important events.
 */

import React, { useEffect, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiXCircle, FiX } from 'react-icons/fi';
import NotificationService from '../services/NotificationService';

export interface Alert {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  source?: 'device_status' | 'deployment' | 'system_update' | 'security';
  deviceId?: string;
  autoClose?: boolean;
}

interface AlertSystemProps {
  maxAlerts?: number;
}

const AlertSystem: React.FC<AlertSystemProps> = ({ maxAlerts = 5 }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const notificationService = NotificationService.getInstance();

    // Subscribe to device status notifications
    const deviceStatusHandler = (data: any) => {
      if (!data || !data.deviceId) return;
      
      const deviceName = data.deviceName || data.deviceId;
      let alert: Alert;
      
      switch (data.status) {
        case 'online':
          alert = {
            id: `device-${data.deviceId}-${Date.now()}`,
            type: 'success',
            title: 'Device Online',
            message: `${deviceName} is now online`,
            timestamp: new Date(),
            read: false,
            source: 'device_status',
            deviceId: data.deviceId,
            autoClose: true
          };
          break;
        case 'offline':
          alert = {
            id: `device-${data.deviceId}-${Date.now()}`,
            type: 'error',
            title: 'Device Offline',
            message: `${deviceName} is now offline`,
            timestamp: new Date(),
            read: false,
            source: 'device_status',
            deviceId: data.deviceId
          };
          break;
        case 'error':
          alert = {
            id: `device-${data.deviceId}-${Date.now()}`,
            type: 'warning',
            title: 'Device Error',
            message: `${deviceName} is reporting an error: ${data.errorMessage || 'Unknown error'}`,
            timestamp: new Date(),
            read: false,
            source: 'device_status',
            deviceId: data.deviceId
          };
          break;
        default:
          alert = {
            id: `device-${data.deviceId}-${Date.now()}`,
            type: 'info',
            title: 'Device Status Change',
            message: `${deviceName} status changed to ${data.status}`,
            timestamp: new Date(),
            read: false,
            source: 'device_status',
            deviceId: data.deviceId,
            autoClose: true
          };
      }
      
      addAlert(alert);
      
      // Show browser notification if supported
      if (Notification.permission === 'granted') {
        notificationService.showBrowserNotification(alert.title, {
          body: alert.message,
          icon: '/logo192.png'
        });
      }
    };

    // Subscribe to deployment notifications
    const deploymentHandler = (data: any) => {
      if (!data) return;
      
      let alert: Alert;
      
      if (data.status === 'executing') {
        alert = {
          id: `deployment-${data.id || Date.now()}`,
          type: 'info',
          title: 'Deployment Started',
          message: `Payload "${data.payloadName || 'Unknown'}" is now executing`,
          timestamp: new Date(),
          read: false,
          source: 'deployment',
          deviceId: data.deviceId,
          autoClose: true
        };
      } else if (data.status === 'completed') {
        alert = {
          id: `deployment-${data.id || Date.now()}`,
          type: 'success',
          title: 'Deployment Completed',
          message: `Payload "${data.payloadName || 'Unknown'}" completed successfully`,
          timestamp: new Date(),
          read: false,
          source: 'deployment',
          deviceId: data.deviceId,
          autoClose: true
        };
      } else if (data.status === 'failed') {
        alert = {
          id: `deployment-${data.id || Date.now()}`,
          type: 'error',
          title: 'Deployment Failed',
          message: `Payload "${data.payloadName || 'Unknown'}" failed: ${data.errorMessage || 'Unknown error'}`,
          timestamp: new Date(),
          read: false,
          source: 'deployment',
          deviceId: data.deviceId
        };
      } else {
        alert = {
          id: `deployment-${data.id || Date.now()}`,
          type: 'info',
          title: 'Deployment Update',
          message: `Payload "${data.payloadName || 'Unknown'}" status: ${data.status}`,
          timestamp: new Date(),
          read: false,
          source: 'deployment',
          deviceId: data.deviceId,
          autoClose: true
        };
      }
      
      addAlert(alert);
    };

    // Subscribe to notifications
    notificationService.subscribe('device_status', deviceStatusHandler);
    notificationService.subscribe('deployment', deploymentHandler);

    // Clean up on unmount
    return () => {
      notificationService.unsubscribe('device_status', deviceStatusHandler);
      notificationService.unsubscribe('deployment', deploymentHandler);
    };
  }, []);

  useEffect(() => {
    // Auto-close alerts marked with autoClose after 5 seconds
    const autoCloseTimers = alerts
      .filter(alert => alert.autoClose && !alert.read)
      .map(alert => {
        return setTimeout(() => {
          markAsRead(alert.id);
        }, 5000);
      });

    return () => {
      autoCloseTimers.forEach(timer => clearTimeout(timer));
    };
  }, [alerts]);

  const addAlert = (alert: Alert) => {
    setAlerts(prevAlerts => {
      // Keep only the most recent alerts up to maxAlerts
      const updatedAlerts = [alert, ...prevAlerts].slice(0, maxAlerts);
      return updatedAlerts;
    });
  };

  const markAsRead = (id: string) => {
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => 
        alert.id === id ? { ...alert, read: true } : alert
      )
    );
  };

  const clearAll = () => {
    setAlerts([]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <FiXCircle className="text-red-500" size={20} />;
      case 'warning':
        return <FiAlertCircle className="text-yellow-500" size={20} />;
      case 'info':
      default:
        return <FiInfo className="text-blue-500" size={20} />;
    }
  };

  const unreadCount = alerts.filter(alert => !alert.read).length;

  return (
    <div className="fixed right-4 bottom-4 z-50">
      {/* Toast notifications */}
      <div className="space-y-2 mb-4">
        {alerts.filter(alert => !alert.read).map(alert => (
          <div 
            key={alert.id}
            className={`flex items-start p-3 rounded-lg shadow-lg max-w-md text-white ${
              alert.type === 'success' ? 'bg-green-600' :
              alert.type === 'error' ? 'bg-red-600' :
              alert.type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
            }`}
          >
            <div className="mr-3 pt-0.5">
              {getAlertIcon(alert.type)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{alert.title}</h3>
              <p className="text-sm">{alert.message}</p>
              <div className="text-xs mt-1 opacity-80">{formatTime(alert.timestamp)}</div>
            </div>
            <button 
              onClick={() => markAsRead(alert.id)}
              className="text-white opacity-80 hover:opacity-100"
            >
              <FiX size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Toggle button with notification count */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="bg-slate-800 text-white p-3 rounded-full shadow-lg relative"
      >
        <FiAlertCircle size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Alert panel */}
      {showPanel && (
        <div className="absolute bottom-16 right-0 w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700 p-3">
            <h3 className="font-medium text-white">Notifications</h3>
            <button 
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear All
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {alerts.map(alert => (
                  <div 
                    key={alert.id}
                    className={`p-3 text-sm ${alert.read ? 'opacity-60' : ''}`}
                  >
                    <div className="flex">
                      <div className="mr-3 pt-0.5">
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{alert.title}</h4>
                        <p className="text-slate-300">{alert.message}</p>
                        <div className="text-xs mt-1 text-slate-400">{formatTime(alert.timestamp)}</div>
                      </div>
                      {!alert.read && (
                        <button 
                          onClick={() => markAsRead(alert.id)}
                          className="text-slate-400 hover:text-white"
                        >
                          <FiX size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertSystem; 