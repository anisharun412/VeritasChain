/**
 * Service Worker sync handler for background sync
 */

// This file is typically imported in the main service worker file
// Uncomment and configure based on your build setup

declare const self: ServiceWorkerGlobalScope;

export async function setupBackgroundSync(): Promise<void> {
  // Register background sync event
  self.addEventListener('sync', (event: any) => {
    if (event.tag === 'sync-handoffs') {
      event.waitUntil(syncHandoffsInBackground());
    }
  });
}

async function syncHandoffsInBackground(): Promise<void> {
  try {
    // Import sync service
    const { syncService } = await import('./syncService');
    await syncService.syncPendingHandoffs();
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

export async function requestBackgroundSync(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as any).sync.register('sync-handoffs');
    }
  } catch (error) {
    console.error('Failed to register background sync:', error);
  }
}
