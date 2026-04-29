import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import ProtectedRoute from './features/auth/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import RoleBasedDashboard from './features/auth/RoleBasedDashboard';
import { InitiateHandoff } from './features/handoff/sender/InitiateHandoff';
import { AcceptHandoff } from './features/handoff/receiver/AcceptHandoff';
import TrackingPage from './features/tracking/TrackingPage';
import { UserRole } from './features/auth/roles';
import './index.css';

// Mock shipment used by handoff routes (replace with real fetch later)
const MOCK_SHIPMENT_SEND = {
  id: 'SHIP-001',
  origin: 'Pfizer Belgium',
  destination: 'DHL Cold Chain Hub',
  status: 'pending' as const,
  freshnessScore: 100,
  assignedTo: 'demo',
  documents: [
    { name: 'Temperature Log', hash: 'abc123def456ghi789', mimeType: 'application/json' },
    { name: 'Certificate of Origin', hash: 'ghi789jkl012mno345', mimeType: 'application/pdf' },
    { name: 'Phytosanitary Cert', hash: 'pqr678stu901vwx234', mimeType: 'application/pdf' },
  ],
  handoffChain: [],
  createdAt: Date.now() / 1000,
  updatedAt: Date.now() / 1000,
};

const MOCK_SHIPMENT_RECEIVE = {
  ...MOCK_SHIPMENT_SEND,
  status: 'in-transit' as const,
  freshnessScore: 94,
  origin: 'DHL Cold Chain Hub',
  destination: 'Mombasa General Hospital',
};

function InitiateHandoffPage() {
  const nav = React.useCallback(
    () => (window.history.length > 1 ? window.history.back() : null),
    [],
  );
  // We ignore route :id for now — uses mock shipment
  return <InitiateHandoff shipment={MOCK_SHIPMENT_SEND} onComplete={nav} />;
}

function AcceptHandoffPage() {
  const nav = React.useCallback(
    () => (window.history.length > 1 ? window.history.back() : null),
    [],
  );
  return <AcceptHandoff shipment={MOCK_SHIPMENT_RECEIVE} onComplete={nav} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Role-based home */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleBasedDashboard />
              </ProtectedRoute>
            }
          />

          {/* Handoff — sender (Manufacturer or Carrier) */}
          <Route
            path="/handoff/send/:id"
            element={
              <ProtectedRoute allowedRoles={[UserRole.MANUFACTURER, UserRole.CARRIER]}>
                <InitiateHandoffPage />
              </ProtectedRoute>
            }
          />

          {/* Handoff — receiver (Carrier or Receiver) */}
          <Route
            path="/handoff/receive/:id"
            element={
              <ProtectedRoute allowedRoles={[UserRole.CARRIER, UserRole.RECEIVER]}>
                <AcceptHandoffPage />
              </ProtectedRoute>
            }
          />

          {/* Tracking Map (All Roles) */}
          <Route
            path="/tracking"
            element={
              <ProtectedRoute>
                <TrackingPage />
              </ProtectedRoute>
            }
          />

          {/* Old /manufacturer, /carrier, /receiver, /regulator paths → dashboard */}
          <Route path="/manufacturer" element={<Navigate to="/dashboard" replace />} />
          <Route path="/carrier"      element={<Navigate to="/dashboard" replace />} />
          <Route path="/receiver"     element={<Navigate to="/dashboard" replace />} />
          <Route path="/regulator"    element={<Navigate to="/dashboard" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
