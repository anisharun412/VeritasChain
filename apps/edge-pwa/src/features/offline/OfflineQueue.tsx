import React from 'react';
import { QueuedHandoff } from '@veritaschain/types';

interface OfflineQueueProps {
  queue: QueuedHandoff[];
  stats: { total: number; pending: number; syncing: number; synced: number; failed: number };
  onSync?: () => void;
  isSyncing?: boolean;
}

export const OfflineQueue: React.FC<OfflineQueueProps> = ({
  queue, stats, onSync, isSyncing = false,
}) => {
  if (stats.total === 0) return null;

  const pendingCount = stats.pending + stats.failed;

  return (
    <div className="offline-widget">
      <div className="offline-widget-title">
        📡 Offline Queue
        {pendingCount > 0 && (
          <span className="offline-badge">{pendingCount}</span>
        )}
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        {stats.pending > 0 && (
          <div className="offline-row">🕐 {stats.pending} pending</div>
        )}
        {stats.syncing > 0 && (
          <div className="offline-row">🔄 {stats.syncing} syncing…</div>
        )}
        {stats.synced > 0 && (
          <div className="offline-row">✓ {stats.synced} synced</div>
        )}
        {stats.failed > 0 && (
          <div className="offline-row" style={{ color: '#f87171' }}>✕ {stats.failed} failed</div>
        )}
      </div>

      <button
        className="offline-sync-btn"
        onClick={onSync}
        disabled={isSyncing}
      >
        {isSyncing ? '⟳ Syncing…' : '↑ Sync Now'}
      </button>
    </div>
  );
};
