import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import AdminDashboard from './admin/AdminDashboard';
import InstructorDashboard from './instructor/InstructorDashboard';
import CandidateDashboard from './candidate/CandidateDashboard';
import Spinner from '../components/atoms/Spinner/Spinner';

export const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
        <Spinner tip="Verifying login status..." />
      </div>
    );
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'instructor':
      return <InstructorDashboard />;
    case 'candidate':
      return <CandidateDashboard />;
    default:
      return <div>Access denied: invalid role configuration.</div>;
  }
};

export default Dashboard;
