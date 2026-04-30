import React from 'react';
import { Shipment } from '@veritaschain/types';
import { FreshnessBadge, StatusIndicator } from '@veritaschain/shared';

interface ShipmentCardProps {
  shipment: Shipment;
  onSelect?: (shipment: Shipment) => void;
}

export const ShipmentCard: React.FC<ShipmentCardProps> = ({ shipment, onSelect }) => {
  return (
    <div
      className="shipment-card"
      onClick={() => onSelect?.(shipment)}
      role={onSelect ? 'button' : undefined}
    >
      <div className="shipment-card-top">
        <div>
          <div className="shipment-id">{shipment.id}</div>
          <div className="shipment-route">
            📍 {shipment.origin} → {shipment.destination}
          </div>
        </div>
        <StatusIndicator status={shipment.status} />
      </div>

      <div className="shipment-card-bottom">
        <FreshnessBadge score={shipment.freshnessScore} />
        <span className="doc-count">📄 {shipment.documents.length} docs</span>
      </div>
    </div>
  );
};
