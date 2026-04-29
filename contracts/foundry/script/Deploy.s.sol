// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/ShipmentRegistry.sol";
import "../src/DWHVerifier.sol";
import "../src/FreshnessScore.sol";
import "../src/InteroperabilityAnchor.sol";
import "../src/RegulatorVaultAccess.sol";
import "../src/PostHashAnchors.sol";
import "../src/FreshnessVerifier.sol";

/// @notice Foundry deployment script for the full VeritasChain on-chain layer.
///         Run with:
///           forge script script/Deploy.s.sol --rpc-url $RPC_URL \
///             --private-key $PRIVATE_KEY --broadcast --verify
///
///         Environment variables:
///           APPROVAL_THRESHOLD   Number of regulator co-sigs required (default 2)
///           PRIVATE_KEY          Deployer private key (used to derive deployer address via vm.addr)
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        uint16 approvalThreshold = uint16(vm.envOr("APPROVAL_THRESHOLD", uint256(2)));

        vm.startBroadcast(deployerPrivateKey);

        // ── Deploy contracts ──────────────────────────────────────────────────
        ShipmentRegistry       shipmentRegistry = new ShipmentRegistry();
        DWHVerifier            dwhVerifier      = new DWHVerifier(address(shipmentRegistry));
        FreshnessVerifierWrapper freshnessVerifier = new FreshnessVerifierWrapper();
        FreshnessScore         freshnessScore   = new FreshnessScore(address(shipmentRegistry), address(freshnessVerifier));
        InteroperabilityAnchor ioAnchor         = new InteroperabilityAnchor(address(dwhVerifier));
        RegulatorVaultAccess   vaultAccess      = new RegulatorVaultAccess(address(shipmentRegistry), approvalThreshold);
        PostHashAnchors        postHashAnchors  = new PostHashAnchors(address(shipmentRegistry));

        // ── Role wiring ───────────────────────────────────────────────────────
        // DWH → can write to InteroperabilityAnchor (after each accepted handoff)
        ioAnchor.grantRole(
            keccak256("ANCHOR_WRITER_ROLE"),
            address(dwhVerifier)
        );

        // DWH → can anchor doc hashes alongside handoffs
        postHashAnchors.grantRole(
            keccak256("ANCHOR_ROLE"),
            address(dwhVerifier)
        );

        // NOTE: In production, rotate deployer roles to dedicated service keys:
        //   - SUBMITTER_ROLE  → edge-service relayer address
        //   - PROVER_ROLE     → ZK prover service address
        //   - REGULATOR_ROLE  → approved regulator addresses
        //   - BRIDGE_RELAYER_ROLE → LayerZero / CCIP relayer adapter

        // Log deployment addresses
        console2.log("--- VeritasChain Deployment ---");
        console2.log("Deployer:               ", deployer);
        console2.log("ShipmentRegistry:       ", address(shipmentRegistry));
        console2.log("DWHVerifier:            ", address(dwhVerifier));
        console2.log("FreshnessScore:         ", address(freshnessScore));
        console2.log("InteroperabilityAnchor: ", address(ioAnchor));
        console2.log("RegulatorVaultAccess:   ", address(vaultAccess));
        console2.log("PostHashAnchors:        ", address(postHashAnchors));
        console2.log("Approval threshold:     ", approvalThreshold);
        console2.log("Freshness verifier:     ", address(freshnessVerifier));

        vm.stopBroadcast();
    }
}
