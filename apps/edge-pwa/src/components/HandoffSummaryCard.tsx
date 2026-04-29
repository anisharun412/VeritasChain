import type { HandoffBundle } from '../types/physicalLayer';
import StatusBadge from './StatusBadge';
import ProofBadge from './ProofBadge';

interface HandoffSummaryCardProps {
  bundle: HandoffBundle;
}

export default function HandoffSummaryCard({ bundle }: HandoffSummaryCardProps) {
  const { sealVerification, temperatureData, temperatureProof, scannedAt, shipmentId, status, contestReason } = bundle;

  return (
    <div className="vc-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Status header */}
      <div style={{
        padding: '20px 24px',
        background: status === 'OK' ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)',
        borderBottom: '1px solid var(--vc-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{status === 'OK' ? '✅' : '⚠️'}</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--vc-text-primary)' }}>
              {status === 'OK' ? 'Handoff Verified' : 'Contested Handoff'}
            </p>
            <p className="vc-small">{new Date(scannedAt).toLocaleString()}</p>
          </div>
        </div>
        <StatusBadge status={status === 'OK' ? 'success' : 'warning'} label={status} />
      </div>

      {/* Body */}
      <div style={{ padding: 24 }}>
        {/* ID row */}
        <div style={{ background: 'var(--vc-bg-section)', borderRadius: 'var(--vc-radius)', padding: '12px 16px', marginBottom: 20 }}>
          <p className="vc-caption" style={{ marginBottom: 2 }}>Shipment ID</p>
          <p className="vc-mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--vc-text-primary)' }}>{shipmentId}</p>
        </div>

        {/* Data rows */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <DataRow label="NFC Seal">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge status={sealVerification.valid ? 'success' : 'error'} label={sealVerification.valid ? 'Verified' : (sealVerification.reason ?? 'Failed')} />
                {sealVerification.sealId && (
                  <span className="vc-mono" style={{ fontSize: 11, color: 'var(--vc-text-muted)' }}>{sealVerification.sealId.slice(0, 16)}…</span>
                )}
              </div>
            </DataRow>
            <DataRow label="Temperature">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge status={temperatureData.allCompliant ? 'success' : 'error'} label={temperatureData.allCompliant ? 'Compliant' : 'Excursion'} />
                <span className="vc-mono" style={{ fontSize: 12, color: 'var(--vc-text-secondary)' }}>
                  {temperatureData.minTemp.toFixed(1)}–{temperatureData.maxTemp.toFixed(1)}°C ({temperatureData.readingCount} readings)
                </span>
              </div>
            </DataRow>
            <DataRow label="Proof">
              <ProofBadge proofType={temperatureProof.proofType} showDetails />
            </DataRow>
            <DataRow label="Scanned at" last>
              <span className="vc-small">{new Date(scannedAt).toLocaleString()}</span>
            </DataRow>
          </tbody>
        </table>

        {/* Contest reason */}
        {status === 'CONTESTED' && contestReason && (
          <div className="vc-alert vc-alert-warning" style={{ marginTop: 20 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 2 }}>This handoff is contested</p>
              <p style={{ fontSize: 13 }}>
                {contestReason === 'SEAL_FAILED'          && 'The NFC tamper-evident seal failed verification.'}
                {contestReason === 'TEMP_OUT_OF_RANGE'    && 'One or more temperature readings exceeded the allowed range.'}
                {contestReason === 'SEAL_AND_TEMP_FAILED' && 'Both the NFC seal and temperature data failed verification.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DataRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <tr>
      <td style={{ padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--vc-border)', width: 130, verticalAlign: 'middle' }}>
        <span className="vc-small" style={{ color: 'var(--vc-text-muted)', fontWeight: 500 }}>{label}</span>
      </td>
      <td style={{ padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--vc-border)', verticalAlign: 'middle' }}>
        {children}
      </td>
    </tr>
  );
}
