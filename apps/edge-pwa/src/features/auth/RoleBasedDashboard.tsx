import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { UserRole } from './roles';
import ManufacturerDashboard from '../dashboards/ManufacturerDashboard';
import CarrierDashboard from '../dashboards/CarrierDashboard';
import ReceiverDashboard from '../dashboards/ReceiverDashboard';
import RegulatorDashboard from '../dashboards/RegulatorDashboard';

export default function RoleBasedDashboard() {
  const { isAuthenticated, userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" style={{ borderColor: 'var(--gray-300)', borderTopColor: 'var(--emerald)', width: '2rem', height: '2rem' }} />
        Loading your workspace…
      </div>
    );
  }

  if (!isAuthenticated || !userRole) return <Navigate to="/login" replace />;

  switch (userRole) {
    case UserRole.MANUFACTURER: return <ManufacturerDashboard />;
    case UserRole.CARRIER:      return <CarrierDashboard />;
    case UserRole.RECEIVER:     return <ReceiverDashboard />;
    case UserRole.REGULATOR:    return <RegulatorDashboard />;
    default:                    return <Navigate to="/login" replace />;
  }
}
