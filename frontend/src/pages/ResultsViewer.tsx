import { useState, useEffect } from 'react';
import { FiDownload, FiRefreshCw, FiFileText, FiInfo, FiAlertCircle, FiServer } from 'react-icons/fi';
import axios from 'axios';
import { handleAuthError, isAuthError } from '../utils/tokenManager';

const API_URL = 'https://ghostwire-backend-e0380bcf4e0e.herokuapp.com/api';

interface DeploymentResult {
  id: number;
  deviceId: number;
  payloadId: number;
  status: string;
  result: string | null;
  createdAt: string;
  device?: {
    id: number;
    name: string;
    ipAddress: string;
    status: string;
  };
  payload?: {
    id: number;
    name: string;
    description: string;
  };
}

const ResultsViewer = () => {
  const [results, setResults] = useState<DeploymentResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    fetchResults();
  }, []);
  
  const fetchResults = async () => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        window.location.href = '/login';
        return;
      }
      
      const response = await axios.get(`${API_URL}/deployments`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data?.success) {
        setResults(response.data.data || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      
      // If we get a 401, handle auth error without removing token
      if (isAuthError(error)) {
        handleAuthError(error, 'Authentication error while fetching results');
      }
      // Handle 500 errors gracefully - likely due to empty collections
      else if (axios.isAxiosError(error) && error.response?.status === 500) {
        console.log('No deployment results available yet - setting empty array');
        setResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const exportResults = () => {
    try {
      // Create JSON file for download
      const jsonData = JSON.stringify(results, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `omg_results_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results');
    }
  };
  
  // Export as CSV
  const exportAsCSV = () => {
    try {
      // Create CSV content
      const headers = ['ID', 'Device', 'Payload', 'Status', 'Timestamp', 'Result'];
      
      const csvRows = results.map(result => [
        result.id,
        result.device?.name || `Device #${result.deviceId}`,
        result.payload?.name || `Payload #${result.payloadId}`,
        result.status,
        new Date(result.createdAt).toLocaleString(),
        result.result || 'No data'
      ].join(','));
      
      const csvContent = [headers.join(','), ...csvRows].join('\n');
      
      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `omg_results_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export as CSV');
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Completed</span>;
      case 'executing':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">Executing</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Failed</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Pending</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">{status}</span>;
    }
  };
  
  // Format date/time to be more readable
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  return (
    <div className="p-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Results Viewer</h1>
        <p className="text-sm text-slate-400">View captured data and execution results from your deployed payloads</p>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button 
          onClick={fetchResults}
          className="inline-flex items-center px-3 py-2 text-sm font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50 rounded hover:bg-slate-700 transition-colors"
          disabled={isLoading}
        >
          <FiRefreshCw className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} size={16} />
          Refresh
        </button>
        
        <button 
          onClick={exportResults}
          className="inline-flex items-center px-3 py-2 text-sm font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50 rounded hover:bg-slate-700 transition-colors"
          disabled={results.length === 0}
        >
          <FiDownload className="mr-2" size={16} />
          Export JSON
        </button>
        
        <button 
          onClick={exportAsCSV}
          className="inline-flex items-center px-3 py-2 text-sm font-medium bg-green-500/10 text-green-500 border border-green-500/30 rounded hover:bg-green-500/20 transition-colors"
          disabled={results.length === 0}
        >
          <FiDownload className="mr-2" size={16} />
          Export CSV
        </button>
      </div>
      
      {isLoading ? (
        <div className="p-6 text-center text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500 mb-2"></div>
          </div>
          <p>Loading results...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="p-6 text-center text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
          <FiInfo className="mx-auto mb-2" size={20} />
          <p className="text-sm">No results found. Deploy payloads to see results here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map(result => (
            <div key={result.id} className="bg-slate-800 border border-slate-700 rounded-md shadow-sm overflow-hidden">
              <div className="border-b border-slate-700 px-4 py-3">
                <div className="flex justify-between items-center">
                  <h2 className="font-medium text-white flex items-center">
                    <FiFileText className="mr-2 text-green-500" size={16} />
                    {result.payload?.name || `Payload #${result.payloadId}`}
                  </h2>
                  {getStatusBadge(result.status)}
                </div>
                <div className="mt-2 flex justify-between items-center text-xs">
                  <div className="flex items-center text-slate-400">
                    <FiServer className="mr-1" size={12} />
                    <span>{result.device?.name || `Device #${result.deviceId}`}</span>
                  </div>
                  <span className="text-slate-500">{formatDateTime(result.createdAt)}</span>
                </div>
              </div>
              
              <div className="p-4">
                {result.result ? (
                  <div 
                    className="p-3 bg-slate-900/50 border border-slate-700 rounded font-mono text-sm whitespace-pre-wrap text-slate-300 overflow-auto max-h-[300px]"
                  >
                    {result.result}
                  </div>
                ) : (
                  <div className="p-4 flex items-center justify-center text-slate-500">
                    <FiAlertCircle className="mr-2" size={16} />
                    <span className="text-sm italic">No result data available</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultsViewer; 