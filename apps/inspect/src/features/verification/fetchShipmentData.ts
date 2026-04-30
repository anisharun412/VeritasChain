/**
 * Fetch shipment data from The Graph or RPC
 */

import { Shipment, SignedHandoff } from '@veritaschain/types';

export async function fetchShipmentData(shipmentId: string): Promise<Shipment | null> {
  try {
    // Mock data - in production, query The Graph or on-chain RPC
    const mockShipment: Shipment = {
      id: shipmentId,
      origin: 'Warehouse A',
      destination: 'Distribution Center B',
      status: 'completed',
      freshnessScore: 85,
      assignedTo: 'driver-001',
      documents: [
        { name: 'Temp Log', hash: 'abc123def456', mimeType: 'application/json' },
        { name: 'Certificate', hash: 'def456ghi789', mimeType: 'application/pdf' },
      ],
      handoffChain: [
        {
          bundle: {
            shipmentId,
            previousAnchor: '',
            documentHashes: ['abc123def456', 'def456ghi789'],
            zkTemperatureProof: 'proof-data-1',
            fieldNotes: 'Initial handoff',
            gpsLat: 40.7128,
            gpsLng: -74.006,
            utcTimestamp: Math.floor(Date.now() / 1000) - 3600,
          },
          senderSig: '0x' + Array(130).fill('a').join(''),
          receiverSig: '0x' + Array(130).fill('b').join(''),
          merkleRoot: '0x' + Array(64).fill('c').join(''),
          isContested: false,
        },
      ],
      createdAt: Math.floor(Date.now() / 1000) - 7200,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    return mockShipment;
  } catch (error) {
    console.error('Failed to fetch shipment:', error);
    return null;
  }
}

export async function verifyChainIntegrity(shipment: Shipment): Promise<boolean> {
  try {
    // Verify Merkle roots are properly chained
    for (let i = 0; i < shipment.handoffChain.length - 1; i++) {
      const current = shipment.handoffChain[i];
      const next = shipment.handoffChain[i + 1];
      
      // Check if previous anchor matches
      if (next.bundle.previousAnchor !== current.merkleRoot) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Chain verification error:', error);
    return false;
  }
}

export interface ChainStatus {
  isValid: boolean;
  totalHandoffs: number;
  brokenLinks: number;
  lastUpdate: number;
}

export async function getChainStatus(shipment: Shipment): Promise<ChainStatus> {
  const isValid = await verifyChainIntegrity(shipment);
  let brokenLinks = 0;

  for (let i = 0; i < shipment.handoffChain.length - 1; i++) {
    const current = shipment.handoffChain[i];
    const next = shipment.handoffChain[i + 1];
    if (next.bundle.previousAnchor !== current.merkleRoot) {
      brokenLinks++;
    }
  }

  return {
    isValid,
    totalHandoffs: shipment.handoffChain.length,
    brokenLinks,
    lastUpdate: shipment.updatedAt,
  };
}
