/**
 * Shared constants for VeritasChain
 */

export const TEMPERATURE_RANGE = {
  MIN: 2,
  MAX: 8,
};

export const FRESHNESS_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 50,
  WARNING: 0,
};

export const FRESHNESS_COLORS = {
  EXCELLENT: '#10B981', // Green
  GOOD: '#F59E0B', // Yellow
  WARNING: '#EF4444', // Red
};

export const BLE_CONFIG = {
  HANDOFF_SERVICE_UUID: '12345678-1234-1234-1234-123456789012',
  CHARACTERISTIC_UUID: '87654321-4321-4321-4321-210987654321',
  HANDOFF_TIMEOUT_MS: 30000,
};

export const NFC_CONFIG = {
  SUPPORTED_CHIPS: ['NXP NTAG', 'NTAG215', 'NTAG216'],
  SEAL_VERIFICATION_TIMEOUT_MS: 5000,
};

export const API_ENDPOINTS = {
  IDENTITY_SERVICE: (import.meta as any).env?.VITE_IDENTITY_SERVICE || 'http://localhost:3001',
  INDEXER_SERVICE: (import.meta as any).env?.VITE_INDEXER_SERVICE || 'http://localhost:3002',
  GRAPH_API: (import.meta as any).env?.VITE_GRAPH_API || 'https://api.studio.thegraph.com/query/YOUR_SUBGRAPH',
};

export const STORAGE_KEYS = {
  USER_DID: 'veritaschain_user_did',
  PRIVATE_KEY_ENCRYPTED: 'veritaschain_private_key_encrypted',
  HANDOFF_QUEUE: 'veritaschain_handoff_queue',
  SYNC_VECTOR_CLOCK: 'veritaschain_sync_vector_clock',
};

export const UI_DELAYS = {
  TOAST_DURATION_MS: 3000,
  ANIMATION_DURATION_MS: 300,
  RETRY_INITIAL_DELAY_MS: 1000,
  RETRY_MAX_DELAY_MS: 60000,
};
