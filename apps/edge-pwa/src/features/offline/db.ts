/**
 * Dexie database schema for offline queue
 */

import Dexie, { Table } from 'dexie';
import { QueuedHandoff } from '@veritaschain/types';

export class VeritasDB extends Dexie {
  handoffs!: Table<QueuedHandoff>;

  constructor() {
    super('VeritasChain');
    this.version(1).stores({
      handoffs: '++id, shipmentId, status, vectorClock, createdAt',
    });
  }
}

export const db = new VeritasDB();

export async function queueHandoff(handoff: Omit<QueuedHandoff, 'id'>): Promise<number> {
  return await db.handoffs.add({
    ...handoff,
    createdAt: new Date(),
  });
}

export async function getPendingHandoffs(): Promise<QueuedHandoff[]> {
  return await db.handoffs.where('status').anyOf(['pending', 'failed']).toArray();
}

export async function updateHandoffStatus(
  id: number,
  status: QueuedHandoff['status'],
  error?: string
): Promise<void> {
  await db.handoffs.update(id, { status, error });
}

export async function getAllHandoffs(): Promise<QueuedHandoff[]> {
  return await db.handoffs.toArray();
}

export async function getHandoff(id: number): Promise<QueuedHandoff | undefined> {
  return await db.handoffs.get(id);
}

export async function deleteHandoff(id: number): Promise<void> {
  await db.handoffs.delete(id);
}

export async function getVectorClock(): Promise<number> {
  const stored = localStorage.getItem('veritaschain_sync_vector_clock');
  return stored ? parseInt(stored) : 0;
}

export async function incrementVectorClock(): Promise<number> {
  const current = await getVectorClock();
  const next = current + 1;
  localStorage.setItem('veritaschain_sync_vector_clock', next.toString());
  return next;
}
