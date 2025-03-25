import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import DeviceManagement from './pages/DeviceManagement';
import PayloadEditor from './pages/PayloadEditor';
import ResultsViewer from './pages/ResultsViewer';
import Settings from './pages/Settings';
import { useEffect, useState } from 'react';

// Create a simple authentication context
const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // For demo purposes, ensure there's always a token
    if (!localStorage.getItem('token')) {
      localStorage.setItem('token', 'demo-token');
    }
    
    // Check if user is logged in
    setInitialized(true);
  }, []);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="devices" element={<DeviceManagement />} />
          <Route path="payload-editor" element={<PayloadEditor />} />
          <Route path="results" element={<ResultsViewer />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
