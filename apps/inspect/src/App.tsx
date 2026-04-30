import React, { useState } from 'react';
import { Shipment } from '@veritaschain/types';
import { QRScanner } from './features/scanner/QRScanner';
import { ShipmentStatus } from './features/verification/ShipmentStatus';
import { FreshnessScore } from './features/verification/FreshnessScore';
import { HandoffTimeline } from './features/verification/HandoffTimeline';
import { CourtOrderUpload } from './features/deep-audit/CourtOrderUpload';
import { DocumentViewer } from './features/deep-audit/DocumentViewer';
import { fetchShipmentData, getChainStatus } from './features/verification/fetchShipmentData';
import './index.css';

interface AppState {
  shipmentId: string | null;
  shipment: Shipment | null;
  isChainValid: boolean;
  isDecrypted: boolean;
  isLoading: boolean;
  error: string | null;
}

export default function App() {
  const [state, setState] = useState<AppState>({
    shipmentId: null,
    shipment: null,
    isChainValid: false,
    isDecrypted: false,
    isLoading: false,
    error: null,
  });

  const handleScanned = async (shipmentId: string) => {
    setState(s => ({ ...s, shipmentId, isLoading: true, error: null }));
    try {
      const shipment = await fetchShipmentData(shipmentId);
      if (shipment) {
        const chainStatus = await getChainStatus(shipment);
        setState(s => ({ ...s, shipment, isChainValid: chainStatus.isValid, isLoading: false }));
      } else {
        setState(s => ({ ...s, isLoading: false, error: 'Shipment not found on chain.' }));
      }
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err?.message || 'Failed to fetch shipment.' }));
    }
  };

  const handleReset = () => setState({
    shipmentId: null, shipment: null, isChainValid: false,
    isDecrypted: false, isLoading: false, error: null,
  });

  return (
    <>
      <header className="inspect-header">
        <h1>🔍 VeritasChain Inspect</h1>
        <p>Public Shipment Verification Portal</p>
        <div className="inspect-badge">🔒 Read-Only · On-Chain Verified</div>
      </header>

      <main className="inspect-main">
        {!state.shipment && !state.isLoading && (
          <QRScanner onScanned={handleScanned} />
        )}

        {state.isLoading && (
          <div className="loading-center card" style={{ padding: '3rem' }}>
            <div className="spinner" style={{ borderColor: 'var(--gray-200)', borderTopColor: 'var(--emerald)' }} />
            Fetching shipment from chain…
          </div>
        )}

        {state.error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            ⚠ {state.error}
            <button
              onClick={handleReset}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 600 }}
            >Try again</button>
          </div>
        )}

        {state.shipment && !state.isLoading && (
          <div className="space-y-4">
            {/* Reset button */}
            <div className="flex" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={handleReset}>← Scan Another</button>
            </div>

            <ShipmentStatus
              shipment={state.shipment}
              isChainValid={state.isChainValid}
              isLoading={false}
            />

            <FreshnessScore score={state.shipment.freshnessScore} />

            <HandoffTimeline handoffs={state.shipment.handoffChain} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <CourtOrderUpload
                shipmentId={state.shipment.id}
                onSubmit={() => setState(s => ({ ...s, isDecrypted: true }))}
              />
              <DocumentViewer
                documents={state.shipment.documents}
                isDecrypted={state.isDecrypted}
              />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
