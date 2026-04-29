/**
 * Hook for fetching shipments
 */

import { useState, useEffect } from 'react';
import { Shipment } from '@veritaschain/types';

export function useShipments(assignedTo: string) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignedTo) {
      setLoading(false);
      return;
    }

    const fetchShipments = async () => {
      try {
        setLoading(true);
        // Mock data for MVP
        const mockShipments: Shipment[] = [
          {
            id: 'SHIP-001',
            origin: 'Warehouse A',
            destination: 'Distribution Center B',
            status: 'pending',
            freshnessScore: 85,
            assignedTo,
            documents: [
              { name: 'Temp Log', hash: 'abc123', mimeType: 'application/json' },
              { name: 'Certificate', hash: 'def456', mimeType: 'application/pdf' },
            ],
            handoffChain: [],
            createdAt: Date.now() / 1000,
            updatedAt: Date.now() / 1000,
          },
          {
            id: 'SHIP-002',
            origin: 'Warehouse C',
            destination: 'Retail Store D',
            status: 'ready',
            freshnessScore: 72,
            assignedTo,
            documents: [
              { name: 'Compliance Doc', hash: 'ghi789', mimeType: 'application/pdf' },
            ],
            handoffChain: [],
            createdAt: Date.now() / 1000,
            updatedAt: Date.now() / 1000,
          },
        ];

        setShipments(mockShipments);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch shipments';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [assignedTo]);

  return { shipments, loading, error };
}
