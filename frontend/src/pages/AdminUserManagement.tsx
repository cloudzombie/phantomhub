import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
// Import directly from the absolute path to avoid module resolution issues
import { API_URL } from '../config.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { getToken } from '../utils/tokenManager';

// Component imports
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';

// Types for user data
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
}

const AdminUserManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch users with retry logic for rate limiting
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    
    // Add exponential backoff retry logic for rate limiting
    const fetchWithRetry = async (url: string, options: any, retries = 3, delay = 2000) => {
      try {
        return await axios.get(url, options);
      } catch (error: any) {
        if (error.response && error.response.status === 429 && retries > 0) {
          console.log(`Rate limited, retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw error;
      }
    };
    
    const fetchUsers = async () => {
      try {
        if (isMounted) setLoading(true);
        setError(null); // Clear any previous errors
        
        const token = getToken();
        console.log('Fetching users with token:', token ? 'Token exists' : 'No token');
        
        // Use fetchWithRetry to handle rate limiting
        const response = await fetchWithRetry(`${API_URL}/admin/users`, {
          params: {
            page,
            limit: 10,
            search: searchTerm || undefined,
            role: filterRole !== 'all' ? filterRole : undefined
          },
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal,
          timeout: 15000 // Increased timeout to 15 seconds
        }, 3, 2000);
        
        if (response.data.success && isMounted) {
          setUsers(response.data.data.users || []);
          setTotalPages(response.data.data.totalPages || 1);
          console.log('Users loaded successfully:', response.data.data.users?.length || 0, 'users');
        } else if (isMounted) {
          setError('Failed to fetch users: ' + (response.data.message || 'Unknown error'));
          console.error('API error:', response.data);
        }
      } catch (err: any) {
        if (isMounted) {
          if (err.response && err.response.status === 429) {
            console.error('Rate limit exceeded. Please try again later.');
            setError('Rate limit exceeded. Please try again in a few minutes.');
          } else if (err.response && err.response.status === 404) {
            console.error('Users endpoint not found');
            setError('User management endpoint not available. The server may need to be updated.');
          } else {
            console.error('Error fetching users:', err);
            setError(err.message || 'Error connecting to the server');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
        setError('Loading timed out. The server might be unavailable.');
        console.error('Loading timed out after 15 seconds');
      }
    }, 15000);
    
    if (user && user.role === 'admin') {
      fetchUsers();
    } else if (isMounted) {
      setLoading(false);
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
      console.log('AdminUserManagement data fetching cleanup');
    };
  }, [user, page, searchTerm, filterRole, loading]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Create new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/admin/users`,
        formData,
        { 
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        // Reset form and refresh user list
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'user'
        });
        setShowCreateForm(false);
        
        // Refresh user list
        setPage(1);
        const token = getToken();
        const refreshResponse = await axios.get(`${API_URL}/admin/users`, {
          params: { page: 1, limit: 10 },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (refreshResponse.data.success) {
          setUsers(refreshResponse.data.data.users);
          setTotalPages(refreshResponse.data.data.totalPages);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
      console.error('Error creating user:', err);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_URL}/admin/users/${userId}`,
        { 
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        // Remove user from list
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  // Change user role
  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/admin/users/${userId}/role`,
        { role: newRole },
        { 
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        // Update user in list
        setUsers(users.map(u => 
          u.id === userId ? { ...u, role: newRole } : u
        ));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change user role');
      console.error('Error changing user role:', err);
    }
  };

  // Reset user password
  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Enter new password for user:');
    if (!newPassword) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/admin/users/${userId}/reset-password`,
        { password: newPassword },
        { 
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        alert('Password reset successfully');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
      console.error('Error resetting password:', err);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">User Management</h1>
        <div>
          <Button onClick={() => navigate('/admin')} variant="secondary" className="mr-2">
            Back to Dashboard
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : 'Create User'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 relative" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="absolute top-2 right-2 text-red-500"
            aria-label="Close"
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}

      {/* Create User Form */}
      {showCreateForm && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Create New User</h2>
          <form onSubmit={handleCreateUser}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="user">User</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit">Create User</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search and Filter */}
      <Card className="mb-8 p-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <Button type="submit">Search</Button>
          </div>
        </form>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users && users.length > 0 ? users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      className="text-sm p-1 border rounded"
                    >
                      <option value="user">User</option>
                      <option value="operator">Operator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleResetPassword(user.id)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {loading ? 'Loading users...' : error ? 'Error loading users' : 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex justify-between items-center border-t">
            <div>
              Page {page} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="secondary"
              >
                Previous
              </Button>
              <Button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="secondary"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminUserManagement;
