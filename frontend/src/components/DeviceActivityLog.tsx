/**
 * Device Activity Log Component
 * 
 * Displays detailed activity logs for a device with filtering capabilities
 * and real-time updates
 */

import React, { useState, useEffect } from 'react';
import { FiActivity, FiAlertCircle, FiCheckCircle, FiFilter, FiX, FiDownload, FiChevronDown, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';
import { apiService } from '../services/ApiService';
import { getSocket } from '../utils/socketUtils';

export interface DeviceActivity {
  id: string;
  deviceId: string;
  type: 'connection' | 'disconnection' | 'firmware_update' | 'error' | 'command' | 'status_change';
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
  userId?: string;
  userName?: string;
}

interface DeviceActivityLogProps {
  deviceId: string;
  maxHeight?: string;
  showFilters?: boolean;
  title?: string;
  limit?: number;
}

const DeviceActivityLog: React.FC<DeviceActivityLogProps> = ({
  deviceId,
  maxHeight = '500px',
  showFilters = true,
  title = 'Device Activity Log',
  limit = 50
}) => {
  const [activities, setActivities] = useState<DeviceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    types: string[];
    dateFrom?: Date;
    dateTo?: Date;
  }>({
    types: ['connection', 'disconnection', 'firmware_update', 'error', 'command', 'status_change']
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  // Fetch initial activities
  useEffect(() => {
    fetchActivities();
    
    // Set up socket listener for real-time updates
    const socket = getSocket();
    
    if (socket) {
      // Subscribe to device-specific activity channel
      socket.emit('subscribe:device', deviceId);
      
      // Listen for activities
      socket.on(`device:${deviceId}:activity`, handleNewActivity);
    }
    
    return () => {
      if (socket) {
        socket.off(`device:${deviceId}:activity`);
        socket.emit('unsubscribe:device', deviceId);
      }
    };
  }, [deviceId]);

  // Re-fetch when filters change
  useEffect(() => {
    fetchActivities();
  }, [filters, deviceId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      // Build query parameters based on filters
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      
      if (filters.types.length < 6) { // Only add if not all types are selected
        filters.types.forEach(type => {
          queryParams.append('types', type);
        });
      }
      
      if (filters.dateFrom) {
        queryParams.append('dateFrom', filters.dateFrom.toISOString());
      }
      
      if (filters.dateTo) {
        queryParams.append('dateTo', filters.dateTo.toISOString());
      }
      
      const response = await apiService.get(`/devices/${deviceId}/activities?${queryParams.toString()}`);
      
      if (response.success) {
        setActivities(response.data);
      } else {
        console.error('Error fetching device activities:', response.message);
      }
    } catch (error) {
      console.error('Error fetching device activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewActivity = (activity: DeviceActivity) => {
    if (!realTimeUpdates) return;
    
    // Check if the activity matches our current filters
    if (!filters.types.includes(activity.type)) return;
    
    if (filters.dateFrom && new Date(activity.createdAt) < filters.dateFrom) return;
    
    if (filters.dateTo && new Date(activity.createdAt) > filters.dateTo) return;
    
    // Add new activity to the list
    setActivities(prev => [activity, ...prev].slice(0, limit));
  };

  const toggleFilter = (type: string) => {
    setFilters(prev => {
      const types = [...prev.types];
      const index = types.indexOf(type);
      
      if (index === -1) {
        types.push(type);
      } else {
        types.splice(index, 1);
      }
      
      return { ...prev, types };
    });
  };

  const resetFilters = () => {
    setFilters({
      types: ['connection', 'disconnection', 'firmware_update', 'error', 'command', 'status_change']
    });
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm:ss a');
    } catch (e) {
      return dateString;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'connection':
        return <FiCheckCircle className="text-green-500" />;
      case 'disconnection':
        return <FiX className="text-red-500" />;
      case 'firmware_update':
        return <FiActivity className="text-blue-500" />;
      case 'error':
        return <FiAlertCircle className="text-yellow-500" />;
      case 'command':
        return <FiActivity className="text-purple-500" />;
      case 'status_change':
        return <FiActivity className="text-cyan-500" />;
      default:
        return <FiActivity className="text-gray-500" />;
    }
  };

  const getActivityClass = (type: string) => {
    switch (type) {
      case 'connection':
        return 'border-green-600/30 bg-green-600/10';
      case 'disconnection':
        return 'border-red-600/30 bg-red-600/10';
      case 'firmware_update':
        return 'border-blue-600/30 bg-blue-600/10';
      case 'error':
        return 'border-yellow-600/30 bg-yellow-600/10';
      case 'command':
        return 'border-purple-600/30 bg-purple-600/10';
      case 'status_change':
        return 'border-cyan-600/30 bg-cyan-600/10';
      default:
        return 'border-slate-600/30 bg-slate-600/10';
    }
  };

  const downloadActivityLog = () => {
    try {
      // Create CSV content
      let csvContent = 'Timestamp,Type,Description,User\n';
      
      activities.forEach(activity => {
        const timestamp = formatDateTime(activity.createdAt);
        const type = activity.type;
        const description = `"${activity.description.replace(/"/g, '""')}"`;
        const user = activity.userName || 'System';
        
        csvContent += `${timestamp},${type},${description},${user}\n`;
      });
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `device-${deviceId}-activity-log.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading activity log:', error);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-md shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h2 className="font-medium text-white flex items-center">
          <FiActivity className="mr-2 text-blue-500" size={16} />
          {title}
        </h2>
        
        <div className="flex items-center space-x-2">
          {showFilters && (
            <div className="relative">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center text-xs font-medium"
              >
                <FiFilter size={14} className="mr-1" />
                Filter
                <FiChevronDown size={14} className="ml-1" />
              </button>
              
              {showFilterPanel && (
                <div className="absolute right-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-10">
                  <div className="p-3 border-b border-slate-700">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-white">Filter Activities</h3>
                      <button
                        onClick={resetFilters}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-slate-400 mb-2">Activity Types</h4>
                      <div className="space-y-1">
                        {['connection', 'disconnection', 'firmware_update', 'error', 'command', 'status_change'].map((type) => (
                          <label 
                            key={type} 
                            className="flex items-center text-sm text-slate-300 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="mr-2 rounded border-slate-600"
                              checked={filters.types.includes(type)}
                              onChange={() => toggleFilter(type)}
                            />
                            {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-slate-400 mb-2">Real-time Updates</h4>
                      <label className="flex items-center text-sm text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mr-2 rounded border-slate-600"
                          checked={realTimeUpdates}
                          onChange={() => setRealTimeUpdates(!realTimeUpdates)}
                        />
                        Show new activities
                      </label>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 mb-2">Date Range (coming soon)</h4>
                      <div className="text-xs text-slate-400">
                        Date filtering will be available in a future update
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={downloadActivityLog}
            className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
            title="Download Activity Log"
          >
            <FiDownload size={14} />
          </button>
          
          <button
            onClick={fetchActivities}
            className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
            title="Refresh"
          >
            <FiActivity size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      <div style={{ maxHeight }} className="overflow-y-auto">
        {loading && activities.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <FiActivity size={24} className="text-blue-500 animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="flex justify-center mb-2">
              <FiClock size={24} />
            </div>
            <p>No activity records found</p>
            <p className="text-xs mt-1">Try changing your filters or check back later</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {activities.map((activity) => (
              <div 
                key={activity.id}
                className={`px-4 py-3 border-l-2 ${getActivityClass(activity.type)}`}
              >
                <div className="flex items-start">
                  <div className="mt-0.5 mr-3">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">{activity.description}</div>
                    <div className="flex items-center mt-1 text-xs text-slate-400">
                      <span className="mr-2">{formatDateTime(activity.createdAt)}</span>
                      <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full text-xxs">
                        {activity.type.replace('_', ' ')}
                      </span>
                      {activity.userName && (
                        <span className="ml-2">by {activity.userName}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="mt-2 ml-7 text-xs">
                    <div className="bg-slate-700/30 rounded p-2 font-mono text-slate-300 overflow-x-auto">
                      {JSON.stringify(activity.metadata, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceActivityLog; 