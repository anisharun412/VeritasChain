/**
 * Hook for managing offline queue state
 */

import { useState, useEffect, useCallback } from 'react';
import { QueuedHandoff } from '@veritaschain/types';
import { getAllHandoffs } from './db';
import { syncService } from './syncService';

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedHandoff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const handoffs = await getAllHandoffs();
      setQueue(handoffs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncService.syncPendingHandoffs();
      await refresh();
    } finally {
      setIsSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [refresh]);

  const stats = {
    total: queue.length,
    pending: queue.filter(h => h.status === 'pending').length,
    syncing: queue.filter(h => h.status === 'syncing').length,
    synced: queue.filter(h => h.status === 'synced').length,
    failed: queue.filter(h => h.status === 'failed').length,
  };

  return {
    queue,
    stats,
    isLoading,
    isSyncing,
    refresh,
    sync,
  };
}
