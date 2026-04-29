import React, { useState } from 'react';
import { Shipment } from '@veritaschain/types';
import { ShipmentCard } from './ShipmentCard';
import { useAuth } from '../auth/AuthContext';
import { useShipments } from './useShipments';
import { useNavigate } from 'react-router-dom';

export const ShipmentList: React.FC = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const userId = authState.user?.did || '';
  const { shipments, loading, error } = useShipments(userId);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  if (!authState.isAuthenticated) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        <div className="empty-title">Not Authenticated</div>
        <div className="empty-desc">Please log in to view your shipments.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" style={{ borderColor: 'var(--gray-300)', borderTopColor: 'var(--emerald)' }} />
        Loading shipments…
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ marginTop: '1rem' }}>
        ⚠ {error}
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">My Shipments</div>
      <div className="page-subtitle">
        {shipments.length} shipment{shipments.length !== 1 ? 's' : ''} assigned to you
      </div>

      {shipments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <div className="empty-title">No Shipments</div>
          <div className="empty-desc">No shipments are currently assigned to you.</div>
        </div>
      ) : (
        <div className="shipment-grid">
          {shipments.map(shipment => (
            <ShipmentCard
              key={shipment.id}
              shipment={shipment}
              onSelect={s => setSelectedShipment(s)}
            />
          ))}
        </div>
      )}

      {selectedShipment && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <span className="card-title">Selected: {selectedShipment.id}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedShipment(null)}
            >✕</button>
          </div>
          <div className="card-body">
            <p className="text-sm text-gray" style={{ marginBottom: '1rem' }}>
              {selectedShipment.origin} → {selectedShipment.destination}
            </p>
            <div className="flex gap-3">
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/handoff/send/${selectedShipment.id}`)}
              >
                🚀 Initiate Handoff
              </button>
              <button
                className="btn btn-success"
                onClick={() => navigate(`/handoff/receive/${selectedShipment.id}`)}
              >
                📥 Accept Handoff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
