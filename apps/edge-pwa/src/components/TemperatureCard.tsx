import type { TempResult } from '../types/physicalLayer';

interface TemperatureCardProps {
  tempResult: TempResult;
  thresholdMin?: number;
  thresholdMax?: number;
  compact?: boolean;
}

export default function TemperatureCard({ tempResult, thresholdMin = 2, thresholdMax = 8, compact = false }: TemperatureCardProps) {
  const { minTemp, maxTemp, readingCount, allCompliant, merkleRoot, readings } = tempResult;

  const rangeSpan = thresholdMax - thresholdMin;
  const minPct = Math.max(0, Math.min(100, ((minTemp - thresholdMin) / rangeSpan) * 100));
  const maxPct = Math.max(0, Math.min(100, ((maxTemp - thresholdMin) / rangeSpan) * 100));

  const excursionReadings = readings.filter((r) => !r.compliant);

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <Stat label="Min Temp" value={`${minTemp.toFixed(1)}°C`} ok={minTemp >= thresholdMin} />
        <Stat label="Max Temp" value={`${maxTemp.toFixed(1)}°C`} ok={maxTemp <= thresholdMax} />
        <Stat label="Readings" value={String(readingCount)} ok />
        <Stat label="Status" value={allCompliant ? 'Compliant' : 'Excursion'} ok={allCompliant} />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
      {/* Table */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h4 className="vc-h4" style={{ fontSize: 15 }}>Temperature Readings</h4>
          <span className="vc-caption">{readingCount} readings total · {excursionReadings.length} excursions</span>
        </div>
        <div style={{ border: '1px solid var(--vc-border)', borderRadius: 'var(--vc-radius)', overflow: 'hidden' }}>
          <table className="vc-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Temperature</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {readings.slice(0, 15).map((r, i) => (
                <tr key={i}>
                  <td className="vc-mono" style={{ color: 'var(--vc-text-muted)', fontSize: 12 }}>
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ fontWeight: 600, color: r.compliant ? 'var(--vc-text-primary)' : 'var(--vc-error)' }}>
                    {r.celsius.toFixed(2)}°C
                  </td>
                  <td>
                    <span className={`vc-chip ${r.compliant ? 'vc-chip-green' : 'vc-chip-red'}`} style={{ fontSize: 11 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: r.compliant ? '#059669' : '#dc2626', display: 'inline-block' }} />
                      {r.compliant ? 'OK' : 'Excursion'}
                    </span>
                  </td>
                </tr>
              ))}
              {readingCount > 15 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--vc-text-muted)', fontSize: 13 }}>
                    + {readingCount - 15} more readings
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary panel */}
      <div className="vc-card-flat" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <p className="vc-caption" style={{ marginBottom: 4 }}>Observed Range</p>
          <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: minTemp < thresholdMin ? 'var(--vc-error)' : 'var(--vc-text-primary)' }}>{minTemp.toFixed(1)}</span>
            <span style={{ color: 'var(--vc-text-muted)', fontSize: 14 }}>°C</span>
            <span style={{ color: 'var(--vc-text-muted)', margin: '0 4px' }}>—</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: maxTemp > thresholdMax ? 'var(--vc-error)' : 'var(--vc-text-primary)' }}>{maxTemp.toFixed(1)}</span>
            <span style={{ color: 'var(--vc-text-muted)', fontSize: 14 }}>°C</span>
          </div>
        </div>

        {/* Range bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="vc-caption">Threshold: {thresholdMin}°C – {thresholdMax}°C</span>
          </div>
          <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, width: '100%', height: '100%', background: allCompliant ? '#bbf7d0' : '#fecaca', borderRadius: 4 }} />
            <div style={{ position: 'absolute', left: `${minPct}%`, width: `${Math.max(maxPct - minPct, 4)}%`, height: '100%', background: allCompliant ? '#059669' : '#dc2626', borderRadius: 4 }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row label="Total Readings" value={String(readingCount)} />
          <Row label="Excursions" value={String(excursionReadings.length)} accent={excursionReadings.length > 0} />
          <Row label="Compliance" value={allCompliant ? '✓ All compliant' : `✗ ${excursionReadings.length} violations`} accent={!allCompliant} />
        </div>

        <div>
          <p className="vc-caption" style={{ marginBottom: 4 }}>Merkle Root</p>
          <p className="vc-mono" style={{ wordBreak: 'break-all', color: 'var(--vc-text-muted)', fontSize: 11 }}>{merkleRoot}</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div>
      <p className="vc-caption" style={{ marginBottom: 2 }}>{label}</p>
      <p style={{ fontWeight: 700, fontSize: 18, color: ok ? 'var(--vc-text-primary)' : 'var(--vc-error)' }}>{value}</p>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--vc-border)' }}>
      <span className="vc-small">{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: accent ? 'var(--vc-error)' : 'var(--vc-text-primary)' }}>{value}</span>
    </div>
  );
}
