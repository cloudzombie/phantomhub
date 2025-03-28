import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { getToken } from '../utils/tokenManager';
import debounce from 'lodash/debounce';
import { apiService } from '../services/ApiService';

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
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const FETCH_COOLDOWN = 2000; // 2 seconds cooldown between fetches

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Memoize the fetch function to prevent recreating it on every render
  const fetchUsers = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchTime < FETCH_COOLDOWN) {
      console.log('Skipping fetch, too soon since last fetch');
      return;
    }
    
    setLastFetchTime(now);
    
    try {
      setLoading(true);
      setError(null);
      
      // Use ApiService instead of direct axios calls
      const response = await apiService.get('/admin/users', {
        params: {
          page,
          limit: 10,
          search: searchTerm || undefined,
          role: filterRole !== 'all' ? filterRole : undefined
        }
      });
      
      if (response.success) {
        const userData = response.data.users || [];
        // Ensure the current admin user is always included
        if (user && !userData.find(u => u.id === user.id)) {
          userData.unshift(user);
        }
        setUsers(userData);
        setTotalPages(response.data.totalPages || 1);
      } else {
        setError('Failed to fetch users: ' + (response.message || 'Unknown error'));
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Rate limit exceeded. Please try again in a few minutes.');
      } else if (err.response?.status === 404) {
        setError('User management endpoint not available.');
      } else {
        setError(err.message || 'Error connecting to the server');
      }
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterRole, lastFetchTime, user]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setSearchTerm(term);
      setPage(1);
    }, 500),
    []
  );

  // Fetch users when dependencies change
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
    
    return () => {
      debouncedSearch.cancel();
    };
  }, [user, fetchUsers]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Create new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiService.post('/admin/users', formData);
      
      if (response.success) {
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
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
      console.error('Error creating user:', err);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    // Prevent deleting the current admin user
    if (userId === user?.id) {
      setError("You cannot delete your own admin account");
      return;
    }

    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    try {
      const response = await apiService.delete(`/admin/users/${userId}`);
      
      if (response.success) {
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
    // Prevent changing own role
    if (userId === user?.id) {
      setError("You cannot change your own admin role");
      return;
    }

    try {
      const response = await apiService.put(`/admin/users/${userId}/role`, { role: newRole });
      
      if (response.success) {
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
      const response = await apiService.put(`/admin/users/${userId}/reset-password`, { 
        password: newPassword 
      });
      
      if (response.success) {
        alert('Password reset successfully');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
      console.error('Error resetting password:', err);
    }
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
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search by name or email"
              onChange={(e) => debouncedSearch(e.target.value)}
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
        </div>
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
