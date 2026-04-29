// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IShipmentRegistry {
    function exists(bytes32 shipmentId) external view returns (bool);
    function metaHash(bytes32 shipmentId) external view returns (bytes32);
}
