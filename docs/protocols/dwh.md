# Dual-Witness Handoff (DWH)

The Dual-Witness Handoff protocol requires a sender and receiver to co-sign a single handoff record at the moment of custody transfer, even when offline.

## Inputs
- Shipment ID and previous handoff hash
- NFC seal attestation
- ZK proof of temperature compliance
- Document hashes for the current leg
- Field notes, GPS coordinates, and timestamp

## Ceremony steps
1. Sender starts a new handoff and establishes a peer-to-peer session.
2. Receiver scans the NFC seal and verifies intactness.
3. Receiver verifies the temperature proof from the logger.
4. Both parties review the shared summary (document hashes and notes).
5. Sender and receiver co-sign and create a dual-signed bundle.
6. The bundle is queued locally for later on-chain submission.

## Contested handoff
- If seal or proof verification fails, the receiver signs a rejection.
- A contested handoff is submitted as soon as connectivity returns.
- The contract emits an alert event for immediate liability attribution.

## Outcome
- TTLA is effectively 0 seconds for attested handoffs.
- Any mismatch later in the chain can be traced to a specific handoff.
