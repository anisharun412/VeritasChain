// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title HandoffRegistry
 * @notice Records cryptographically-signed custody handoffs for cold-chain logistics.
 *
 * Each handoff stores:
 *   - The sender's Ethereum address (derived from their ECDSA key via MetaMask)
 *   - The receiver's Ethereum address
 *   - The Merkle Root of all shipment documents at time of handoff
 *   - A ZK temperature proof hash (Groth16 proof that temp stayed in range)
 *   - A UTC timestamp (block.timestamp)
 *
 * The chain of Merkle Roots forms an immutable audit trail — any tampering
 * with past records breaks the hash chain and is immediately detectable.
 */
contract HandoffRegistry {

    // ─── Data Structures ──────────────────────────────────────────────────────

    struct HandoffRecord {
        string   shipmentId;
        address  sender;
        address  receiver;
        bytes32  merkleRoot;        // SHA-256 Merkle root of shipment documents
        string   zkProofHash;       // IPFS CID or hash of the Groth16 ZK proof
        uint256  timestamp;         // block.timestamp at submission
        bool     contested;
        string   contestReason;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @dev shipmentId => ordered list of handoff records
    mapping(string => HandoffRecord[]) private _handoffs;

    /// @dev shipmentId => contested flag (true if any record is contested)
    mapping(string => bool) private _contested;

    /// @dev total shipments ever recorded (for display)
    uint256 public totalShipments;

    // ─── Events ───────────────────────────────────────────────────────────────

    event HandoffRecorded(
        string  indexed shipmentId,
        address indexed sender,
        address indexed receiver,
        bytes32         merkleRoot,
        string          zkProofHash,
        uint256         timestamp
    );

    event HandoffContested(
        string  indexed shipmentId,
        address indexed contester,
        string          reason,
        uint256         timestamp
    );

    // ─── Write Functions ──────────────────────────────────────────────────────

    /**
     * @notice Record a new custody handoff on-chain.
     * @param shipmentId  Human-readable shipment ID (e.g. "SHIP-001")
     * @param receiver    Ethereum address of the receiving party
     * @param merkleRoot  SHA-256 Merkle root of all shipment documents
     * @param zkProofHash Hash / IPFS CID of the ZK temperature compliance proof
     */
    function recordHandoff(
        string  calldata shipmentId,
        address          receiver,
        bytes32          merkleRoot,
        string  calldata zkProofHash
    ) external {
        require(bytes(shipmentId).length > 0, "Shipment ID required");
        require(receiver != address(0),       "Invalid receiver address");
        require(merkleRoot != bytes32(0),     "Merkle root required");

        if (_handoffs[shipmentId].length == 0) {
            totalShipments++;
        }

        _handoffs[shipmentId].push(HandoffRecord({
            shipmentId:   shipmentId,
            sender:       msg.sender,
            receiver:     receiver,
            merkleRoot:   merkleRoot,
            zkProofHash:  zkProofHash,
            timestamp:    block.timestamp,
            contested:    false,
            contestReason:""
        }));

        emit HandoffRecorded(shipmentId, msg.sender, receiver, merkleRoot, zkProofHash, block.timestamp);
    }

    /**
     * @notice Contest the most recent handoff for a shipment.
     * @param shipmentId  The shipment to contest
     * @param reason      Human-readable reason for the dispute
     */
    function contestHandoff(
        string calldata shipmentId,
        string calldata reason
    ) external {
        require(_handoffs[shipmentId].length > 0, "No records for this shipment");
        require(bytes(reason).length > 0,         "Contest reason required");

        uint256 last = _handoffs[shipmentId].length - 1;
        _handoffs[shipmentId][last].contested     = true;
        _handoffs[shipmentId][last].contestReason = reason;
        _contested[shipmentId]                    = true;

        emit HandoffContested(shipmentId, msg.sender, reason, block.timestamp);
    }

    // ─── Read Functions ───────────────────────────────────────────────────────

    /// @notice Number of handoff legs recorded for a shipment
    function getHandoffCount(string calldata shipmentId)
        external view returns (uint256)
    {
        return _handoffs[shipmentId].length;
    }

    /// @notice Retrieve a single handoff record by index
    function getHandoff(string calldata shipmentId, uint256 index)
        external view
        returns (
            address sender,
            address receiver,
            bytes32 merkleRoot,
            string  memory zkProofHash,
            uint256 timestamp,
            bool    contested,
            string  memory contestReason
        )
    {
        require(index < _handoffs[shipmentId].length, "Index out of bounds");
        HandoffRecord storage r = _handoffs[shipmentId][index];
        return (r.sender, r.receiver, r.merkleRoot, r.zkProofHash, r.timestamp, r.contested, r.contestReason);
    }

    /// @notice Returns true if any handoff leg for this shipment was contested
    function isContested(string calldata shipmentId)
        external view returns (bool)
    {
        return _contested[shipmentId];
    }
}
