// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// NOTE: Scaffold only. Add access control and DID registry integration.
contract ShipmentRegistry {
    event ShipmentRegistered(bytes32 indexed shipmentId, bytes32 metadataHash, address registrar);

    mapping(bytes32 => bytes32) public metadataHash;

    function registerShipment(bytes32 shipmentId, bytes32 metadataHash_) external {
        require(metadataHash[shipmentId] == 0, "already registered");
        metadataHash[shipmentId] = metadataHash_;
        emit ShipmentRegistered(shipmentId, metadataHash_, msg.sender);
    }
}
