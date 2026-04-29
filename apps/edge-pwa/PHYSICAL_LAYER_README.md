# VeritasChain Edge PWA — Physical Layer

> Receiver-side NFC + ZK cold-chain provenance handoff for Chrome on Android.

---

## Table of Contents
1. [Hardware Guide](#1-hardware-guide)
2. [Architecture Overview](#2-architecture-overview)
3. [Module API Reference](#3-module-api-reference)
4. [Testing with Real Hardware](#4-testing-with-real-hardware)
5. [Testing with Chrome DevTools NFC Emulator](#5-testing-with-chrome-devtools-nfc-emulator)
6. [Running Tests](#6-running-tests)
7. [Circuit Files Setup](#7-circuit-files-setup)
8. [Configuration Reference](#8-configuration-reference)

---

## 1. Hardware Guide

### NFC Tamper-Evident Seal — NXP NTAG 424 DNA

| Item | Spec |
|---|---|
| **Model** | NXP NTAG 424 DNA |
| **Purchase** | [Mouser #771-NT4H2421G0DUH](https://www.mouser.com/ProductDetail/NXP-Semiconductors/NT4H2421G0DUH) or AliExpress "NTAG 424 DNA sticker" |
| **Form factor** | ISO/IEC 14443-A Type 2 tag in tamper-evident sticker form |
| **Key storage** | Ed25519 private key provisioned during manufacturing |
| **Protocol** | Signs `vcSeal:<nonceHex>:<sealId>` via AES-backed ECDH challenge-response |
| **Why tamper-evident** | Antenna traces break on peel → NFC read fails → PWA returns `SEAL_BROKEN` |
| **Encapsulation** | Void label; do NOT use generic NTAG 213/215/216 (no auth support) |

**Provisioning** (done by shipment creation team, not this layer):
1. Use NXP TagWriter or [TagXplorer](https://www.nxp.com/design/software/development-software/nfc-reader-library-software/nfc-cockpit:NFC-COCKPIT) to set the ECDH auth key.
2. Store `sealId` (chip UID) + `publicKey` (hex Ed25519 pubkey) in your shipment DB.
3. The receiver PWA reads both from `localStorage` (populated by shipment creation flow).

---

### IoT Temperature Logger — ESP32-S3 + SE050 + TMP117

| Item | Spec |
|---|---|
| **MCU** | Espressif ESP32-S3-WROOM-1 |
| **Secure Element** | NXP SE050C1 (I²C, HSM-grade, CC EAL6+) |
| **Sensor** | Texas Instruments TMP117 (±0.1°C, I²C) |
| **NFC interface** | M24LR64-R (NFC-EEPROM dual-interface, write via I²C, read via NFC) |
| **Reference design** | [Unexpected Maker FeatherS3](https://unexpectedmaker.com/shop/feathers3) + breakout boards |
| **Dev kit** | [ESP32-S3-DevKitC-1](https://www.espressif.com/en/products/devkits) |

**Data format on NFC tag** (JSON NDEF record, written by firmware):
```json
{
  "deviceId": "did:esp32:AABBCCDD",
  "fwVersion": "1.0.0",
  "readings": [
    { "timestamp": 1700000000000, "tempCelsius": 4.2, "signature": "<base64url>" }
  ]
}
```

**Signature encoding**: Each reading signed by SE050 Ed25519 key over:
- 8 bytes: `timestamp` as big-endian `int64`
- 4 bytes: `tempCelsius` as big-endian `float32`

---

## 2. Architecture Overview

```
Android Phone (Chrome 100+)
│
├── src/nfc/
│   ├── nfcUtils.ts         Web NFC wrapper — NDEFReader + timeout + abort
│   ├── sealVerifier.ts     Step 1: seal challenge-response (Ed25519)
│   └── tempReader.ts       Step 2: logger read + Merkle tree + compliance
│
├── src/zk/
│   ├── snarkjsLoader.ts    Lazy WASM loader for snarkjs
│   └── proofGenerator.ts   Step 3: Groth16 proof (or ECDSA fallback)
│
├── src/handoff/
│   ├── db.ts               IndexedDB persistence (idb library)
│   └── bundleAssembler.ts  Step 4: orchestrate → bundle → persist → emit
│
├── src/types/
│   └── physicalLayer.ts    Local re-exports + PWA-only types
│
└── packages/
    ├── crypto/src/signatures.ts   Ed25519 verify, nonce gen, message builders
    └── types/src/physicalLayer.ts Canonical shared type definitions
```

**Data flow**:
```
NDEFReader → sealVerifier ──┐
NDEFReader → tempReader ────┼──→ bundleAssembler → IndexedDB
snarkjs WASM → proofGen ───┘                    → CustomEvent('handoff-bundle-ready')
```

---

## 3. Module API Reference

### `packages/crypto/src/signatures.ts`

```typescript
// Generate a cryptographically random nonce
generateNonce(byteLength?: number): CryptoResult<{ hex: string; bytes: Uint8Array }>

// Verify an Ed25519 signature
verifyEd25519(messageBytes, signatureHexOrB64, publicKeyHex): Promise<CryptoResult<boolean>>

// Verify over a UTF-8 string
verifyStringMessage(message, signatureHexOrB64, publicKeyHex): Promise<CryptoResult<boolean>>

// Build the canonical message the logger signs per reading
buildReadingMessage(timestamp, tempCelsius): Uint8Array

// Build the canonical seal challenge message
buildSealChallengeMessage(nonceHex, sealId): Uint8Array
```

---

### `src/nfc/sealVerifier.ts`

```typescript
verifySeal(config?: Partial<SealVerifierConfig>): Promise<Result<SealResult>>
```

**Returns** `SealResult`:
```typescript
{ valid: true,  sealId, signature, verifiedAt }
{ valid: false, sealId: '', signature: '', verifiedAt, reason: 'SEAL_BROKEN' | 'SEAL_NOT_FOUND' | 'SIGNATURE_INVALID' }
```

**localStorage keys required**:
- `vc:seal:publicKey` — hex Ed25519 public key of the seal

---

### `src/nfc/tempReader.ts`

```typescript
readTemperatureLogger(config?: Partial<TempReaderConfig>): Promise<Result<TempResult>>
buildMerkleRoot(readings: Reading[]): string
buildMerkleTree(readings: Reading[]): StandardMerkleTree
verifyMerkleProof(root, reading, proof): boolean
```

**localStorage keys required**:
- `vc:logger:publicKey` — hex Ed25519 public key of the logger

---

### `src/zk/proofGenerator.ts`

```typescript
generateTemperatureProof(
  merkleRoot, minTemp, maxTemp,
  complianceMin?, complianceMax?,
  config?
): Promise<Result<ZKResult>>
```

Circuit inputs: `merkleRoot`, `minTemp×100`, `maxTemp×100`, `thresholdMin×100`, `thresholdMax×100`

**Circuit files** must be in `/apps/edge-pwa/public/circuits/build/`:
- `temp_range.wasm`
- `temp_range_final.zkey`

---

### `src/handoff/bundleAssembler.ts`

```typescript
assembleHandoffBundle(config?: Partial<AssemblerConfig>): Promise<Result<HandoffBundle>>
```

Also fires `window.dispatchEvent(new CustomEvent('handoff-bundle-ready', { detail: { bundle } }))`.

**localStorage keys required**:
- `vc:shipment:id` — current shipment UUID
- `vc:device:id` — receiver device identifier

---

### `src/handoff/db.ts`

```typescript
storeBundle(bundle: HandoffBundle): Promise<Result<StoredBundle>>
getBundle(shipmentId: string): Promise<Result<StoredBundle | null>>
listBundles(): Promise<Result<StoredBundle[]>>
listUnsyncedBundles(): Promise<Result<StoredBundle[]>>
markSynced(shipmentId: string): Promise<Result<void>>
deleteBundle(shipmentId: string): Promise<Result<void>>
```

---

## 4. Testing with Real Hardware

### Prerequisites
- Android phone with Chrome 100+
- NFC enabled (Settings → Connected devices → NFC → ON)
- NTAG 424 DNA seal provisioned with Ed25519 key
- ESP32-S3 logger flashed and running

### Setup localStorage
Open Chrome DevTools (USB debugging) → Console:
```javascript
localStorage.setItem('vc:seal:publicKey', '<64-char-hex-pubkey>');
localStorage.setItem('vc:logger:publicKey', '<64-char-hex-pubkey>');
localStorage.setItem('vc:shipment:id', 'ship-001');
localStorage.setItem('vc:device:id', 'device-001');
```

### Run the handoff
```javascript
const { assembleHandoffBundle } = await import('./src/handoff/bundleAssembler.ts');
const result = await assembleHandoffBundle();
console.log(JSON.stringify(result, null, 2));
```

### Listen for DWH event
```javascript
window.addEventListener('handoff-bundle-ready', (e) => {
  console.log('Bundle ready:', e.detail.bundle);
});
```

---

## 5. Testing with Chrome DevTools NFC Emulator

Chrome DevTools has a built-in NFC tag emulator (chrome://inspect → Sensors → NFC).

### Emulate a temperature logger read

1. Open **DevTools** → **More tools** → **Sensors** → **NFC**
2. Click **"Simulate NFC tag"**
3. Set record type to `text`, encoding `UTF-8`
4. Paste this payload:
```json
{"deviceId":"did:esp32:TEST001","fwVersion":"1.0.0","readings":[{"timestamp":1700000000000,"tempCelsius":4.2,"signature":"<base64url_sig>"},{"timestamp":1700000300000,"tempCelsius":5.1,"signature":"<base64url_sig>"}]}
```

> **Note**: Signatures won't pass real Ed25519 verification in emulated mode.
> For unit testing, mock `verifyEd25519` to always return `true` (see test files).

### Emulate a broken seal

Set the NFC emulator to return an **empty payload** or **trigger a read error**.
The PWA will detect this and return `{ valid: false, reason: 'SEAL_BROKEN' }`.

---

## 6. Running Tests

```bash
# From /apps/edge-pwa/
pnpm test

# With coverage
pnpm vitest run --coverage

# Watch mode
pnpm test:watch
```

All tests use Vitest + `vi.mock()` for full hardware isolation. No physical NFC device required.

---

## 7. Circuit Files Setup

The ZK circuits are pre-compiled by the circuits team. Copy the build artifacts:

```bash
# From repo root
cp circuits/build/temp_range.wasm    apps/edge-pwa/public/circuits/build/temp_range.wasm
cp circuits/build/temp_range_final.zkey  apps/edge-pwa/public/circuits/build/temp_range_final.zkey
```

Vite serves `/apps/edge-pwa/public/` at `/` — so the files will be accessible at:
- `https://your-pwa.domain/circuits/build/temp_range.wasm`
- `https://your-pwa.domain/circuits/build/temp_range_final.zkey`

> **Bundle size**: snarkjs WASM is ~1.5 MB. It is dynamically imported (code-split by Vite) and only loaded when the proof step runs. The initial JS bundle remains well under 600 KB.

---

## 8. Configuration Reference

All configuration defaults live in `packages/types/src/physicalLayer.ts`:

```typescript
export const DEFAULT_CONFIG: PhysicalLayerConfig = {
  temperatureThreshold: { min: 2, max: 8 },   // °C, inclusive
  nfcReadTimeoutMs: 3000,                       // 3 seconds
  zkProofTimeoutMs: 8000,                       // 8 second timeout before ECDSA fallback
  sealPublicKeyStorageKey: 'vc:seal:publicKey',
  loggerPublicKeyStorageKey: 'vc:logger:publicKey',
  shipmentIdStorageKey: 'vc:shipment:id',
  receiverDeviceIdStorageKey: 'vc:device:id',
};
```

Override per-call by passing a `config` argument to any module function.

---

## Error Codes Reference

| Code | Module | Meaning |
|---|---|---|
| `SEAL_NOT_FOUND` | sealVerifier | No public key registered for seal |
| `SEAL_BROKEN` | sealVerifier | NFC read/write failed (tamper detected) |
| `SIGNATURE_INVALID` | sealVerifier | Ed25519 signature mismatch |
| `LOGGER_NOT_FOUND` | tempReader | No logger public key / NFC not found |
| `LOGGER_READ_TIMEOUT` | tempReader | NFC read timed out |
| `LOGGER_PAYLOAD_MALFORMED` | tempReader | JSON parse error or missing fields |
| `LOGGER_SIGNATURE_INVALID` | tempReader | Any reading signature fails verification |
| `WASM_LOAD_FAILED` | proofGenerator | snarkjs dynamic import failed |
| `CIRCUIT_FILE_NOT_FOUND` | proofGenerator | WASM/zkey file HTTP 404 |
| `PROOF_GENERATION_FAILED` | proofGenerator | snarkjs.fullProve() threw |
| `PROOF_TIMEOUT` | proofGenerator | Proof took > `zkProofTimeoutMs` |
| `FALLBACK_SIGN_FAILED` | proofGenerator | Web Crypto ECDSA signing failed |
| `IDB_STORE_FAILED` | db | IndexedDB write error |
| `MISSING_SHIPMENT_ID` | bundleAssembler | `vc:shipment:id` not in localStorage |
| `NFC_NOT_SUPPORTED` | nfcUtils | NDEFReader not in this browser |
| `NFC_READ_TIMEOUT` | nfcUtils | No tag detected within timeout |
