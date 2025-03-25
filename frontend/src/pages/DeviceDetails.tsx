import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiRefreshCw, FiServer, FiAlertTriangle } from 'react-icons/fi';
import ApiService from '../services/ApiService';
import DeviceInfoPanel from '../components/DeviceInfoPanel';
import DeviceActivityLog from '../components/DeviceActivityLog';
import AlertSystem from '../components/AlertSystem';

interface Device {
  id: string;
  name: string;
  status: string;
  connectionType: string;
  ipAddress: string;
  serialPortId?: string;
  firmwareVersion?: string;
  lastCheckIn?: string;
  userId: string;
  owner?: {
    id: string;
    name: string;
    username: string;
  };
}

const DeviceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeviceDetails();
  }, [id]);

  const fetchDeviceDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await ApiService.get(`/devices/${id}`);
      
      if (response.success) {
        setDevice(response.data);
        setError(null);
      } else {
        setError(response.message || 'Failed to load device details');
      }
    } catch (err) {
      setError('An error occurred while fetching device details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshDevice = () => {
    fetchDeviceDetails();
  };

  const goBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-slate-900">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="p-6 min-h-screen bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={goBack}
            className="mb-6 flex items-center text-slate-400 hover:text-white"
          >
            <FiArrowLeft className="mr-2" size={16} />
            Back to Devices
          </button>
          
          <div className="bg-slate-800 border border-slate-700 rounded-md p-6 flex flex-col items-center">
            <FiAlertTriangle size={48} className="text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Error Loading Device</h2>
            <p className="text-slate-400 mb-4">{error || 'Device not found'}</p>
            <button
              onClick={refreshDevice}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md flex items-center"
            >
              <FiRefreshCw size={16} className="mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goBack}
            className="flex items-center text-slate-400 hover:text-white"
          >
            <FiArrowLeft className="mr-2" size={16} />
            Back to Devices
          </button>
          
          <button
            onClick={refreshDevice}
            className="p-2 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
            title="Refresh"
          >
            <FiRefreshCw size={18} />
          </button>
        </div>
        
        <div className="flex items-center mb-4">
          <div className={`w-2 h-2 rounded-full mr-3 ${
            device.status === 'online' ? 'bg-green-500' : 
            device.status === 'busy' ? 'bg-orange-500' : 'bg-red-500'
          }`}></div>
          <h1 className="text-2xl font-bold text-white">{device.name}</h1>
        </div>
        
        <p className="text-slate-400 mb-6 flex items-center">
          <FiServer size={14} className="mr-2" />
          {device.connectionType === 'network' ? device.ipAddress : 'USB Connection'} 
          {device.connectionType === 'usb' && device.serialPortId && ` (${device.serialPortId})`}
        </p>
        
        {/* Device Info Panel */}
        <DeviceInfoPanel 
          deviceInfo={{
            id: device.id,
            name: device.name,
            connectionType: device.connectionType,
            ipAddress: device.ipAddress,
            serialPortId: device.serialPortId,
            firmwareVersion: device.firmwareVersion,
            connectionStatus: device.status === 'online' ? 'connected' : 'disconnected'
          }} 
          onRefresh={refreshDevice} 
        />
        
        {/* Device Activity Log */}
        <div className="mt-6">
          <DeviceActivityLog deviceId={id || ''} maxHeight="600px" />
        </div>
        
        {/* Alert System */}
        <AlertSystem maxAlerts={10} />
      </div>
    </div>
  );
};

export default DeviceDetails; 