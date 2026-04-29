/**
 * Core types for VeritasChain handoff protocol
 */

export interface HandoffBundle {
  shipmentId: string;
  previousAnchor: string;           // Hash of previous handoff
  documentHashes: string[];         // SHA-256 hashes of all docs
  zkTemperatureProof: string;       // 200-byte Groth16 proof
  fieldNotes?: string;
  gpsLat: number;
  gpsLng: number;
  utcTimestamp: number;
}

export interface SignedHandoff {
  bundle: HandoffBundle;
  senderSig: string;                // ECDSA signature (r,s,v)
  receiverSig: string;
  merkleRoot: string;
  isContested: boolean;
  contestReason?: string;
}

export interface Shipment {
  id: string;
  origin: string;
  destination: string;
  status: 'pending' | 'ready' | 'in-transit' | 'completed' | 'contested';
  freshnessScore: number;           // 0-100, Green 80+, Yellow 50-79, Red 0-49
  assignedTo: string;               // Wallet address
  documents: DocumentHash[];
  handoffChain: SignedHandoff[];
  createdAt: number;
  updatedAt: number;
}

export interface DocumentHash {
  name: string;
  hash: string;                     // SHA-256 hash
  mimeType: string;
}

export interface HandoffData {
  shipmentId: string;
  sender: string;                   // DID or wallet
  receiver: string;
  timestamp: number;
  merkleRoot: string;
  senderSignature: string;
  receiverSignature: string;
  isContested: boolean;
  contestReason?: string;
}

export interface NFCData {
  chipId: string;
  nonce: string;
  signature: string;                // NXP NTAG signed with private key
  shipmentId: string;
}

export interface TemperatureProof {
  readings: number[];               // Temperature readings
  proof: string;                    // Groth16 proof
  publicInputs: {
    minTemp: number;
    maxTemp: number;
    allInRange: boolean;
  };
}

export interface UserIdentity {
  did: string;                      // Decentralized Identifier
  publicKey: string;                // ECDSA public key (hex)
  biometricEnrolled: boolean;
  organization: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: UserIdentity;
  jwt?: string;
}

export interface QueuedHandoff {
  id?: number;
  shipmentId: string;
  merkleRoot: string;
  senderSig: string;
  receiverSig: string;
  bundle: HandoffBundle;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  vectorClock: number;
  createdAt: Date;
  error?: string;
}

export interface BLEMessage {
  type: 'handoff-request' | 'signature-exchange' | 'ack' | 'error';
  shipmentId: string;
  payload: any;
  timestamp: number;
}

export interface FreshnessScoreDisplay {
  score: number;
  level: 'excellent' | 'good' | 'warning' | 'critical';
  color: 'green' | 'yellow' | 'red';
  icon: string;
}
