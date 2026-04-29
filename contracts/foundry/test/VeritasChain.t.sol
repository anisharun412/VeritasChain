// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/DWHVerifier.sol";
import "../src/FreshnessScore.sol";
import "../src/InteroperabilityAnchor.sol";
import "../src/RegulatorVaultAccess.sol";
import "../src/PostHashAnchors.sol";
import "../src/ShipmentRegistry.sol";

/// @notice Full Foundry test suite for the VeritasChain on-chain layer.
///         Covers: DWHVerifier, FreshnessScore, InteroperabilityAnchor,
///                 RegulatorVaultAccess, PostHashAnchors, ShipmentRegistry.
contract VeritasChainTest is Test {
    // ─────────────────────────────────────────────────────────────────────────
    // Contracts under test
    // ─────────────────────────────────────────────────────────────────────────
    DWHVerifier            public dwh;
    FreshnessScore         public freshness;
    InteroperabilityAnchor public anchor;
    RegulatorVaultAccess   public vault;
    PostHashAnchors        public postHash;
    ShipmentRegistry       public registry;

    // ─────────────────────────────────────────────────────────────────────────
    // Test actors
    // ─────────────────────────────────────────────────────────────────────────
    uint256 internal senderKey   = 0xA11CE;
    uint256 internal receiverKey = 0xB0B;
    address internal sender;
    address internal receiver;
    address internal regulator1  = address(0x10);
    address internal regulator2  = address(0x11);
    address internal relayer     = address(0x20);

    // ─────────────────────────────────────────────────────────────────────────
    // Common test data
    // ─────────────────────────────────────────────────────────────────────────
    bytes32 internal shipmentId  = keccak256("shipment-001");
    bytes32 internal merkleRoot  = keccak256("merkle-root-001");
    bytes32 internal sphincsHash = keccak256("sphincs-hash-001");
    bytes32 internal nfcFingerp  = keccak256("nfc-pubkey-001");
    bytes   internal registrarDid = bytes("did:key:z6MkrBb9Zy");

    // ─────────────────────────────────────────────────────────────────────────
    // Setup
    // ─────────────────────────────────────────────────────────────────────────
    function setUp() public {
        sender   = vm.addr(senderKey);
        receiver = vm.addr(receiverKey);

        dwh       = new DWHVerifier();
        freshness = new FreshnessScore();
        anchor    = new InteroperabilityAnchor();
        vault     = new RegulatorVaultAccess(2); // threshold = 2
        postHash  = new PostHashAnchors();
        registry  = new ShipmentRegistry();

        // Grant roles
        bytes32 SUBMITTER    = keccak256("SUBMITTER_ROLE");
        bytes32 PROVER       = keccak256("PROVER_ROLE");
        bytes32 REGULATOR    = keccak256("REGULATOR_ROLE");
        bytes32 BRIDGE       = keccak256("BRIDGE_RELAYER_ROLE");
        bytes32 ANCHOR_W     = keccak256("ANCHOR_WRITER_ROLE");

        dwh.grantRole(SUBMITTER, address(this));
        freshness.grantRole(PROVER, address(this));
        vault.grantRole(REGULATOR, regulator1);
        vault.grantRole(REGULATOR, regulator2);
        anchor.grantRole(BRIDGE, relayer);
        anchor.grantRole(ANCHOR_W, address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── ShipmentRegistry ─────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    function test_RegisterShipment() public {
        bytes32 sid = registry.registerShipment(sphincsHash, registrarDid, nfcFingerp);
        assertTrue(registry.exists(sid));
        assertEq(registry.metaHash(sid), sphincsHash);
    }

    function test_RegisterShipment_EmptyHash_Reverts() public {
        vm.expectRevert("empty meta hash");
        registry.registerShipment(bytes32(0), registrarDid, nfcFingerp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── DWHVerifier ──────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    function _signRoot(uint256 key, bytes32 root)
        internal
        pure
        returns (bytes memory sig)
    {
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", root)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, ethHash);
        sig = abi.encodePacked(r, s, v);
    }

    function test_RecordHandoff_ValidDualSig() public {
        bytes memory sSig = _signRoot(senderKey,   merkleRoot);
        bytes memory rSig = _signRoot(receiverKey, merkleRoot);

        bytes32 handoffHash = dwh.recordHandoff(
            shipmentId, merkleRoot, sender, receiver, sSig, rSig
        );

        assertFalse(dwh.isContested(handoffHash));
        assertEq(dwh.latestMerkleRoot(shipmentId), merkleRoot);
    }

    function test_RecordHandoff_WrongSig_ContestsHandoff() public {
        // receiver signs with sender key — mismatch
        bytes memory sSig = _signRoot(senderKey,   merkleRoot);
        bytes memory rSig = _signRoot(senderKey,   merkleRoot); // wrong!

        bytes32 handoffHash = dwh.recordHandoff(
            shipmentId, merkleRoot, sender, receiver, sSig, rSig
        );

        assertTrue(dwh.isContested(handoffHash));
    }

    function test_ContestHandoff_ByReceiver() public {
        bytes memory sSig = _signRoot(senderKey,   merkleRoot);
        bytes memory rSig = _signRoot(receiverKey, merkleRoot);

        bytes32 handoffHash = dwh.recordHandoff(
            shipmentId, merkleRoot, sender, receiver, sSig, rSig
        );

        vm.prank(receiver);
        dwh.contestHandoff(shipmentId, handoffHash, "seal breach detected");
        assertTrue(dwh.isContested(handoffHash));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── FreshnessScore ───────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    function test_Initialize_Score100() public {
        freshness.initialize(shipmentId);
        assertEq(freshness.getScore(shipmentId), 100);
    }

    function test_UpdateScoreWithProof_AppliesPenalty() public {
        freshness.initialize(shipmentId);
        bytes32 proofHash = keccak256("groth16-proof-001");

        freshness.updateScoreWithProof(shipmentId, 15, proofHash);
        assertEq(freshness.getScore(shipmentId), 85);
    }

    function test_UpdateScoreWithProof_ClampToZero() public {
        freshness.initialize(shipmentId);
        bytes32 proofHash = keccak256("groth16-proof-002");

        freshness.updateScoreWithProof(shipmentId, 100, proofHash);
        assertEq(freshness.getScore(shipmentId), 0);
    }

    function test_FreshnessCritical_EventEmitted() public {
        freshness.initialize(shipmentId);
        bytes32 proofHash = keccak256("groth16-proof-003");

        // Penalty 75: score goes 100 → 25, crossing the CRITICAL_THRESHOLD of 30.
        vm.expectEmit(true, false, false, false);
        emit FreshnessScore.FreshnessCritical(shipmentId, 25, 0);

        freshness.updateScoreWithProof(shipmentId, 75, proofHash);
        assertTrue(freshness.isCritical(shipmentId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── RegulatorVaultAccess ─────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    function test_RequestAccess_EmitsEvent() public {
        vm.expectEmit(false, true, false, false);
        emit RegulatorVaultAccess.AccessRequested(
            bytes32(0), shipmentId, sphincsHash, address(this), 0
        );
        vault.requestAccess(shipmentId, sphincsHash);
    }

    function test_ApproveAccess_TriggersAtThreshold() public {
        bytes32 requestId = vault.requestAccess(shipmentId, sphincsHash);

        vm.prank(regulator1);
        vault.approveAccess(requestId);
        assertFalse(vault.isDecryptionTriggered(requestId));

        vm.prank(regulator2);
        vault.approveAccess(requestId);
        assertTrue(vault.isDecryptionTriggered(requestId));
    }

    function test_DoubleApprove_Reverts() public {
        bytes32 requestId = vault.requestAccess(shipmentId, sphincsHash);

        vm.prank(regulator1);
        vault.approveAccess(requestId);

        vm.expectRevert("already approved");
        vm.prank(regulator1);
        vault.approveAccess(requestId);
    }

    function test_ApproveAfterTrigger_Reverts() public {
        bytes32 requestId = vault.requestAccess(shipmentId, sphincsHash);

        vm.prank(regulator1); vault.approveAccess(requestId);
        vm.prank(regulator2); vault.approveAccess(requestId);

        address reg3 = address(0x12);
        vault.grantRole(keccak256("REGULATOR_ROLE"), reg3);
        vm.expectRevert("already triggered");
        vm.prank(reg3); vault.approveAccess(requestId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── InteroperabilityAnchor ───────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    function test_RecordAnchor_ExportsRoot() public {
        bytes32 anchorId = anchor.recordAnchor(
            shipmentId,
            merkleRoot,
            InteroperabilityAnchor.BridgeProtocol.LAYERZERO,
            30101 // Arbitrum One LayerZero EID
        );

        (bytes32 exportedRoot, ) = anchor.exportMerkleRoot(shipmentId);
        assertEq(exportedRoot, merkleRoot);
        assertFalse(anchor.isAnchorVerified(anchorId));
    }

    function test_VerifyExternalAnchor_MatchingRoot() public {
        bytes32 anchorId = anchor.recordAnchor(
            shipmentId,
            merkleRoot,
            InteroperabilityAnchor.BridgeProtocol.CCIP,
            0
        );

        vm.prank(relayer);
        bool ok = anchor.verifyExternalAnchor(anchorId, merkleRoot);
        assertTrue(ok);
        assertTrue(anchor.isAnchorVerified(anchorId));
    }

    function test_VerifyExternalAnchor_WrongRoot_ReturnsFalse() public {
        bytes32 anchorId = anchor.recordAnchor(
            shipmentId,
            merkleRoot,
            InteroperabilityAnchor.BridgeProtocol.LAYERZERO,
            0
        );

        vm.prank(relayer);
        bool ok = anchor.verifyExternalAnchor(anchorId, keccak256("wrong-root"));
        assertFalse(ok);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── PostHashAnchors ──────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    function test_AnchorHash_AndVerify() public {
        bytes memory cid = bytes("bafkreig...");
        bytes32 anchorId = postHash.anchorHash(
            shipmentId,
            sphincsHash,
            cid,
            PostHashAnchors.DocumentType.BIRTH_CERTIFICATE,
            0
        );

        (bool verified, bytes32 foundId) = postHash.verifyHash(shipmentId, sphincsHash, 0);
        assertTrue(verified);
        assertEq(foundId, anchorId);
    }

    function test_RevokeAnchor_VerifyReturnsFalse() public {
        bytes memory cid = bytes("bafkreig...");
        bytes32 anchorId = postHash.anchorHash(
            shipmentId, sphincsHash, cid,
            PostHashAnchors.DocumentType.HANDOFF_BUNDLE, 1
        );

        postHash.revokeAnchor(anchorId, "document falsified");
        assertTrue(postHash.isRevoked(anchorId));

        (bool verified, ) = postHash.verifyHash(shipmentId, sphincsHash, 0);
        assertFalse(verified);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── Integration: full happy-path flow ────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    function test_FullHappyPath() public {
        // 1. Register shipment
        bytes32 sid = registry.registerShipment(sphincsHash, registrarDid, nfcFingerp);
        assertTrue(registry.exists(sid));

        // 2. Initialise freshness
        freshness.initialize(sid);
        assertEq(freshness.getScore(sid), 100);

        // 3. Anchor birth-certificate document hash
        postHash.anchorHash(
            sid, sphincsHash, bytes("bafk..."),
            PostHashAnchors.DocumentType.BIRTH_CERTIFICATE, 0
        );
        (bool v, ) = postHash.verifyHash(sid, sphincsHash, 0);
        assertTrue(v);

        // 4. DWH handoff
        bytes32 root  = keccak256(abi.encodePacked(sid, "leg-1-root"));
        bytes memory sSig = _signRoot(senderKey,   root);
        bytes memory rSig = _signRoot(receiverKey, root);

        bytes32 handoffHash = dwh.recordHandoff(sid, root, sender, receiver, sSig, rSig);
        assertFalse(dwh.isContested(handoffHash));

        // 5. Anchor Merkle root cross-chain
        anchor.recordAnchor(
            sid, root,
            InteroperabilityAnchor.BridgeProtocol.LAYERZERO, 30101
        );
        (bytes32 exported, ) = anchor.exportMerkleRoot(sid);
        assertEq(exported, root);

        // 6. Update freshness with ZK proof
        freshness.updateScoreWithProof(sid, 6, keccak256("proof-leg-1"));
        assertEq(freshness.getScore(sid), 94); // 100 - 6

        // 7. Regulator requests and approves vault access
        bytes32 requestId = vault.requestAccess(sid, sphincsHash);
        vm.prank(regulator1); vault.approveAccess(requestId);
        vm.prank(regulator2); vault.approveAccess(requestId);
        assertTrue(vault.isDecryptionTriggered(requestId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── Edge-case tests (audit-fix verification) ─────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    // -- FreshnessScore: uninitialized view guards --

    function test_GetScore_UninitializedReverts() public {
        bytes32 fakeId = keccak256("non-existent");
        vm.expectRevert("not initialized");
        freshness.getScore(fakeId);
    }

    function test_IsCritical_UninitializedReturnsFalse() public view {
        bytes32 fakeId = keccak256("non-existent");
        // Should NOT return true for an uninitialized shipment
        assertFalse(freshness.isCritical(fakeId));
    }

    function test_FreshnessCritical_NotEmittedWhenAlreadyCritical() public {
        freshness.initialize(shipmentId);
        bytes32 proof1 = keccak256("proof-1");
        bytes32 proof2 = keccak256("proof-2");

        // First penalty: 100 → 20 (crosses threshold, event emitted)
        freshness.updateScoreWithProof(shipmentId, 80, proof1);
        assertTrue(freshness.isCritical(shipmentId));

        // Second penalty: 20 → 10 (already below threshold, no critical event)
        // We record logs and verify FreshnessCritical is NOT emitted again
        vm.recordLogs();
        freshness.updateScoreWithProof(shipmentId, 10, proof2);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 criticalSig = keccak256("FreshnessCritical(bytes32,uint8,uint64)");
        bool foundCritical = false;
        for (uint i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == criticalSig) foundCritical = true;
        }
        assertFalse(foundCritical, "FreshnessCritical should not fire when already critical");
    }

    function test_AdminSetScore_EmitsCriticalOnThresholdCross() public {
        freshness.initialize(shipmentId);
        vm.recordLogs();
        freshness.adminSetScore(shipmentId, 20); // 100 → 20, crosses 30
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 criticalSig = keccak256("FreshnessCritical(bytes32,uint8,uint64)");
        bool foundCritical = false;
        for (uint i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == criticalSig) foundCritical = true;
        }
        assertTrue(foundCritical, "adminSetScore should emit FreshnessCritical");
    }

    // -- DWHVerifier: shipmentId validation in contestHandoff --

    function test_ContestHandoff_WrongShipmentId_Reverts() public {
        bytes memory sSig = _signRoot(senderKey, merkleRoot);
        bytes memory rSig = _signRoot(receiverKey, merkleRoot);

        bytes32 handoffHash = dwh.recordHandoff(
            shipmentId, merkleRoot, sender, receiver, sSig, rSig
        );

        bytes32 wrongShipmentId = keccak256("wrong-shipment");
        vm.prank(receiver);
        vm.expectRevert("shipmentId mismatch");
        dwh.contestHandoff(wrongShipmentId, handoffHash, "test");
    }

    function test_RecordHandoff_EmptyShipmentId_Reverts() public {
        bytes memory sSig = _signRoot(senderKey, merkleRoot);
        bytes memory rSig = _signRoot(receiverKey, merkleRoot);
        vm.expectRevert("empty shipment id");
        dwh.recordHandoff(bytes32(0), merkleRoot, sender, receiver, sSig, rSig);
    }

    // -- ShipmentRegistry: status transition guards --

    function test_UpdateStatus_ForwardTransition() public {
        bytes32 sid = registry.registerShipment(sphincsHash, registrarDid, nfcFingerp);
        registry.updateStatus(sid, ShipmentRegistry.ShipmentStatus.IN_TRANSIT);
        registry.updateStatus(sid, ShipmentRegistry.ShipmentStatus.DELIVERED);
    }

    function test_UpdateStatus_BackwardTransition_Reverts() public {
        bytes32 sid = registry.registerShipment(sphincsHash, registrarDid, nfcFingerp);
        registry.updateStatus(sid, ShipmentRegistry.ShipmentStatus.IN_TRANSIT);
        vm.expectRevert("invalid status transition");
        registry.updateStatus(sid, ShipmentRegistry.ShipmentStatus.REGISTERED);
    }

    function test_UpdateStatus_SameStatus_Reverts() public {
        bytes32 sid = registry.registerShipment(sphincsHash, registrarDid, nfcFingerp);
        registry.updateStatus(sid, ShipmentRegistry.ShipmentStatus.CONTESTED);
        vm.expectRevert("status unchanged");
        registry.updateStatus(sid, ShipmentRegistry.ShipmentStatus.CONTESTED);
    }

    function test_UpdateStatus_ContestedAlwaysAllowed() public {
        bytes32 sid = registry.registerShipment(sphincsHash, registrarDid, nfcFingerp);
        registry.updateStatus(sid, ShipmentRegistry.ShipmentStatus.IN_TRANSIT);
        registry.updateStatus(sid, ShipmentRegistry.ShipmentStatus.DELIVERED);
        // CONTESTED is a terminal override — allowed even from DELIVERED
        registry.updateStatus(sid, ShipmentRegistry.ShipmentStatus.CONTESTED);
    }

    function test_RegisterShipment_DIDTooLong_Reverts() public {
        bytes memory longDid = new bytes(257);
        vm.expectRevert("DID too long");
        registry.registerShipment(sphincsHash, longDid, nfcFingerp);
    }

    // -- RegulatorVaultAccess: edge cases --

    function test_RevokeAccess_AlreadyRevoked_Reverts() public {
        bytes32 requestId = vault.requestAccess(shipmentId, sphincsHash);
        vault.revokeAccess(requestId);
        vm.expectRevert("already revoked");
        vault.revokeAccess(requestId);
    }

    function test_RequestAccess_ZeroShipmentId_Reverts() public {
        vm.expectRevert("invalid shipment id");
        vault.requestAccess(bytes32(0), sphincsHash);
    }

    // -- InteroperabilityAnchor: edge cases --

    function test_RecordAnchor_ZeroShipmentId_Reverts() public {
        vm.expectRevert("empty shipment id");
        anchor.recordAnchor(
            bytes32(0), merkleRoot,
            InteroperabilityAnchor.BridgeProtocol.INTERNAL, 0
        );
    }

    function test_VerifyExternalAnchor_ZeroClaimedRoot_Reverts() public {
        bytes32 anchorId = anchor.recordAnchor(
            shipmentId, merkleRoot,
            InteroperabilityAnchor.BridgeProtocol.LAYERZERO, 0
        );
        vm.prank(relayer);
        vm.expectRevert("empty claimed root");
        anchor.verifyExternalAnchor(anchorId, bytes32(0));
    }

    // -- PostHashAnchors: edge cases --

    function test_AnchorHash_CIDTooLong_Reverts() public {
        bytes memory longCid = new bytes(129);
        vm.expectRevert("CID too long");
        postHash.anchorHash(
            shipmentId, sphincsHash, longCid,
            PostHashAnchors.DocumentType.OTHER, 0
        );
    }

    function test_VerifyHash_WithMaxIterations() public {
        bytes memory cid = bytes("bafkreig...");
        postHash.anchorHash(
            shipmentId, sphincsHash, cid,
            PostHashAnchors.DocumentType.BIRTH_CERTIFICATE, 0
        );
        // maxIterations=1 should find it (it's the first entry)
        (bool verified, ) = postHash.verifyHash(shipmentId, sphincsHash, 1);
        assertTrue(verified);
    }
}
