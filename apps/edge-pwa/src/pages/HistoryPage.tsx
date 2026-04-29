import { useState, useEffect, useCallback } from 'react';
import Breadcrumb from '../components/Breadcrumb';
import StatusBadge from '../components/StatusBadge';
import { listBundles } from '../handoff/db';
import type { StoredBundle } from '../types/physicalLayer';

type Filter = 'all' | 'ok' | 'contested';
type Sort   = 'newest' | 'oldest';

// ── Row expansion ─────────────────────────────────────────────────────────────

function ExpandedRow({ bundle }: { bundle: StoredBundle['bundle'] }) {
  return (
    <tr>
      <td colSpan={7} style={{ padding: 0 }}>
        <div style={{ background: 'var(--vc-bg-section)', borderTop: '1px solid var(--vc-border)', borderBottom: '1px solid var(--vc-border)', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            <Section title="Seal Verification">
              <KV k="Seal ID"   v={bundle.sealVerification.sealId || '—'} mono />
              <KV k="Valid"     v={bundle.sealVerification.valid ? 'Yes' : 'No'} />
              <KV k="Timestamp" v={new Date(bundle.sealVerification.verifiedAt).toLocaleString()} />
            </Section>
            <Section title="Temperature Data">
              <KV k="Min Temp"  v={`${bundle.temperatureData.minTemp.toFixed(2)}°C`} />
              <KV k="Max Temp"  v={`${bundle.temperatureData.maxTemp.toFixed(2)}°C`} />
              <KV k="Readings"  v={String(bundle.temperatureData.readingCount)} />
              <KV k="Compliant" v={bundle.temperatureData.allCompliant ? 'Yes' : 'No'} />
            </Section>
            <Section title="Proof">
              <KV k="Type"        v={bundle.temperatureProof.proofType} />
              <KV k="Merkle Root" v={`${bundle.temperatureData.merkleRoot.slice(0, 12)}…`} mono />
              <KV k="Device ID"   v={bundle.receiverDeviceId} mono />
            </Section>
          </div>
        </div>
      </td>
    </tr>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--vc-text-muted)', marginBottom: 10 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
      <span style={{ color: 'var(--vc-text-muted)', minWidth: 88 }}>{k}</span>
      <span style={{ color: 'var(--vc-text-primary)', fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all' }}>{v}</span>
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function TableRow({ stored, expanded, onToggle }: { stored: StoredBundle; expanded: boolean; onToggle: () => void }) {
  const { bundle, storedAt } = stored;
  const badgeStatus = bundle.status === 'OK' ? 'success' as const : 'error' as const;

  return (
    <>
      <tr
        style={{ cursor: 'pointer' }}
        onClick={onToggle}
      >
        <td>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--vc-text-primary)' }}>
            {bundle.shipmentId}
          </span>
        </td>
        <td style={{ whiteSpace: 'nowrap' }}>{new Date(storedAt).toLocaleDateString()}</td>
        <td>
          <StatusBadge status={bundle.sealVerification.valid ? 'success' : 'error'} label={bundle.sealVerification.valid ? 'Verified' : 'Failed'} />
        </td>
        <td>
          <StatusBadge status={bundle.temperatureData.allCompliant ? 'success' : 'error'} label={bundle.temperatureData.allCompliant ? 'Compliant' : 'Excursion'} />
        </td>
        <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--vc-text-muted)' }}>
          {bundle.temperatureProof.proofType === 'GROTH16' ? '🏅 Groth16' : '🥈 ECDSA'}
        </td>
        <td>
          <StatusBadge status={badgeStatus} label={bundle.status} />
        </td>
        <td>
          <span style={{ fontSize: 13, color: 'var(--vc-primary)', fontWeight: 500 }}>
            {expanded ? 'Hide ▲' : 'Details ▼'}
          </span>
        </td>
      </tr>
      {expanded && <ExpandedRow bundle={bundle} />}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [bundles, setBundles]     = useState<StoredBundle[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [filter, setFilter]       = useState<Filter>('all');
  const [sort, setSort]           = useState<Sort>('newest');
  const [search, setSearch]       = useState('');
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const PER_PAGE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listBundles();
    if (res.success) setBundles(res.data);
    else setError(res.error.message);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Filter + sort + search
  const filtered = bundles
    .filter((b) => {
      if (filter === 'ok'        && b.bundle.status !== 'OK')        return false;
      if (filter === 'contested' && b.bundle.status !== 'CONTESTED') return false;
      if (search && !b.bundle.shipmentId.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(a.storedAt).getTime() - new Date(b.storedAt).getTime();
      return sort === 'newest' ? -diff : diff;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleRow = (id: string) => setExpanded((prev) => (prev === id ? null : id));

  const filterChips: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${bundles.length})` },
    { key: 'ok',  label: `Verified (${bundles.filter((b) => b.bundle.status === 'OK').length})` },
    { key: 'contested', label: `Contested (${bundles.filter((b) => b.bundle.status === 'CONTESTED').length})` },
  ];

  return (
    <div className="vc-section">
      <div className="vc-container">
        <Breadcrumb items={[{ label: 'Home', to: '/physical' }, { label: 'History' }]} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="vc-h2" style={{ marginBottom: 6 }}>Handoff History</h1>
            <p className="vc-body">{bundles.length} handoffs stored locally · syncs automatically when online</p>
          </div>
          <button className="vc-btn vc-btn-outline" onClick={load} style={{ gap: 6 }}>
            <span className={loading ? 'vc-spin inline-block' : ''}>↻</span> Refresh
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="vc-input"
            style={{ maxWidth: 280 }}
            placeholder="Search shipment ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {filterChips.map((c) => (
              <button
                key={c.key}
                className={`vc-chip ${filter === c.key ? 'vc-chip-blue' : 'vc-chip-gray'}`}
                onClick={() => { setFilter(c.key); setPage(1); }}
                style={{ cursor: 'pointer', border: 'none' }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <select className="vc-select" style={{ marginLeft: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ border: '1px solid var(--vc-border)', borderRadius: 'var(--vc-radius-md)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--vc-text-muted)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: 'var(--vc-primary)', margin: '0 auto 12px' }} className="vc-spin" />
              Loading handoffs…
            </div>
          ) : error ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--vc-error)' }}>{error}</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: 72, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{search || filter !== 'all' ? 'No matching handoffs' : 'No Handoffs Yet'}</p>
              <p className="vc-small">{search || filter !== 'all' ? 'Try adjusting your filters.' : 'Complete a verification to see it here.'}</p>
            </div>
          ) : (
            <table className="vc-table">
              <thead>
                <tr>
                  <th>Shipment ID</th>
                  <th>Date</th>
                  <th>Seal</th>
                  <th>Temperature</th>
                  <th>Proof</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((b) => (
                  <TableRow key={b.id} stored={b} expanded={expanded === b.id} onToggle={() => toggleRow(b.id)} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }}>
            <button className="vc-btn vc-btn-ghost vc-btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`vc-btn vc-btn-sm ${p === page ? 'vc-btn-primary' : 'vc-btn-ghost'}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button className="vc-btn vc-btn-ghost vc-btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
