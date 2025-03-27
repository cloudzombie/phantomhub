import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';

const AdminNotFound: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card className="p-8 text-center">
        <div className="flex justify-center mb-6">
          <FiAlertTriangle size={48} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Admin Page Not Found</h1>
        <p className="text-gray-500 mb-6">
          The admin page you're looking for doesn't exist or you don't have permission to access it.
        </p>
        <div className="flex justify-center">
          <Link to="/admin">
            <Button variant="primary" leftIcon={<FiArrowLeft />}>
              Return to Admin Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default AdminNotFound;
