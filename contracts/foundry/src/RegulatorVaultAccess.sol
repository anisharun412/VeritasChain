// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./IShipmentRegistry.sol";

/// @title RegulatorVaultAccess
/// @notice On-chain layer for regulatory vault access control.
///         Records access requests with SPHINCS+ document hashes, enforces a
///         configurable threshold of regulator co-approvals before decryption
///         key shares are released, and emits a full audit log.
/// @dev    Threshold decryption is coordinated off-chain via threshold-bls
///         (Rust service). This contract acts as the authoritative gate that
///         the off-chain vault checks before releasing key shares.
contract RegulatorVaultAccess is AccessControl, ReentrancyGuard {
        IShipmentRegistry public immutable shipmentRegistry;
    // ─────────────────────────────────────────────────────────────────────────
    // Roles
    // ─────────────────────────────────────────────────────────────────────────
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");
    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Minimum number of regulator approvals required to trigger
    ///         decryption (threshold-of-N multi-sig).
    uint8 public approvalThreshold;

    struct AccessRequest {
        bytes32 shipmentId;
        /// @dev SPHINCS+ post-quantum hash of the requested document bundle.
        bytes32 sphincsPqHash;
        address requester;
        uint64  requestedAt;
        uint8   approvalCount;
        bool    decryptionTriggered;
        bool    revoked;
    }

    mapping(bytes32 => AccessRequest)          public requests;
    /// @dev approvals[requestId][regulator] = true when regulator has signed.
    mapping(bytes32 => mapping(address => bool)) public approvals;

    // ─────────────────────────────────────────────────────────────────────────
    // Events — full audit trail
    // ─────────────────────────────────────────────────────────────────────────
    event AccessRequested(
        bytes32 indexed requestId,
        bytes32 indexed shipmentId,
        bytes32         sphincsPqHash,
        address indexed requester,
        uint64          timestamp
    );

    event AccessApproved(
        bytes32 indexed requestId,
        address indexed regulator,
        uint8           totalApprovals,
        uint64          timestamp
    );

    /// @notice Emitted once approval count reaches the threshold — the
    ///         off-chain vault service listens for this to release key shares.
    event DecryptionTriggered(
        bytes32 indexed requestId,
        bytes32 indexed shipmentId,
        uint64          timestamp
    );

    event AccessRevoked(
        bytes32 indexed requestId,
        address indexed revokedBy,
        uint64          timestamp
    );

    event ThresholdUpdated(uint8 oldThreshold, uint8 newThreshold);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────
    constructor(address registryAddress, uint8 _approvalThreshold) {
        require(registryAddress != address(0), "invalid registry");
        require(_approvalThreshold > 0, "threshold must be > 0");
        shipmentRegistry = IShipmentRegistry(registryAddress);
        approvalThreshold = _approvalThreshold;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core functions
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Submit a regulatory access request for an encrypted document
    ///         bundle.  The `sphincsPqHash` is the SPHINCS+ post-quantum
    ///         hash of the document(s), pinned off-chain on IPFS/Filecoin.
    /// @param  shipmentId   Unique shipment identifier.
    /// @param  sphincsPqHash SPHINCS+ hash of the requested document bundle.
    /// @return requestId    Deterministic ID derived from inputs + timestamp.
    function requestAccess(
        bytes32 shipmentId,
        bytes32 sphincsPqHash
    ) external nonReentrant returns (bytes32 requestId) {
        require(shipmentId    != bytes32(0), "invalid shipment id");
        require(sphincsPqHash != bytes32(0), "invalid hash");
        require(shipmentRegistry.exists(shipmentId), "shipment not found");

        requestId = keccak256(
            abi.encodePacked(shipmentId, sphincsPqHash, msg.sender, block.timestamp)
        );
        require(requests[requestId].requestedAt == 0, "request already exists");

        requests[requestId] = AccessRequest({
            shipmentId:           shipmentId,
            sphincsPqHash:        sphincsPqHash,
            requester:            msg.sender,
            requestedAt:          uint64(block.timestamp),
            approvalCount:        0,
            decryptionTriggered:  false,
            revoked:              false
        });

        emit AccessRequested(
            requestId,
            shipmentId,
            sphincsPqHash,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    /// @notice A regulator co-signs an access request.
    ///         When the approval count reaches `approvalThreshold` the
    ///         `DecryptionTriggered` event fires and the off-chain vault
    ///         releases the threshold-BLS key shares.
    /// @param  requestId  The request to approve.
    function approveAccess(bytes32 requestId)
        external
        nonReentrant
        onlyRole(REGULATOR_ROLE)
    {
        AccessRequest storage req = requests[requestId];
        require(req.requestedAt != 0,         "request not found");
        require(!req.revoked,                 "request revoked");
        require(!req.decryptionTriggered,     "already triggered");
        require(!approvals[requestId][msg.sender], "already approved");

        approvals[requestId][msg.sender] = true;
        req.approvalCount += 1;

        emit AccessApproved(
            requestId,
            msg.sender,
            req.approvalCount,
            uint64(block.timestamp)
        );

        if (req.approvalCount >= approvalThreshold) {
            req.decryptionTriggered = true;
            emit DecryptionTriggered(
                requestId,
                req.shipmentId,
                uint64(block.timestamp)
            );
        }
    }

    /// @notice Admin revokes a pending access request.
    ///         May be called at any time before `decryptionTriggered` is set,
    ///         regardless of how many approvals the request has already received.
    ///         Once `DecryptionTriggered` has fired the request is irrevocable.
    function revokeAccess(bytes32 requestId)
        external
        onlyRole(ADMIN_ROLE)
    {
        AccessRequest storage req = requests[requestId];
        require(req.requestedAt != 0,     "request not found");
        require(!req.revoked,             "already revoked");
        require(!req.decryptionTriggered, "already triggered");
        req.revoked = true;
        emit AccessRevoked(requestId, msg.sender, uint64(block.timestamp));
    }

    /// @notice Update the approval threshold (admin only).
    /// @dev    Threshold change only affects NEW requests. Existing requests
    ///         that have already accumulated approvals are not re-evaluated;
    ///         they will trigger on the NEXT approveAccess call if count >= newThreshold.
    function setApprovalThreshold(uint8 _newThreshold)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(_newThreshold > 0, "threshold must be > 0");
        emit ThresholdUpdated(approvalThreshold, _newThreshold);
        approvalThreshold = _newThreshold;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Returns true when a request has cleared the approval threshold.
    function isDecryptionTriggered(bytes32 requestId)
        external view returns (bool)
    {
        return requests[requestId].decryptionTriggered;
    }

    /// @notice Check whether a specific regulator has approved a request.
    function hasApproved(bytes32 requestId, address regulator)
        external view returns (bool)
    {
        return approvals[requestId][regulator];
    }
}
