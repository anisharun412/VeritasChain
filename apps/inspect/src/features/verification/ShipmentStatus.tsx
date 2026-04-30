import React from 'react';
import { Shipment } from '@veritaschain/types';

interface ShipmentStatusProps {
  shipment: Shipment;
  isChainValid: boolean;
  isLoading: boolean;
}

export const ShipmentStatus: React.FC<ShipmentStatusProps> = ({ shipment, isChainValid }) => {
  return (
    <div className={`verdict-card ${isChainValid ? 'verdict-valid' : 'verdict-invalid'}`}>
      <div className="verdict-icon">{isChainValid ? '✅' : '❌'}</div>
      <div className="verdict-title">
        {isChainValid ? 'Chain Integrity Verified' : 'Chain Integrity FAILED'}
      </div>
      <div className="verdict-sub">
        Shipment {shipment.id} · {shipment.origin} → {shipment.destination}
      </div>
      <div className="verdict-sub" style={{ marginTop: '0.5rem', opacity: 0.7 }}>
        {shipment.handoffChain.length} handoff{shipment.handoffChain.length !== 1 ? 's' : ''} on record
      </div>
    </div>
  );
};
