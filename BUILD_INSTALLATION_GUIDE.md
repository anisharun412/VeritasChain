# VeritasChain Edge Client Layer - Build & Installation Guide

## Prerequisites

- Node.js 20 LTS
- pnpm 9.x
- Modern browser with:
  - WebAuthn support
  - Web Bluetooth support (for BLE features)
  - Web NFC support (for NFC features) - optional
  - IndexedDB support

## Installation

### 1. Install Dependencies

```bash
cd VeritasChain
pnpm install
```

### 2. Build Shared Packages

```bash
# Build types package
pnpm -C packages/types build

# Build crypto package
pnpm -C packages/crypto build

# Build shared package
pnpm -C packages/shared build
```

## Development

### Run Edge PWA (Sender/Receiver)

```bash
pnpm -C apps/edge-pwa dev
```

Starts dev server at `http://localhost:5173` (or next available port)

### Run Inspect App

```bash
pnpm -C apps/inspect dev
```

Starts dev server at `http://localhost:5174` (or next available port)

### Run Both Apps Simultaneously

```bash
pnpm dev
```

## Building for Production

### Build Individual Apps

```bash
# Edge PWA
pnpm -C apps/edge-pwa build

# Inspect App
pnpm -C apps/inspect build

# Output in dist/ directories
```

### Production Checklist

- [ ] Update API endpoints in `packages/shared/src/constants.ts`
- [ ] Configure The Graph endpoint for on-chain queries
- [ ] Set up Blockchain RPC endpoint
- [ ] Configure Identity Service endpoint
- [ ] Set up deep audit document encryption/decryption keys
- [ ] Configure PWA manifest icons
- [ ] Enable HTTPS (required for WebAuthn, Web Bluetooth)
- [ ] Set Service Worker caching strategy
- [ ] Configure CORS for API calls

## Mock Data

Current implementation uses mock data in:

### Edge PWA
- `apps/edge-pwa/src/features/shipments/useShipments.ts`
- `apps/edge-pwa/src/features/offline/syncService.ts`

### Inspect App
- `apps/inspect/src/features/verification/fetchShipmentData.ts`

**To connect to real backend:**

1. Replace mock implementations with actual API calls
2. Update endpoints in `packages/shared/src/constants.ts`
3. Implement proper error handling
4. Add authentication tokens to requests

## Environment Variables

Create `.env` files in each app:

### apps/edge-pwa/.env
```env
VITE_IDENTITY_SERVICE=http://localhost:3001
VITE_INDEXER_SERVICE=http://localhost:3002
VITE_GRAPH_API=https://api.studio.thegraph.com/query/YOUR_SUBGRAPH_ID
VITE_RPC_ENDPOINT=http://localhost:8545
```

### apps/inspect/.env
```env
VITE_GRAPH_API=https://api.studio.thegraph.com/query/YOUR_SUBGRAPH_ID
VITE_RPC_ENDPOINT=http://localhost:8545
VITE_COURT_ORDER_VERIFY_ENDPOINT=http://localhost:3003/verify-order
```

## Browser DevTools

### Testing Features

1. **WebAuthn**
   - Chrome: Use built-in virtual authenticator in DevTools
   - Settings → More tools → Developer tools → ⋮ → More tools → WebAuthn
   - Enable virtual authenticator environment

2. **Web Bluetooth**
   - Chrome: Flag `chrome://flags/#enable-experimental-web-platform-features`
   - Check console for Bluetooth API calls

3. **Web NFC**
   - Chrome: Flag `chrome://flags/#enable-experimental-web-platform-features`
   - Requires NFC reader hardware

4. **IndexedDB**
   - DevTools → Application → IndexedDB → VeritasChain
   - Inspect local database contents

5. **Service Worker**
   - DevTools → Application → Service Workers
   - Check registration status and offline capabilities

## Troubleshooting

### "WebAuthn not supported on this device"
- Solution: Enable in DevTools virtual authenticator
- Or: Use a device/browser with native WebAuthn support

### "BLE not supported"
- Solution: Enable experimental features flag
- Or: Use a device with Bluetooth hardware

### "Offline queue not syncing"
- Check: IndexedDB in DevTools
- Check: Service Worker status
- Check: Background Sync API support
- Check: Network throttling settings

### "Proof verification failed"
- Check: Proof format and data types
- Note: Uses mock verification in MVP
- Will use snarkjs in production

## Deployment

### Docker (Optional)

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm -C apps/edge-pwa build
RUN pnpm -C apps/inspect build
EXPOSE 3000
CMD ["pnpm", "dev"]
```

### Static Hosting (Recommended for PWA)

1. Build both apps: `pnpm build`
2. Upload `dist/` directories to static hosting
3. Configure 404 → index.html for SPA routing
4. Enable HTTPS (required for service workers and WebAuthn)
5. Configure CORS headers for API calls

### Netlify Deployment

```toml
# netlify.toml
[build]
  command = "pnpm build"
  publish = "apps/edge-pwa/dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Vercel Deployment

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "apps/edge-pwa/dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Performance Optimization

### Bundle Size
```bash
# Analyze bundle
pnpm -C apps/edge-pwa build --analyze
```

### Lighthouse Audit
1. Open DevTools → Lighthouse
2. Generate report (targeting mobile PWA)
3. Target: 90+ score

### Database Optimization
- Index frequently queried columns in Dexie schema
- Implement data cleanup for old handoff records
- Use compression for stored data

## Testing

### Manual Testing Scenarios

**Scenario 1: Sender Handoff (BLE)**
1. Login with biometric
2. Select shipment from list
3. Add optional field notes
4. Click "Start Handoff"
5. Review summary and confirm
6. Biometric signing prompt
7. Signature exchange via BLE (mock)
8. Merkle root generated
9. Offline queue updates

**Scenario 2: Receiver Handoff (NFC)**
1. Login with biometric
2. Click "Accept Handoff"
3. Tap NFC seal (mock prompt)
4. Verify seal integrity
5. Review sender's documents
6. Biometric signing prompt
7. Accept and sign
8. Offline queue updates

**Scenario 3: Inspect (QR Scanner)**
1. Open Inspect app
2. Click "Scan QR" (mock: enter shipment ID)
3. Fetch shipment data
4. Display chain status (green/red)
5. View freshness score
6. Browse handoff timeline
7. (Optional) Submit court order for deep audit

**Scenario 4: Offline Operations**
1. Enable offline mode (DevTools → Network → Offline)
2. Create new handoff
3. Note queued in offline widget
4. Go back online
5. Click "Sync Now" in offline widget
6. Watch queue clear as sync completes

## Support

For issues or questions:
1. Check mock implementations for understanding flow
2. Review constants in `packages/shared/src/constants.ts`
3. Check browser console for errors
4. Verify prerequisites are installed
5. Test in latest Chrome/Edge first

## Next Phase

After MVP validation:
1. Connect to real backend services
2. Implement production cryptography (snarkjs)
3. Add multi-language support
4. Implement analytics tracking
5. Add push notification system
6. Create regulatory compliance dashboard
