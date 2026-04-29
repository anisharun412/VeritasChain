/**
 * Offline sync service with exponential backoff
 */

import { QueuedHandoff } from '@veritaschain/types';
import { getPendingHandoffs, updateHandoffStatus, incrementVectorClock } from './db';

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 60000;
const MAX_RETRIES = 5;

interface SyncResult {
  id: number;
  success: boolean;
  error?: string;
}

export class SyncService {
  private retryCount: Map<number, number> = new Map();

  async syncPendingHandoffs(): Promise<SyncResult[]> {
    const pending = await getPendingHandoffs();
    const results: SyncResult[] = [];

    for (const handoff of pending) {
      if (!handoff.id) continue;

      const retries = this.retryCount.get(handoff.id) || 0;
      if (retries >= MAX_RETRIES) {
        results.push({
          id: handoff.id,
          success: false,
          error: 'Max retries exceeded',
        });
        continue;
      }

      try {
        // Simulate API call to sync handoff to chain
        await this.submitHandoffToChain(handoff);
        
        await updateHandoffStatus(handoff.id, 'synced');
        this.retryCount.delete(handoff.id);
        await incrementVectorClock();

        results.push({
          id: handoff.id,
          success: true,
        });
      } catch (error) {
        const nextRetry = retries + 1;
        this.retryCount.set(handoff.id, nextRetry);
        
        const backoffMs = Math.min(
          INITIAL_BACKOFF_MS * Math.pow(2, nextRetry),
          MAX_BACKOFF_MS
        );

        const message = error instanceof Error ? error.message : 'Sync failed';
        await updateHandoffStatus(handoff.id, 'failed', message);

        results.push({
          id: handoff.id,
          success: false,
          error: `Retry ${nextRetry}/${MAX_RETRIES} in ${backoffMs}ms`,
        });
      }
    }

    return results;
  }

  private async submitHandoffToChain(handoff: QueuedHandoff): Promise<void> {
    // This would call the actual blockchain/indexer service
    // For MVP, simulate a network request
    return new Promise((resolve, reject) => {
      const delay = Math.random() * 2000;
      setTimeout(() => {
        if (Math.random() > 0.7) {
          reject(new Error('Network error'));
        } else {
          resolve();
        }
      }, delay);
    });
  }

  getRetryCount(id: number): number {
    return this.retryCount.get(id) || 0;
  }
}

export const syncService = new SyncService();
